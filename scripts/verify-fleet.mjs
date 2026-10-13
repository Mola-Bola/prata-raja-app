// Durable post-ship jobs live in the shared Git directory, outside disposable worktrees.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, symlinkSync, realpathSync, copyFileSync, openSync, closeSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
const git = (root, args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (r.status !== 0 || r.error) throw new Error(r.error?.message || r.stderr);
  return r.stdout.trim();
};
const directory = (root) => join(git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']), 'fleet-verifications');
const save = (path, data) => { writeFileSync(`${path}.tmp`, JSON.stringify(data, null, 2) + '\n'); renameSync(`${path}.tmp`, path); };
const ledger = async (root) => (await import('./fleet.mjs')).openLedger(root, { render: false });
export async function queueVerification(root, { base, head, label }) {
  for (const sha of [base, head]) if (!/^[a-f0-9]{40}$/.test(sha) || git(root, ['rev-parse', `${sha}^{commit}`]) !== sha) throw new Error('Verifier requires pinned commit SHAs');
  if (!/^\d+\.\d+\.\d+$/.test(label)) throw new Error('Invalid release label');
  const id = `${label}-${head.slice(0, 12)}-${randomUUID()}`;
  const dir = join(directory(root), id);
  mkdirSync(dir, { recursive: true });
  const db = await ledger(root);
  let row;
  try { row = db.add({ source: 'verifier', intent: `Verify web release ${label}`, brief: `Pinned ${base}..${head}; full web, 300-seed balance and read-only review`, owned: [`verification/${label}`] });
    if (!db.claim(`verifier-${id}`, row.id)) throw new Error('Unable to reserve verification row');
  }
  finally { db.close(); }
  const job = { id, ledgerId: row.id, root: resolve(root), base, head, label, status: 'awaiting-ship', attempts: 0 };
  save(join(dir, 'job.json'), job);
  return job;
}
export async function startVerification(root, job) {
  const dir = join(directory(root), job.id);
  const db = await ledger(root);
  try { db.status(job.ledgerId, 'building', { release: job.label, note: 'Published; full verification queued, not completed' }); } finally { db.close(); }
  job.status = 'queued';
  job.shippedAt = new Date().toISOString();
  save(join(dir, 'job.json'), job); // Crash/reboot recovery uses the explicit run command.
  const fd = openSync(join(dir, 'launcher.log'), 'a');
  try {
    const child = spawn(process.execPath, [join(root, 'scripts/verify-fleet.mjs'), 'run', job.id], { cwd: root, detached: true, stdio: ['ignore', fd, fd] });
    await new Promise((res, rej) => { child.once('spawn', res); child.once('error', rej); });
    child.unref();
  } finally { closeSync(fd); }
}
export async function runVerification(root, id) {
  const { checks, review } = await import('./pipeline.mjs');
  if (!/^[\w.-]+$/.test(id)) throw new Error('Invalid job id');
  const dir = join(directory(root), id), file = join(dir, 'job.json');
  const job = JSON.parse(readFileSync(file, 'utf8'));
  if (!job.shippedAt) throw new Error('Ship not confirmed; do not verify an unshipped job');
  const lock = join(dir, 'running');
  mkdirSync(lock); // Never steal another verifier's lock, even on retry.
  writeFileSync(join(lock, 'pid'), String(process.pid));
  const cwd = join(dir, `worktree-${++job.attempts}`);
  const attemptDir = join(dir, `attempt-${job.attempts}`);
  mkdirSync(attemptDir);
  job.status = 'running'; job.startedAt = new Date().toISOString(); save(file, job);
  const result = { head: job.head, base: job.base, web: false, balance: false, findings: [], errors: [] };
  const pinned = () => {
    if (git(cwd, ['rev-parse', 'HEAD']) !== job.head || git(cwd, ['status', '--porcelain'])) throw new Error('Verification worktree changed');
  };
  try {
    git(root, ['worktree', 'add', '--detach', cwd, job.head]);
    symlinkSync(realpathSync(join(root, 'node_modules')), join(cwd, 'node_modules'));
    if (existsSync(join(root, '.env'))) copyFileSync(join(root, '.env'), join(cwd, '.env'));
    const port = await new Promise((res, rej) => {
      const server = createServer();
      server.once('error', rej).listen(0, '0.0.0.0', () => { const p = server.address().port; server.close(() => res(p)); });
    });
    job.port = port; save(file, job);
    result.web = await checks(cwd, attemptDir, port); pinned();
    const fd = openSync(join(attemptDir, 'balance.log'), 'w');
    try {
      const r = spawnSync('npx', ['vitest', 'run', '--configLoader', 'runner', 'src/core/__tests__/balance.test.ts'], { cwd, env: { ...process.env, BALANCE_SEEDS: '300' }, stdio: ['ignore', fd, fd] });
      result.balance = !r.error && r.status === 0;
    } finally { closeSync(fd); }
    pinned();
    result.findings = await review(cwd, attemptDir, job.base, job.head, 'review'); pinned();
  } catch (error) { result.errors.push(error.message); }
  try {
    const failed = !result.web || !result.balance || result.findings.length > 0 || result.errors.length > 0;
    job.status = failed ? 'failed' : 'verified'; job.finishedAt = new Date().toISOString();
    save(join(attemptDir, 'result.json'), result);
    save(join(dir, 'result.json'), result); save(file, job);
    const db = await ledger(root);
    try {
      if (failed && !job.regressionId) {
        const row = db.add({ source: 'verifier', intent: `Investigate release ${job.label} verification failure`, brief: `Evidence: ${dir}/result.json; pinned ${job.head}. Fix forward; do not assume infrastructure failure is a game regression.`, owned: [`regression/${job.label}`], priority: 1000 });
        job.regressionId = row.id; save(file, job);
      }
      db.status(job.ledgerId, job.status, { release: job.label, result: join(dir, 'result.json'), note: failed ? `Investigation ${job.regressionId}; see durable evidence` : 'Web + 300-seed balance + read-only review passed' });
    } finally { db.close(); }
    if (!failed) {
      git(root, ['worktree', 'remove', cwd]);
      rmSync(join(attemptDir, 'logs'), { recursive: true, force: true });
    }
    return job;
  } finally { rmSync(lock, { recursive: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    if (process.argv[2] !== 'run' || !process.argv[3]) throw new Error('Usage: node scripts/verify-fleet.mjs run <job-id>');
    const result = await runVerification(resolve(import.meta.dirname, '..'), process.argv[3]);
    console.log(JSON.stringify(result));
    if (result.status !== 'verified') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
