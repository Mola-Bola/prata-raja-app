// The shell entry points share only command execution, slice metadata and check ownership.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, symlinkSync, realpathSync, openSync, closeSync, lstatSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const store = '/private/tmp/claude-501/slices';
const args = process.argv.slice(3);
const dry = args.includes('--dry-run');
const minor = args.includes('--minor');
const full = args.includes('--full');
const positional = args.filter((a) => !['--dry-run', '--minor', '--full'].includes(a));
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
const assertHead = (cwd, head) => {
  if (git(['rev-parse', 'HEAD'], cwd) !== head) throw new Error('HEAD changed during verification; rerun checks and review');
  clean(cwd);
};
const reviewSchema = (dir) => json(join(dir, 'review-schema.json'), { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { priority: { type: 'string', enum: ['P0', 'P1', 'P2'] }, detail: { type: 'string' } }, required: ['priority', 'detail'], additionalProperties: false } } }, required: ['findings'], additionalProperties: false });
function requireOtaCompatible(base, head) {
  const at = (sha, file) => JSON.parse(git(['show', `${sha}:${file}`]));
  const before = at(base, 'app.json'), after = at(head, 'app.json');
  if (JSON.stringify(before.expo.runtimeVersion) !== JSON.stringify(after.expo.runtimeVersion)) throw new Error('Runtime changed; use the documented --apk --cloud path in docs/UPDATES.md');
  delete before.expo.version; delete after.expo.version;
  const pkgBefore = at(base, 'package.json'), pkgAfter = at(head, 'package.json');
  const dependencies = (pkg) => [pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.peerDependencies];
  const changed = git(['diff', '--name-only', base, head]).split('\n');
  if (changed.some((p) => p.startsWith('supabase/migrations/'))) throw new Error('DB migrations require the applied-and-fingerprinted release path');
  const lockChanged = changed.includes('package-lock.json') && (() => {
    const normalize = (sha) => {
      const lock = at(sha, 'package-lock.json');
      delete lock.version;
      if (lock.packages?.['']) delete lock.packages[''].version;
      return JSON.stringify(lock);
    };
    return normalize(base) !== normalize(head);
  })();
  const configAssets = (value) => typeof value === 'string' ? [value.replace(/^\.\//, '')] :
    value && typeof value === 'object' ? Object.values(value).flatMap(configAssets) : [];
  // Dependency/lock changes cannot be proved JS-only with shared node_modules; fail closed.
  if (JSON.stringify(before) !== JSON.stringify(after) ||
    JSON.stringify(dependencies(pkgBefore)) !== JSON.stringify(dependencies(pkgAfter)) ||
    changed.some((p) => configAssets(before).some((asset) => p === asset || p.startsWith(`${asset}/`))) ||
    lockChanged || changed.some((p) => p !== 'package-lock.json' && /^(?:plugins\/|modules\/|ios\/|android\/|patches\/|app.config\.|eas.json$|.*(?:lock.json|lock.yaml|yarn.lock|bun.lockb?)$)/.test(p))) {
    throw new Error('Native config or dependencies may have changed; use the documented --apk --cloud path in docs/UPDATES.md');
  }
}
function assertVersionBump(base, head, label) {
  if (head !== base && git(['rev-parse', `${head}^`]) !== base) throw new Error('HEAD changed during version bump');
  for (const file of git(['diff', '--name-only', base, head]).split('\n').filter(Boolean)) {
    if (!['app.json', 'package.json', 'package-lock.json'].includes(file)) throw new Error('Unexpected change during version bump');
    const expected = JSON.parse(git(['show', `${base}:${file}`]));
    if (file === 'app.json') expected.expo.version = label;
    else {
      expected.version = label;
      if (file === 'package-lock.json' && expected.packages?.['']) expected.packages[''].version = label;
    }
    if (JSON.stringify(expected) !== JSON.stringify(JSON.parse(git(['show', `${head}:${file}`])))) throw new Error(`Unexpected change during version bump: ${file}`);
  }
}
const step = (text) => console.log(text);
function ciStatus(branch, head, cwd = root) {
  try {
    const [latest] = JSON.parse(run('gh', ['run', 'list', '-R', 'Mola-Bola/prata-raja-app',
      '-b', branch, '-L', '1', '--commit', head,
      '--json', 'headSha,status,conclusion,startedAt,updatedAt,url'], cwd));
    if (!latest || latest.headSha !== head) return 'no run for verified HEAD yet';
    const seconds = (Date.parse(latest.updatedAt) - Date.parse(latest.startedAt)) / 1000;
    const refused = latest.status === 'completed' && latest.conclusion === 'failure' && seconds >= 0 && seconds < 10;
    return `${refused ? 'CI refused by account billing' : `${latest.status} / ${latest.conclusion || 'pending'}`} (${Number.isFinite(seconds) ? `${seconds}s` : 'duration unknown'}): ${latest.url}`;
  } catch (error) { return `lookup unavailable: ${error.message.replace(/\s+/g, ' ').slice(0, 500)}`; }
}
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
  const argv = ['exec', '-m', 'gpt-6.1-sol', '-c', `model_reasoning_effort="${review ? 'high' : 'medium'}"`, '-c', 'approval_policy="never"',
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
    const text = read(output);
    if (!result.error && result.status === 0 && text.trim()) return text;
    const capacity = /model is at capacity/i.test(read(log) + text);
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
export async function checks(cwd, dir, port, web = true) {
  await freePort(port); // check.sh otherwise silently reuses an unrelated server.
  const fd = openSync(join(dir, 'check.log'), 'w');
  let result;
  try {
    result = spawnSync('bash', ['scripts/check.sh', ...(web ? ['--web'] : [])], { cwd,
      env: { ...process.env, PORT: String(port), LOGS: join(dir, 'logs'), SKIP_DB: '1', CHECK_OWN_SERVER: '1' },
      stdio: ['ignore', fd, fd] });
  } finally { closeSync(fd); }
  step(read(join(dir, 'check.log')));
  if (result.error) throw result.error;
  return result.status === 0;
}
export async function review(cwd, dir, base, head, phase) {
  reviewSchema(dir);
  const diff = git(['diff', `${base}..${head}`], cwd);
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
    `PORT=${port} SKIP_DB=1 check.sh ${full ? '--web' : '(quick)'} → ${dir}/logs (owned server)`,
    full ? 'Read-only structured review; one fix + recheck + re-review' : 'One fix + quick recheck; full review deferred until after ship',
    `Push green branch with git push -u origin ${branch}; snapshot CI for its HEAD (nonblocking)`,
    `Write ≤15-line ${dir}/REPORT.md and commit-bound result.json; exit 0 only when green`]) step(s);
  if (dry) return;
  if (existsSync(dir) || existsSync(cwd)) throw new Error('Slice name/worktree already exists; use a new name');
  mkdirSync(store, { recursive: true });
  mkdirSync(dir); // Claim the name atomically when parallel slices start together.
  const ledgerId = process.env.FLEET_LEDGER_ID ? Number(process.env.FLEET_LEDGER_ID) : null;
  if (ledgerId !== null && (!Number.isSafeInteger(ledgerId) || ledgerId < 1)) throw new Error('Invalid FLEET_LEDGER_ID');
  const state = { ledgerId, name, branch, cwd, base: git(['rev-parse', 'main']), head: null, ok: false, mode: full ? 'full' : 'fast', port, ownedDirectories: [dir] };
  let green = false, initial = [], findings = [], fixed = false, issue = 'Incomplete', ci = 'not queried (local result not green)';
  try {
    await freePort(port);
    git(['worktree', 'add', '-b', branch, cwd, state.base]);
    state.ownedDirectories.push(cwd);
    symlinkSync(realpathSync(join(root, 'node_modules')), join(cwd, 'node_modules'));
    copyFileSync(join(root, '.env'), join(cwd, '.env'));
    json(join(dir, 'result.json'), state);
    mkdirSync(join(dir, 'logs'));
    state.ownedDirectories.push(join(dir, 'logs'));
    json(join(dir, 'result.json'), state);
    const instructions = '\nPipeline instructions: read AGENTS.md, DIRECTION.md and handoff first. Implement only this brief, never merge or ship. Commit if permitted; pipeline commits remaining edits. Pipeline runs full checks/Playwright externally. Write the requested report including any balance line. Never read cloud/production env files.';
    await codex(cwd, dir, 'build', briefText + instructions);
    onBranch(cwd, branch);
    commit(cwd, `Slice ${name}`);
    state.head = git(['rev-parse', 'HEAD'], cwd);
    green = await checks(cwd, dir, port, full);
    assertHead(cwd, state.head);
    findings = initial = full ? await review(cwd, dir, state.base, state.head, 'review') : [];
    assertHead(cwd, state.head);
    if (!green || blocking(findings)) {
      await codex(cwd, dir, 'fix', `One fix round: fix real review bugs and failing checks, add focused regression coverage.\n${JSON.stringify(findings)}\n${read(join(dir, 'check.log')).slice(-12000)}\nFailing e2e excerpt:\n${read(join(dir, 'logs/e2e.log')).slice(-18000)}\nOriginal brief:\n${briefText}${instructions}`);
      onBranch(cwd, branch);
      commit(cwd, `Fix slice ${name}`);
      state.head = git(['rev-parse', 'HEAD'], cwd);
      green = await checks(cwd, dir, port, full);
      assertHead(cwd, state.head);
      findings = full ? await review(cwd, dir, state.base, state.head, 'review-final') : [];
      assertHead(cwd, state.head);
      fixed = !blocking(findings);
    }
    clean(cwd);
    onBranch(cwd, branch);
    assertHead(cwd, state.head);
    state.ok = green && !blocking(findings);
    issue = state.ok ? 'None blocking' : 'Checks failed or open P0/P1';
    if (state.ok) {
      state.ok = false; // A failed push must not leave a successful slice result.
      git(['push', '-u', 'origin', branch], cwd);
      ci = ciStatus(branch, state.head, cwd);
      state.ok = true;
    }
  } catch (error) { issue = error.message.replace(/\s+/g, ' ').slice(0, 500); }
  finally {
    if (state.head && existsSync(join(cwd, '.git'))) {
      try { assertHead(cwd, state.head); } catch (error) { state.ok = false; issue = error.message; }
    }
    json(join(dir, 'result.json'), { ...state, findings });
    const commits = state.head ? git(['log', '--format=%h', `${state.base}..${state.head}`], cwd).split('\n').join(', ') : 'none';
    const summary = read(join(dir, 'check.log')).split('\n').filter((l) => /^[✓✗-]/.test(l)).join('; ');
    const reports = state.head ? git(['diff', '--name-only', `${state.base}..${state.head}`, '--', 'docs/reviews'], cwd).split('\n').filter(Boolean) : [];
    const balance = reports.flatMap((p) => read(join(cwd, p)).split('\n')).find((l) => /balance.*\d|ch[12].*\d.*\//i.test(l));
    writeFileSync(join(dir, 'REPORT.md'), [`# Slice ${name}`, `Branch: ${branch}`, `Commits: ${commits || 'none'}`, `HEAD: ${state.head ?? 'none'}`,
      `CI: ${ci}`, `Checks: ${summary || 'not completed'}`, `Initial review: ${!full ? 'deferred until after ship; ' : ''}${initial.map((f) => `${f.priority} ${f.detail}`).join('; ') || 'none'}`,
      `Fix round: ${fixed ? (full ? 'completed; no open P0/P1 on re-review' : 'quick checks rerun; review deferred') : 'not cleared / not needed'}`,
      `Open review: ${!full ? 'not run; ' : ''}${findings.map((f) => `${f.priority} ${f.detail}`).join('; ') || 'none'}`,
      ...(balance ? [`Balance: ${balance.replace(/^\s*(?:[-*]\s*)?Balance:\s*/i, '')}`] : []), `Remaining issues: ${issue}`, `Result: ${state.ok ? 'PASS' : 'FAIL'}`].map((l) => l.replace(/[\r\n]+/g, ' ')).join('\n') + '\n');
  }
  if (!state.ok) throw new Error(`Slice failed: ${dir}/REPORT.md`);
}

// Accept completed bounded agent work without rerunning a code-generation worker.
async function verifySlice() {
  const [name, baseRef] = positional;
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name) || !/^[a-f0-9]{7,40}$/.test(baseRef ?? '') || positional.length !== 2 || minor) throw new Error('Usage: pipeline.mjs verify-slice <name> <base-sha> [--full] [--dry-run]');
  const cwd = join(dirname(root), `prata-raja-${name}`), branch = `sol/${name}`, dir = join(store, name);
  const base = git(['rev-parse', `${baseRef}^{commit}`]);
  const head = git(['rev-parse', branch]);
  onBranch(cwd, branch); assertHead(cwd, head);
  git(['merge-base', '--is-ancestor', base, head]);
  try { git(['merge-base', '--is-ancestor', base, 'main']); }
  catch { throw new Error('Slice base must be an ancestor of main; cannot hide branch-only changes'); }
  const ledgerId = process.env.FLEET_LEDGER_ID ? Number(process.env.FLEET_LEDGER_ID) : null;
  if (ledgerId !== null && (!Number.isSafeInteger(ledgerId) || ledgerId < 1)) throw new Error('Invalid FLEET_LEDGER_ID');
  const port = Number(process.env.PORT ?? 9492);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
  step(`Verify existing ${branch} in ${cwd} at ${head}; ${full ? 'web checks + review' : 'quick checks; review deferred'}; push and record ${dir}`);
  if (dry) return;
  if (existsSync(join(dir, 'result.json'))) {
    const previous = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
    if (previous.cwd !== cwd || previous.branch !== branch || previous.base !== base) throw new Error('Result directory belongs to another slice');
  }
  mkdirSync(dir, { recursive: true });
  const state = { name, cwd, branch, base, head, ledgerId, mode: full ? 'full' : 'fast', port, ok: false, findings: [], ownedDirectories: [dir, join(dir, 'logs')] };
  // The pre-existing worktree is not ours to delete during release cleanup.
  const resultPath = join(dir, 'result.json'), candidatePath = join(dir, 'candidate.json');
  json(resultPath, state);
  let db, row, issue = 'Incomplete', ci = 'not queried';
  try {
    if (ledgerId !== null) {
      const fleet = await import('./fleet.mjs');
      db = fleet.openLedger(root, { render: false });
      const claimed = db.list().find((r) => r.id === ledgerId);
      if (!claimed || !['claimed', 'building', 'ready', 'failed'].includes(claimed.status) || (claimed.branch && claimed.branch !== branch)) throw new Error('Ledger row does not own this active slice');
      row = claimed;
      json(candidatePath, { ...state, ok: true });
      fleet.validateResult(root, row, name, candidatePath);
    }
    if (!await checks(cwd, dir, port, full)) throw new Error('Slice checks failed');
    assertHead(cwd, head);
    state.findings = full ? await review(cwd, dir, base, head, 'review') : [];
    assertHead(cwd, head);
    if (blocking(state.findings)) throw new Error('Review has open P0/P1');
    git(['push', '-u', 'origin', branch], cwd);
    ci = ciStatus(branch, head, cwd);
    assertHead(cwd, head);
    state.ok = true; issue = 'None blocking';
  } catch (error) { issue = error.message; }
  finally {
    rmSync(candidatePath, { force: true });
    json(resultPath, state);
    writeFileSync(join(dir, 'REPORT.md'), `# Slice ${name}\nBranch: ${branch}\nHEAD: ${head}\nBase: ${base}\nChecks: ${read(join(dir, 'check.log')).split('\n').filter((l) => /^[✓✗-]/.test(l)).join('; ') || 'not completed'}\nReview: ${full ? JSON.stringify(state.findings) : 'deferred until after ship'}\nCI: ${ci}\nRemaining issues: ${issue}\nResult: ${state.ok ? 'PASS' : 'FAIL'}\n`);
    try {
      if (row && ['claimed', 'building', 'ready', 'failed'].includes(row.status)) db.status(ledgerId, state.ok ? 'ready' : 'failed', { branch, result: { report: resultPath, base, head }, note: issue });
    } finally { db?.close(); }
  }
  if (!state.ok) throw new Error(`Slice verification failed: ${issue}; ${dir}/REPORT.md`);
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
    `Merge ${branches.join(', ')} (stop on conflicts)`,
    `${full ? 'Review merged full diff' : 'Defer full web/balance/read-only review to durable post-ship verifier'}; refuse runtime/native config, dependency and DB migration changes`,
    `Read ship-cloud --next-label${minor ? ' --minor' : ''}; set app.json/package.json; commit only version changes`,
    `${full ? 'Run merged web checks + ' : ''}akit check; reject HEAD changes; stamp pinned HEAD with queued ledger id`,
    `akit ship -- node scripts/publish-web.mjs --label <selected-label>`,
    'Push main with git push origin main; retain REPORT.md with CI snapshot for shipped HEAD (nonblocking)',
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
    mkdirSync(store, { recursive: true });
    mkdirSync(releaseDir);
    const fleet = existsSync(join(root, 'scripts/fleet.mjs')) ? await import('./fleet.mjs') : null;
    const db = fleet?.openLedger(root, { render: false });
    let slices;
    try { slices = branches.map((branch) => {
      if (!/^sol\/[a-z0-9][a-z0-9-]*$/.test(branch)) throw new Error(`Not a slice branch: ${branch}`);
      const dir = join(store, branch.slice(4));
      const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
      if (result.name !== branch.slice(4) || result.cwd !== join(dirname(root), `prata-raja-${branch.slice(4)}`) ||
        !result.ok || blocking(result.findings) || result.branch !== branch || result.head !== git(['rev-parse', branch]) || !read(join(dir, 'REPORT.md')).includes('Result: PASS')) throw new Error(`Missing/stale/failed report: ${branch}`);
      const worktrees = git(['worktree', 'list', '--porcelain']).split('\n\n');
      if (!worktrees.some((w) => w.includes(`worktree ${result.cwd}\n`) && w.includes(`branch refs/heads/${branch}`))) throw new Error(`Worktree mismatch: ${branch}`);
      clean(result.cwd);
      onBranch(result.cwd, branch);
      const row = db?.list().find((r) => r.branch === branch);
      if (row || result.ledgerId || branch.startsWith('sol/fleet-')) {
        if (!row || row.id !== result.ledgerId || row.status !== 'ready') throw new Error(`Fleet slice is not ready in the ledger: ${branch}`);
        fleet.validateResult(root, row, branch.slice(4), join(dir, 'result.json'));
      }
      return { ...result, dir };
    }); } finally { db?.close(); }
    // Keep slice changes in scope even when retrying after a failed merged release.
    const mainHead = git(['rev-parse', 'HEAD']);
    const base = git(['merge-base', '--octopus', mainHead, ...slices.map((s) => s.base)]);
    for (const s of slices) git(['merge', '--no-edit', '--', s.head]);
    const mergedHead = git(['rev-parse', 'HEAD']);
    const findings = full ? await review(root, releaseDir, base, mergedHead, 'review-merged') : [];
    assertHead(root, mergedHead);
    if (blocking(findings)) throw new Error('Merged review has open P0/P1; see review-merged.txt');
    requireOtaCompatible(mainHead, mergedHead);
    requireOtaCompatible(base, mergedHead);
    const label = run('node', ['scripts/ship-cloud.mjs', '--next-label', ...(minor ? ['--minor'] : [])]);
    if (!/^\d+\.\d+\.\d+$/.test(label)) throw new Error('Invalid ship label');
    assertHead(root, mergedHead);
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
    const verifiedHead = git(['rev-parse', 'HEAD']);
    assertVersionBump(mergedHead, verifiedHead, label);
    if (full && !await checks(root, releaseDir, Number(process.env.PORT ?? 9491))) throw new Error('Merged checks failed');
    assertHead(root, verifiedHead);
    const akit = join(homedir(), 'cell/akit/akit');
    run(akit, ['check'], root, { stdio: 'inherit', env: { ...process.env, SKIP_DB: '1' } });
    assertHead(root, verifiedHead);
    const { queueVerification, startVerification } = await import('./verify-fleet.mjs');
    const job = await queueVerification(root, { base, head: verifiedHead, label });
    mkdirSync(join(root, '.akit'), { recursive: true });
    writeFileSync(join(root, '.akit', `reviewed-${verifiedHead}`), `${full ? 'Full pre-ship review completed' : `fast lane: post-ship review queued ${job.ledgerId}`}\nPinned ${verifiedHead}; ${base}..${mergedHead}\n${JSON.stringify(findings)}\n` + slices.map((s) => read(join(s.dir, 'REPORT.md'))).join('\n'));
    assertHead(root, verifiedHead);
    run(akit, ['ship', '--', 'node', 'scripts/publish-web.mjs', '--label', label], root, { stdio: 'inherit' });
    assertHead(root, verifiedHead);
    await startVerification(root, job);
    let ci;
    try {
      git(['push', 'origin', 'main']);
      ci = ciStatus('main', verifiedHead);
    } catch (error) {
      ci = `push failed: ${error.message}`;
      throw error;
    } finally {
      writeFileSync(join(releaseDir, 'REPORT.md'), `# Release ${label}\nBranch: main\nHEAD: ${verifiedHead}\nVerification: queued ledger ${job.ledgerId}; node scripts/verify-fleet.mjs run ${job.id}\nCI: ${ci.replace(/[\r\n]+/g, ' ')}\n`);
    }
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
    const shippedLedger = slices.some((s) => s.ledgerId) ? fleet.openLedger(root, { render: false }) : null;
    try {
      for (const s of slices.filter((slice) => slice.ledgerId)) shippedLedger.status(s.ledgerId, 'shipped', {
        release: label,
        result: { head: verifiedHead, sliceHead: s.head, publishedHead: published, report: join(s.dir, 'REPORT.md') },
        note: `Web ${label} published and Pages verified; full post-ship checks remain separate`,
      });
    } finally { shippedLedger?.close(); }
    for (const s of slices) {
      clean(s.cwd);
      if (git(['rev-parse', 'HEAD'], s.cwd) !== s.head) throw new Error(`Slice advanced; preserve worktree: ${s.branch}`);
      git(['merge-base', '--is-ancestor', s.head, 'HEAD']);
      if (s.ownedDirectories?.includes(s.cwd)) git(['worktree', 'remove', s.cwd]); // never force: preserve unexpected edits.
      for (const owned of s.ownedDirectories ?? []) {
        if (owned === join(s.dir, 'logs') && existsSync(owned) && !lstatSync(owned).isSymbolicLink()) rmSync(owned, { recursive: true, force: true });
      }
      for (const file of ['serve.log', 'check.log']) rmSync(join(s.dir, file), { force: true });
      for (const file of ['build', 'fix', 'review', 'review-final']) {
        for (let i = 0; i <= 4; i++) rmSync(join(s.dir, `${file}-${i}.log`), { force: true });
      }
    }
    for (const file of readdirSync(releaseDir)) {
      if (file !== 'REPORT.md') rmSync(join(releaseDir, file), { recursive: true, force: true });
    }
    step(`Shipped ${label}; slice and release reports retained in ${store}.`);
  } finally { rmSync(lock, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) try {
  if (process.argv[2] === 'slice') await slice();
  else if (process.argv[2] === 'release') await release();
  else if (process.argv[2] === 'verify-slice') await verifySlice();
  else throw new Error('Expected slice, verify-slice or release');
} catch (error) { console.error(error.message); process.exitCode = 1; }
