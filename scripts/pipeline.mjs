// The shell entry points share only command execution, slice metadata and check ownership.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, symlinkSync, realpathSync, openSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const store = '/private/tmp/claude-501/slices';
const args = process.argv.slice(3);
const dry = args.includes('--dry-run');
const minor = args.includes('--minor');
const positional = args.filter((a) => a !== '--dry-run' && a !== '--minor');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (p) => existsSync(p) ? readFileSync(p, 'utf8') : '';
const json = (p, value) => writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
function run(command, argv, cwd = root, options = {}) {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} ${argv.join(' ')} failed: ${result.error?.message || result.stderr?.trim() || `exit ${result.status}`}`);
  return result.stdout?.trim() ?? '';
}
const git = (argv, cwd = root) => run('git', argv, cwd);
const clean = (cwd) => { if (git(['status', '--porcelain'], cwd)) throw new Error(`Dirty worktree: ${cwd}`); };
const onBranch = (cwd, branch) => { if (git(['branch', '--show-current'], cwd) !== branch) throw new Error(`Expected ${branch} in ${cwd}`); };
const step = (text) => console.log(text);
async function freePort(port) {
  await new Promise((res, rej) => {
    const server = createServer();
    server.once('error', rej).listen(port, '0.0.0.0', () => server.close(res));
  });
}

async function codex(cwd, dir, phase, prompt, review = false) {
  const output = join(dir, `${phase}.txt`);
  const schema = join(dir, 'review-schema.json');
  const roots = [git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd), git(['rev-parse', '--absolute-git-dir'], cwd)];
  const argv = ['exec', '-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort="medium"', '-c', 'approval_policy="never"',
    '-s', review ? 'read-only' : 'workspace-write', '--ephemeral', '-C', cwd, '-o', output];
  if (review) argv.push('--output-schema', schema);
  else argv.push('-c', `sandbox_workspace_write.writable_roots=${JSON.stringify(roots)}`,
    '-c', 'sandbox_workspace_write.network_access=true');
  // Checks (including localhost Playwright) and fallback commits run outside the agent sandbox.
  for (let attempt = 0; attempt <= 4; attempt++) {
    rmSync(output, { force: true });
    const log = join(dir, `${phase}-${attempt}.log`);
    const fd = openSync(log, 'w');
    let result;
    try { result = spawnSync('codex', [...argv, '-'], { cwd, input: prompt, stdio: ['pipe', fd, fd] }); }
    finally { closeSync(fd); }
    const capacity = /model is at capacity/i.test(read(log) + read(output));
    if (!capacity && !result.error && result.status === 0 && read(output).trim()) return read(output);
    if (!capacity || attempt === 4) throw new Error(`Codex ${phase} failed; see ${log}`);
    step(`Codex at capacity; retry ${attempt + 1}/4 in five minutes.`);
    await sleep(300000);
  }
}
function commit(cwd, message) {
  git(['add', '-A'], cwd);
  if (git(['status', '--porcelain'], cwd)) git(['commit', '-m', message], cwd);
  clean(cwd);
}
async function checks(cwd, dir, port) {
  await freePort(port); // check.sh otherwise silently reuses an unrelated server.
  const fd = openSync(join(dir, 'check.log'), 'w');
  let result;
  try {
    result = spawnSync('bash', ['scripts/check.sh', '--web'], { cwd,
      env: { ...process.env, PORT: String(port), LOGS: join(dir, 'logs'), SKIP_DB: '1', CHECK_OWN_SERVER: '1' },
      stdio: ['ignore', fd, fd] });
  } finally { closeSync(fd); }
  step(read(join(dir, 'check.log')));
  if (result.error) throw result.error;
  return result.status === 0;
}
async function review(cwd, dir, base, phase) {
  const diff = git(['diff', `${base}..HEAD`, '--', 'src', 'scripts', 'e2e', ':!**/__tests__/**', ':!src/content/**'], cwd);
  const result = JSON.parse(await codex(cwd, dir, phase,
    `Review this diff against ${base}. Read connected code as needed. Real bugs only, P0/P1/P2; no style, speculative issues or praise. Do not edit files. Return findings with priority and a short location/description.\n${diff}`, true));
  if (!Array.isArray(result.findings) || result.findings.some((f) => !['P0', 'P1', 'P2'].includes(f.priority) || typeof f.detail !== 'string')) throw new Error('Invalid review response');
  return result.findings;
}
const blocking = (findings) => findings.some((f) => f.priority === 'P0' || f.priority === 'P1');
async function slice() {
  const [name, brief] = positional;
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name) || !brief || positional.length !== 2 || minor) throw new Error('Usage: slice.sh <name> <brief.md> [--dry-run]');
  const briefText = readFileSync(resolve(brief), 'utf8');
  const dir = join(store, name);
  const cwd = join(dirname(root), `prata-raja-${name}`);
  const branch = `sol/${name}`;
  const port = Number(process.env.PORT ?? 9500 + [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 1000, 0));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
  for (const s of [`Create ${cwd} (${branch}) from main; link node_modules; copy local .env`,
    `Codex build (git writable roots); capacity retry every 5 min, up to 4 retries; commit fallback`,
    `PORT=${port} SKIP_DB=1 check.sh --web → ${dir}/logs (owned server)`,
    'Read-only structured review of src/scripts/e2e diff; one fix + commit + recheck + re-review if needed',
    `Write ≤15-line ${dir}/REPORT.md and commit-bound result.json; exit 0 only when green`]) step(s);
  if (dry) return;
  if (existsSync(dir) || existsSync(cwd)) throw new Error('Slice name/worktree already exists; use a new name');
  mkdirSync(store, { recursive: true });
  mkdirSync(dir); // Claim the name atomically when parallel slices start together.
  const state = { name, branch, cwd, base: git(['rev-parse', 'main']), head: null, ok: false, port };
  let green = false, initial = [], findings = [], fixed = false, issue = 'Incomplete';
  try {
    await freePort(port);
    git(['worktree', 'add', '-b', branch, cwd, state.base]);
    symlinkSync(realpathSync(join(root, 'node_modules')), join(cwd, 'node_modules'));
    copyFileSync(join(root, '.env'), join(cwd, '.env'));
    json(join(dir, 'review-schema.json'), { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { priority: { type: 'string', enum: ['P0', 'P1', 'P2'] }, detail: { type: 'string' } }, required: ['priority', 'detail'], additionalProperties: false } } }, required: ['findings'], additionalProperties: false });
    const instructions = '\nPipeline instructions: read AGENTS.md, DIRECTION.md and handoff first. Implement only this brief, never merge or ship. Commit if permitted; pipeline commits remaining edits. Pipeline runs full checks/Playwright externally. Write the requested report including any balance line. Never read cloud/production env files.';
    await codex(cwd, dir, 'build', briefText + instructions);
    onBranch(cwd, branch);
    commit(cwd, `Slice ${name}`);
    green = await checks(cwd, dir, port);
    findings = initial = await review(cwd, dir, state.base, 'review');
    if (!green || blocking(findings)) {
      await codex(cwd, dir, 'fix', `One fix round: fix real review bugs and failing checks, add focused regression coverage.\n${JSON.stringify(findings)}\n${read(join(dir, 'check.log')).slice(-12000)}\nFailing e2e excerpt:\n${read(join(dir, 'logs/e2e.log')).slice(-18000)}\nOriginal brief:\n${briefText}${instructions}`);
      onBranch(cwd, branch);
      commit(cwd, `Fix slice ${name}`);
      green = await checks(cwd, dir, port);
      findings = await review(cwd, dir, state.base, 'review-final');
      fixed = !blocking(findings);
    }
    clean(cwd);
    onBranch(cwd, branch);
    state.head = git(['rev-parse', 'HEAD'], cwd);
    state.ok = green && !blocking(findings);
    issue = state.ok ? 'None blocking' : 'Checks failed or open P0/P1';
  } catch (error) { issue = error.message.replace(/\s+/g, ' ').slice(0, 500); }
  finally {
    if (existsSync(join(cwd, '.git'))) state.head = git(['rev-parse', 'HEAD'], cwd);
    json(join(dir, 'result.json'), { ...state, findings });
    const commits = state.head ? git(['log', '--format=%h', `${state.base}..${state.head}`], cwd).split('\n').join(', ') : 'none';
    const summary = read(join(dir, 'check.log')).split('\n').filter((l) => /^[✓✗-]/.test(l)).join('; ');
    const reports = state.head ? git(['diff', '--name-only', `${state.base}..${state.head}`, '--', 'docs/reviews'], cwd).split('\n').filter(Boolean) : [];
    const balance = reports.flatMap((p) => read(join(cwd, p)).split('\n')).find((l) => /balance.*\d|ch[12].*\d.*\//i.test(l));
    writeFileSync(join(dir, 'REPORT.md'), [`# Slice ${name}`, `Branch: ${branch}`, `Commits: ${commits || 'none'}`, `HEAD: ${state.head ?? 'none'}`,
      `Checks: ${summary || 'not completed'}`, `Initial review: ${initial.map((f) => `${f.priority} ${f.detail}`).join('; ') || 'none'}`,
      `Fix round: ${fixed ? 'completed; no open P0/P1 on re-review' : 'not cleared / not needed'}`,
      `Open review: ${findings.map((f) => `${f.priority} ${f.detail}`).join('; ') || 'none'}`,
      ...(balance ? [`Balance: ${balance.replace(/^\s*(?:[-*]\s*)?Balance:\s*/i, '')}`] : []), `Remaining issues: ${issue}`, `Result: ${state.ok ? 'PASS' : 'FAIL'}`].map((l) => l.replace(/[\r\n]+/g, ' ')).join('\n') + '\n');
  }
  if (!state.ok) throw new Error(`Slice failed: ${dir}/REPORT.md`);
}

async function release() {
  const [notes, ...options] = positional;
  const branches = [];
  for (let i = 0; i < options.length; i += 2) {
    if (options[i] !== '--branch' || !options[i + 1] || options[i + 1].startsWith('-')) throw new Error('Use --branch <branch>');
    branches.push(options[i + 1]);
  }
  if (!notes || notes.startsWith('--') || !branches.length || new Set(branches).size !== branches.length) throw new Error('Usage: release.sh "notes" --branch a [--branch b] [--minor] [--dry-run]');
  for (const s of ['Require clean main; acquire repository release lock; validate PASS reports against exact branch HEADs',
    `Merge ${branches.join(', ')} (stop on conflicts)`, `Read ship-cloud --next-label${minor ? ' --minor' : ''}; set app.json/package.json; commit version`,
    'Run merged check.sh --web + SKIP_DB=1 akit check; stamp HEAD with slice reports',
    `akit ship -- node scripts/ship-cloud.mjs --label <selected-label> --notes ${JSON.stringify(notes)}`,
    'Wait for Pages build at published SHA and matching live HTML; remove only merged clean slice worktrees and their logs']) step(s);
  if (dry) return;
  if (git(['branch', '--show-current']) !== 'main') throw new Error('Run release from main');
  clean(root);
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const lock = join(common, 'pipeline-release.lock');
  mkdirSync(lock); // atomic across all worktrees; a stale lock requires manual inspection.
  const releaseDir = join(store, `release-${Date.now()}`);
  try {
    writeFileSync(join(lock, 'owner'), `pid=${process.pid} root=${root}\n`);
    mkdirSync(releaseDir, { recursive: true });
    const slices = branches.map((branch) => {
      if (!/^sol\/[a-z0-9][a-z0-9-]*$/.test(branch)) throw new Error(`Not a slice branch: ${branch}`);
      const dir = join(store, branch.slice(4));
      const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
      if (result.name !== branch.slice(4) || result.cwd !== join(dirname(root), `prata-raja-${branch.slice(4)}`) ||
        !result.ok || blocking(result.findings) || result.branch !== branch || result.head !== git(['rev-parse', branch]) || !read(join(dir, 'REPORT.md')).includes('Result: PASS')) throw new Error(`Missing/stale/failed report: ${branch}`);
      const worktrees = git(['worktree', 'list', '--porcelain']).split('\n\n');
      if (!worktrees.some((w) => w.includes(`worktree ${result.cwd}\n`) && w.includes(`branch refs/heads/${branch}`))) throw new Error(`Worktree mismatch: ${branch}`);
      clean(result.cwd);
      onBranch(result.cwd, branch);
      return { ...result, dir };
    });
    for (const s of slices) git(['merge', '--no-edit', '--', s.head]);
    const label = run('node', ['scripts/ship-cloud.mjs', '--next-label', ...(minor ? ['--minor'] : [])]);
    if (!/^\d+\.\d+\.\d+$/.test(label)) throw new Error('Invalid ship label');
    for (const file of ['app.json', 'package.json']) {
      const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
      if (file === 'app.json') data.expo.version = label; else data.version = label;
      json(join(root, file), data);
    }
    const lockfile = join(root, 'package-lock.json');
    if (existsSync(lockfile)) {
      const data = JSON.parse(readFileSync(lockfile, 'utf8'));
      data.version = label;
      if (data.packages?.['']) data.packages[''].version = label;
      json(lockfile, data);
    }
    commit(root, `Release ${label}`);
    if (!await checks(root, releaseDir, Number(process.env.PORT ?? 9491))) throw new Error('Merged checks failed');
    const akit = join(homedir(), 'cell/akit/akit');
    run(akit, ['check'], root, { stdio: 'inherit', env: { ...process.env, SKIP_DB: '1' } });
    clean(root);
    mkdirSync(join(root, '.akit'), { recursive: true });
    writeFileSync(join(root, '.akit', `reviewed-${git(['rev-parse', 'HEAD'])}`), slices.map((s) => read(join(s.dir, 'REPORT.md'))).join('\n'));
    run(akit, ['ship', '--', 'node', 'scripts/ship-cloud.mjs', '--label', label, '--notes', notes], root, { stdio: 'inherit' });
    const published = git(['rev-parse', 'HEAD'], join(root, '.pages-repo'));
    const expectedHtml = readFileSync(join(root, '.pages-repo/index.html'), 'utf8');
    let deployed = false;
    for (let i = 0; i < 60; i++) {
      const build = JSON.parse(run('gh', ['api', 'repos/Mola-Bola/prata-raja/pages/builds/latest']));
      if (build.commit === published && build.status === 'errored') throw new Error('Pages deployment failed');
      if (build.commit === published && build.status === 'built') {
        const response = await fetch(`https://mola-bola.github.io/prata-raja/?release=${published}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        if (response.ok && await response.text() === expectedHtml) { deployed = true; break; }
      }
      await sleep(10000);
    }
    if (!deployed) throw new Error('Timed out waiting for Pages deployment');
    for (const s of slices) {
      clean(s.cwd);
      if (git(['rev-parse', 'HEAD'], s.cwd) !== s.head) throw new Error(`Slice advanced; preserve worktree: ${s.branch}`);
      git(['merge-base', '--is-ancestor', s.head, 'HEAD']);
      git(['worktree', 'remove', s.cwd]); // never force: preserve unexpected edits.
      for (const file of ['logs', 'serve.log', 'check.log']) rmSync(join(s.dir, file), { recursive: true, force: true });
      for (const file of ['build', 'fix', 'review', 'review-final']) {
        for (let i = 0; i <= 4; i++) rmSync(join(s.dir, `${file}-${i}.log`), { force: true });
      }
      rmSync(join(dirname(store), `${s.name}-logs`), { recursive: true, force: true });
    }
    rmSync(releaseDir, { recursive: true, force: true });
    step(`Shipped ${label}; slice reports retained in ${store}.`);
  } finally { rmSync(lock, { recursive: true, force: true }); }
}
try {
  if (process.argv[2] === 'slice') await slice();
  else if (process.argv[2] === 'release') await release();
  else throw new Error('Expected slice or release');
} catch (error) { console.error(error.message); process.exitCode = 1; }
