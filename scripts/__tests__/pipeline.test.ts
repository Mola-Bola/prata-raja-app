import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chooseLabel } from '../ship-label.mjs';

const source = resolve('scripts');
function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'pipeline-test-'));
  const root = join(base, 'repo');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  for (const file of ['pipeline.mjs', 'slice.sh', 'release.sh', 'verify-fleet.mjs', 'fleet.mjs']) cpSync(join(source, file), join(root, 'scripts', file));
  writeFileSync(join(root, 'scripts/verify-fleet.mjs'), 'export async function queueVerification() { return {id: \"test\", ledgerId: 1}; } export async function startVerification() {}');
  const pipeline = join(root, 'scripts/pipeline.mjs');
  writeFileSync(pipeline, readFileSync(pipeline, 'utf8')
    .replace("const store = '/private/tmp/claude-501/slices';", `const store = ${JSON.stringify(join(base, 'slices'))};`)
    .replace('setTimeout(r, ms)', 'setTimeout(r, 0)')); // Exercise retries without five-minute waits.
  mkdirSync(join(root, 'node_modules'));
  writeFileSync(join(root, '.env'), 'LOCAL_ONLY=1\n');
  writeFileSync(join(root, '.gitignore'), '.env\nnode_modules\n.akit\n.pages-repo\n.fleet\n');
  writeFileSync(join(root, 'app.json'), '{"expo":{"version":"0.4.1","runtimeVersion":"1"}}');
  writeFileSync(join(root, 'package.json'), '{"version":"0.4.1"}');
  writeFileSync(join(root, 'package-lock.json'), '{"version":"0.4.1","packages":{"":{"version":"0.4.1"}}}');
  writeFileSync(join(root, 'scripts/check.sh'), `#!/bin/bash
if [ "$PIPELINE_CHECK_COMMIT" = 1 ]; then git commit --allow-empty -qm 'Concurrent check commit'; fi
if [ "$PIPELINE_CHECK_FAIL" = 1 ]; then echo '✗ tsc'; exit 1; fi
if [ -f src/change.txt ] && ! grep -q fixed src/change.txt; then echo '✗ vitest · Tests 1 failed'; exit 1; fi
echo '✓ vitest · Tests 2 passed'
echo '✓ e2e · 3 passed'
`);
  writeFileSync(join(root, 'scripts/ship-cloud.mjs'), 'console.log("0.4.2");');
  const bin = join(base, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'codex'), `#!/usr/bin/env node
const fs = require('fs');
const a = process.argv.slice(2), output = a[a.indexOf('-o') + 1];
const review = a.includes('read-only');
const prompt = fs.readFileSync(0, 'utf8');
if (review && process.env.PIPELINE_REVIEW_CAPTURE) fs.appendFileSync(process.env.PIPELINE_REVIEW_CAPTURE, prompt);
if (review && process.env.PIPELINE_REVIEW_COMMIT) require('child_process').execFileSync('git', ['commit', '--allow-empty', '-qm', 'Concurrent review commit']);
if (review && process.env.PIPELINE_PROTECTED_P1 && prompt.includes(process.env.PIPELINE_PROTECTED_P1)) {
  fs.writeFileSync(output, JSON.stringify({findings:[{priority:'P1', detail:'Protected diff bug'}]})); process.exit(0);
}
if (process.env.PIPELINE_CAPACITY_FILE) {
  const file = process.env.PIPELINE_CAPACITY_FILE;
  const count = fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) : 0;
  fs.writeFileSync(file, String(count + 1));
  console.error('model is at capacity'); process.exit(1);
}
const fixed = fs.existsSync('src/change.txt') && fs.readFileSync('src/change.txt','utf8').includes('fixed');
if (review) fs.writeFileSync(output, JSON.stringify({findings: fixed && !process.env.PIPELINE_OPEN_P1 ? [] : [{priority:'P1', detail:'src/change.txt: broken'}]}));
else {
  if (!a.some(x => x.startsWith('sandbox_workspace_write.writable_roots='))) process.exit(2);
  if (!a.includes('sandbox_workspace_write.network_access=true')) process.exit(2);
  fs.mkdirSync('src', {recursive:true}); fs.mkdirSync('docs/reviews', {recursive:true});
  fs.writeFileSync('src/change.txt', fs.existsSync('src/change.txt') ? 'fixed' : 'broken');
  fs.writeFileSync('docs/reviews/test-report.md', 'Balance: ch1 60/45/20\\n');
  fs.writeFileSync(output, 'Implemented');
}
`, { mode: 0o755 });
  const testAkit = join(bin, 'akit');
  writeFileSync(pipeline, readFileSync(pipeline, 'utf8').replace("join(homedir(), 'cell/akit/akit')", JSON.stringify(testAkit)));
  writeFileSync(testAkit, `#!/bin/bash
set -e
if [ "$1" = ship ]; then
  mkdir .pages-repo
  git -C .pages-repo init -q
  echo published > .pages-repo/index.html
  git -C .pages-repo -c user.name=Test -c user.email=test@example.invalid commit -q --allow-empty -m published
  echo shipped > .akit/shipped
fi
if [ "$1" = check ] && [ "$PIPELINE_AKIT_COMMIT" = 1 ]; then git commit --allow-empty -qm "Concurrent akit commit"; fi
if [ "$1" = check ] && [ "$PIPELINE_AKIT_FAIL" = 1 ]; then exit 1; fi
`, { mode: 0o755 });
  writeFileSync(join(bin, 'gh'), `#!/bin/bash
if [ "$1" = run ]; then
  printf '%s\\n' "$@" > "$PIPELINE_CI_ARGS"
  if [ "$PIPELINE_CI_UNAVAILABLE" = 1 ]; then echo 'CI unavailable' >&2; exit 1; fi
  if [ "$PIPELINE_CI_MISSING" = 1 ]; then echo '[]'; exit 0; fi
  node -e 'console.log(JSON.stringify([{headSha:process.env.PIPELINE_CI_STALE ? "stale" : require("child_process").execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim(), status:"completed", conclusion:process.env.PIPELINE_CI_SUCCESS ? "success" : "failure", startedAt:"2026-10-13T00:00:00Z", updatedAt:process.env.PIPELINE_CI_SLOW ? "2026-10-13T00:00:10Z" : "2026-10-13T00:00:09Z", url:"https://example.invalid/run/1"}]))'
  exit 0
fi
if [ "$PIPELINE_PAGES_FAIL" = 1 ]; then echo 'Pages unavailable' >&2; exit 1; fi
printf '{"commit":"%s","status":"built"}' "$(git -C .pages-repo rev-parse HEAD)"
`, { mode: 0o755 });
  writeFileSync(join(base, 'fetch.mjs'), `import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
net.createServer = () => ({ once() { return this; }, listen(_port, _host, cb) { cb(); }, close(cb) { cb(); } });
syncBuiltinESMExports();
globalThis.fetch = async () => ({ ok: true, text: async () => 'published\\n' });`);
  const env = { ...process.env, FLEET_LEDGER_ID: '', PATH: `${bin}:${process.env.PATH}`, NODE_OPTIONS: `--import=${join(base, 'fetch.mjs')}`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Test', GIT_COMMITTER_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main'); git('add', '-A'); git('commit', '-qm', 'fixture');
  const remote = join(base, 'origin.git');
  git('init', '--bare', '-q', remote);
  git('remote', 'add', 'origin', remote);
  const name = `test-${process.pid}-${Date.now()}`;
  Object.assign(env, { PIPELINE_CI_ARGS: join(base, 'ci-args.txt') });
  const report = join(base, 'slices', name);
  writeFileSync(join(base, 'brief.md'), 'Implement change; write a report.');
  const call = (script: string, ...args: string[]) => spawnSync('bash', [`scripts/${script}.sh`, ...args, '--full'], { cwd: root, env, encoding: 'utf8' });
  const fast = (script: string, ...args: string[]) => spawnSync('bash', [`scripts/${script}.sh`, ...args], { cwd: root, env, encoding: 'utf8' });
  return { base, root, name, report, git, call, fast, env, close: () => { rmSync(base, { recursive: true, force: true }); rmSync(report, { recursive: true, force: true }); } };
}

// Git/process fixtures can exceed Vitest's default timeout on a loaded Mac.
describe('pipeline', { timeout: 60_000 }, () => {
  it('fast lane defers review, pins its stamp and publishes only web', () => {
    const f = fixture();
    try {
      Object.assign(f.env, { PIPELINE_OPEN_P1: '1', PIPELINE_REVIEW_CAPTURE: join(f.base, 'review.txt') });
      expect(f.fast('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      expect(readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toContain('deferred until after ship');
      expect(existsSync(join(f.base, 'review.txt'))).toBe(false);
      const release = f.fast('release', 'Fast', '--branch', `sol/${f.name}`);
      expect(release.status, release.stderr).toBe(0);
      const stamp = readFileSync(join(f.root, `.akit/reviewed-${f.git('rev-parse', 'HEAD')}`), 'utf8');
      expect(stamp).toContain('fast lane: post-ship review queued 1');
      const dry = f.fast('release', 'Fast', '--branch', `sol/${f.name}`, '--dry-run');
      expect(dry.stdout).toContain('publish-web.mjs --label <selected-label>');
      expect(dry.stdout).not.toContain('ship-cloud.mjs --label');
    } finally { f.close(); }
  });
  it('release rejects failed ledger rows even with a passing pipeline report', () => {
    const f = fixture();
    try {
      expect(f.fast('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      const path = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(path, 'utf8'));
      result.ledgerId = 1;
      writeFileSync(path, JSON.stringify(result));
      const update = (status: string, owned = ['src', 'docs']) => execFileSync(process.execPath, ['--input-type=module', '-e', `
        import {openLedger} from './scripts/fleet.mjs';
        const db=openLedger(process.cwd(),{render:false});
        if(!db.list().length) db.addClaimed({source:'test',intent:'slice',brief:'build',owned:${JSON.stringify(owned)}},'test');
        db.status(1,'${status}',{branch:'sol/${f.name}'}); db.close();
      `], {cwd:f.root, env:f.env});
      update('failed');
      expect(f.fast('release', 'Test', '--branch', `sol/${f.name}`).stderr).toContain('not ready in the ledger');
      expect(f.git('rev-parse', 'HEAD')).toBe(result.base);
      update('ready');
      execFileSync(process.execPath, ['--input-type=module', '-e', `
        import {openLedger} from './scripts/fleet.mjs'; const db=openLedger(process.cwd(),{render:false});
        db.add({source:'test',intent:'next',brief:'follow-up',owned:['src'],dependsOn:[1]});
        if(db.claim('next-worker')) throw new Error('Dependency must wait');db.close();
      `],{cwd:f.root,env:f.env});
      expect(f.fast('release', 'Test', '--branch', `sol/${f.name}`).status).toBe(0);
      const outcome=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`
        import {openLedger} from './scripts/fleet.mjs'; const db=openLedger(process.cwd(),{render:false});
        console.log(JSON.stringify({shipped:db.list()[0],next:db.claim('next-worker')})); db.close();
      `],{cwd:f.root,env:f.env,encoding:'utf8'}));
      expect(outcome.shipped.status).toBe('shipped');
      expect(outcome.shipped.release).toBe('0.4.2');
      expect(outcome.shipped.result.head).toBe(f.git('rev-parse','HEAD'));
      expect(outcome.next.id).toBe(2);
      expect(f.git('status','--porcelain')).toBe('');
    } finally { f.close(); }
  });
  it('release enforces source ownership again for a ready ledger row', () => {
    const f = fixture();
    try {
      expect(f.fast('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      const path=join(f.report,'result.json');
      const result=JSON.parse(readFileSync(path,'utf8'));
      result.ledgerId=1; writeFileSync(path,JSON.stringify(result));
      execFileSync(process.execPath,['--input-type=module','-e', `
        import {openLedger} from './scripts/fleet.mjs';
        const db=openLedger(process.cwd(),{render:false});
        db.addClaimed({source:'test',intent:'slice',brief:'build',owned:['unrelated']},'test');
        db.status(1,'ready',{branch:'sol/${f.name}'});db.close();
      `],{cwd:f.root,env:f.env});
      const release=f.fast('release','Test','--branch',`sol/${f.name}`);
      expect(release.stderr).toContain('unowned paths');
      expect(f.git('rev-parse','HEAD')).toBe(result.base);
      expect(existsSync(join(f.root,'.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it('rejects a branch-only base that hides earlier unowned edits', () => {
    const f=fixture();
    try {
      const base=f.git('rev-parse','HEAD'),cwd=join(f.base,`prata-raja-${f.name}`);
      f.git('worktree','add','-b',`sol/${f.name}`,cwd,base);
      writeFileSync(join(cwd,'unowned.txt'),'hidden change');
      execFileSync('git',['add','-A'],{cwd,env:f.env});
      execFileSync('git',['commit','-qm','Unowned change'],{cwd,env:f.env});
      const hiddenBase=f.git('rev-parse',`sol/${f.name}`);
      mkdirSync(join(cwd,'src'));writeFileSync(join(cwd,'src/change.txt'),'fixed');
      execFileSync('git',['add','-A'],{cwd,env:f.env});
      execFileSync('git',['commit','-qm','Owned change'],{cwd,env:f.env});
      const run=spawnSync(process.execPath,['scripts/pipeline.mjs','verify-slice',f.name,hiddenBase],{cwd:f.root,env:f.env,encoding:'utf8'});
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('ancestor of main');
      expect(existsSync(f.report)).toBe(false);
      expect(f.git('rev-parse','main')).toBe(base);
    } finally {f.close();}
  });
  it.each([false, true])('verifies an existing bounded agent worktree; concurrent HEAD change=%s', (concurrent) => {
    const f = fixture();
    try {
      const base=f.git('rev-parse','HEAD'), cwd=join(f.base,`prata-raja-${f.name}`);
      f.git('worktree','add','-b',`sol/${f.name}`,cwd,base);
      mkdirSync(join(cwd,'src'));
      writeFileSync(join(cwd,'src/change.txt'),'fixed');
      execFileSync('git',['add','-A'],{cwd,env:f.env});
      execFileSync('git',['commit','-qm','Agent implemented'],{cwd,env:f.env});
      execFileSync(process.execPath,['--input-type=module','-e', `
        import {openLedger} from './scripts/fleet.mjs';const db=openLedger(process.cwd(),{render:false});
        db.addClaimed({source:'test',intent:'slice',brief:'build',owned:['src']},'agent');
        db.status(1,'building',{branch:'sol/${f.name}'});db.close();
      `],{cwd:f.root,env:f.env});
      Object.assign(f.env,{FLEET_LEDGER_ID:'1',PIPELINE_CHECK_COMMIT:concurrent?'1':'',PIPELINE_CAPACITY_FILE:join(f.base,'no-codegen')});
      const call=(...args: string[])=>spawnSync(process.execPath,['scripts/pipeline.mjs','verify-slice',f.name,base,...args],{cwd:f.root,env:f.env,encoding:'utf8'});
      expect(call('--dry-run').status).toBe(0);
      expect(existsSync(f.report)).toBe(false);
      const verified=call();
      expect(verified.status,verified.stderr).toBe(concurrent?1:0);
      const report=JSON.parse(readFileSync(join(f.report,'result.json'),'utf8'));
      expect(report.ledgerId).toBe(1);
      expect(report.ok).toBe(!concurrent);
      expect(report.ownedDirectories).not.toContain(cwd);
      expect(existsSync(join(f.base,'no-codegen'))).toBe(false);
      const rows=JSON.parse(execFileSync(process.execPath,['scripts/fleet.mjs','list'],{cwd:f.root,env:f.env,encoding:'utf8'}));
      expect(rows[0].status).toBe(concurrent?'failed':'ready');
      if(!concurrent) expect(f.fast('release','Agent slice','--branch',`sol/${f.name}`).status).toBe(0);
    } finally {f.close();}
  });
  it('shares ship label semantics and handles numeric ordering/minor bumps', () => {
    expect(chooseLabel('0.4.1', ['0.4.9', '0.4.10', 'junk'])).toBe('0.4.11');
    expect(chooseLabel('0.5.0', ['0.4.10'])).toBe('0.5.1');
    expect(chooseLabel('0.4.3', ['0.4.2'])).toBe('0.4.4');
    expect(chooseLabel('0.4.9', ['0.4.2'])).toBe('0.4.10');
    expect(chooseLabel('0.4.1', [])).toBe('0.4.2');
    expect(chooseLabel('0.4.1', ['0.4.10'], true)).toBe('0.5.0');
  });
  it('dry runs have no writes; fixes failing checks/P1, then ships and cleans only verified slices', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md'), '--dry-run').status).toBe(0);
      expect(f.call('release', 'Preview', '--branch', `sol/${f.name}`, '--minor', '--dry-run').status).toBe(0);
      expect(existsSync(f.report)).toBe(false);
      expect(f.git('branch', '--list')).toBe('* main');
      expect(f.git('ls-remote', 'origin')).toBe('');
      const slice = f.call('slice', f.name, join(f.base, 'brief.md'));
      expect(slice.status, slice.stderr + slice.stdout + readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toBe(0);
      const report = readFileSync(join(f.report, 'REPORT.md'), 'utf8');
      expect(report.trim().split('\n').length).toBeLessThanOrEqual(15);
      expect(report).toContain('Balance: ch1 60/45/20');
      expect(report).toContain('2 passed'); expect(report).toContain('3 passed');
      expect(report).toContain('no open P0/P1');
      expect(report).toContain('CI refused by account billing');
      expect(report).toContain('https://example.invalid/run/1');
      expect(readFileSync(join(f.base, 'ci-args.txt'), 'utf8').trim().split('\n')).toEqual([
        'run', 'list', '-R', 'Mola-Bola/prata-raja-app', '-b', `sol/${f.name}`, '-L', '1',
        '--commit', f.git('rev-parse', `sol/${f.name}`),
        '--json', 'headSha,status,conclusion,startedAt,updatedAt,url',
      ]);
      expect(f.git('rev-parse', `refs/remotes/origin/sol/${f.name}`)).toBe(f.git('rev-parse', `sol/${f.name}`));
      expect(f.git('config', `branch.sol/${f.name}.remote`)).toBe('origin');
      const unrelated = join(f.base, `${f.name}-logs`);
      mkdirSync(unrelated);
      writeFileSync(join(unrelated, 'keep'), 'another task');
      const state = JSON.parse(readFileSync(join(f.report, 'result.json'), 'utf8'));
      expect(state.ownedDirectories).toContain(join(f.report, 'logs'));
      state.ownedDirectories.push(unrelated);
      writeFileSync(join(f.report, 'result.json'), JSON.stringify(state));
      Object.assign(f.env, { PIPELINE_REVIEW_CAPTURE: join(f.base, 'merged-review.txt') });
      const release = f.call('release', 'Test release', '--branch', `sol/${f.name}`);
      expect(release.status, release.stderr + release.stdout).toBe(0);
      expect(readFileSync(join(f.base, 'merged-review.txt'), 'utf8')).not.toContain('0.4.2');
      expect(JSON.parse(readFileSync(join(f.root, 'package.json'), 'utf8')).version).toBe('0.4.2');
      expect(JSON.parse(readFileSync(join(f.root, 'package-lock.json'), 'utf8')).packages[''].version).toBe('0.4.2');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(true);
      expect(f.git('rev-parse', 'origin/main')).toBe(f.git('rev-parse', 'HEAD'));
      expect(readFileSync(join(f.base, 'ci-args.txt'), 'utf8').trim().split('\n')).toEqual([
        'run', 'list', '-R', 'Mola-Bola/prata-raja-app', '-b', 'main', '-L', '1',
        '--commit', f.git('rev-parse', 'HEAD'),
        '--json', 'headSha,status,conclusion,startedAt,updatedAt,url',
      ]);
      const releaseDir = readdirSync(join(f.base, 'slices')).find((name) => name.startsWith('release-'))!;
      expect(readFileSync(join(f.base, 'slices', releaseDir, 'REPORT.md'), 'utf8')).toContain('CI refused by account billing');
      expect(existsSync(join(f.base, `prata-raja-${f.name}`))).toBe(false);
      expect(existsSync(join(f.report, 'REPORT.md'))).toBe(true);
      expect(existsSync(join(f.report, 'check.log'))).toBe(false);
      expect(existsSync(join(f.report, 'logs'))).toBe(false);
      expect(readFileSync(join(unrelated, 'keep'), 'utf8')).toBe('another task');
    } finally { f.close(); }
  });

  it.each(['app.json', 'supabase/migrations/001.sql'])('reviews the merged protected diff in %s before stamping', (file) => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      const cwd = join(f.base, `prata-raja-${f.name}`);
      mkdirSync(join(cwd, 'supabase/migrations'), { recursive: true });
      writeFileSync(join(cwd, file), file === 'app.json' ? '{"expo":{"version":"0.4.1","description":"protected-bug"}}' : '-- protected-bug');
      execFileSync('git', ['add', '-A'], { cwd, env: f.env });
      execFileSync('git', ['commit', '-qm', 'Protected change'], { cwd, env: f.env });
      const path = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(path, 'utf8'));
      result.head = f.git('rev-parse', `sol/${f.name}`);
      writeFileSync(path, JSON.stringify(result));
      Object.assign(f.env, { PIPELINE_PROTECTED_P1: 'protected-bug', PIPELINE_REVIEW_CAPTURE: join(f.base, 'review.txt') });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.stderr).toContain('Merged review has open P0/P1');
      expect(f.call('release', 'Retry', '--branch', `sol/${f.name}`).stderr).toContain('Merged review has open P0/P1');
      expect(readFileSync(join(f.base, 'review.txt'), 'utf8')).toContain(file);
      expect(existsSync(join(f.root, `.akit/reviewed-${f.git('rev-parse', 'HEAD')}`))).toBe(false);
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it.each(['PIPELINE_CHECK_COMMIT', 'PIPELINE_REVIEW_COMMIT'])('rejects slice HEAD changes during %s', (hook) => {
    const f = fixture();
    try {
      Object.assign(f.env, { [hook]: '1' });
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(1);
      const result = JSON.parse(readFileSync(join(f.report, 'result.json'), 'utf8'));
      expect(result.ok).toBe(false);
      expect(result.head).not.toBe(f.git('rev-parse', `sol/${f.name}`));
      expect(readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toContain('HEAD changed');
    } finally { f.close(); }
  });
  it.each(['PIPELINE_CHECK_COMMIT', 'PIPELINE_REVIEW_COMMIT', 'PIPELINE_AKIT_COMMIT'])('rejects release HEAD changes during %s before stamping', (hook) => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      Object.assign(f.env, { [hook]: '1' });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.stderr).toContain('HEAD changed');
      expect(existsSync(join(f.root, `.akit/reviewed-${f.git('rev-parse', 'HEAD')}`))).toBe(false);
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it.each(['app.json', 'package.json', 'package-lock.json'])('rejects an unreviewed %s change hidden in the release version commit', (file) => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      writeFileSync(join(f.root, '.git/hooks/pre-commit'), `#!/bin/sh
node -e 'const fs = require("node:fs"); const file = ${JSON.stringify(file)}; const data = JSON.parse(fs.readFileSync(file)); data.unreviewed = true; fs.writeFileSync(file, JSON.stringify(data));'
git add ${file}
`, { mode: 0o755 });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1);
      expect(release.stderr).toContain(`Unexpected change during version bump: ${file}`);
      expect(existsSync(join(f.root, `.akit/reviewed-${f.git('rev-parse', 'HEAD')}`))).toBe(false);
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it.each(['runtime', 'dependency', 'lock', 'plugin', 'patch'])('refuses OTA for a %s change against main', (change) => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      const cwd = join(f.base, `prata-raja-${f.name}`);
      if (change === 'runtime') writeFileSync(join(cwd, 'app.json'), '{"expo":{"version":"0.4.1","runtimeVersion":"2"}}');
      if (change === 'dependency') writeFileSync(join(cwd, 'package.json'), '{"version":"0.4.1","dependencies":{"expo-haptics":"57.0.4"}}');
      if (change === 'lock') writeFileSync(join(cwd, 'package-lock.json'), '{"version":"0.4.1","packages":{"node_modules/expo-haptics":{"version":"57.0.4"}}}');
      if (change === 'plugin') { mkdirSync(join(cwd, 'plugins')); writeFileSync(join(cwd, 'plugins/native.js'), '// native'); }
      if (change === 'patch') { mkdirSync(join(cwd, 'patches')); writeFileSync(join(cwd, 'patches/native.patch'), 'native dependency patch'); }
      execFileSync('git', ['add', '-A'], { cwd, env: f.env });
      execFileSync('git', ['commit', '-qm', 'Native change'], { cwd, env: f.env });
      const path = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(path, 'utf8'));
      result.head = f.git('rev-parse', `sol/${f.name}`);
      writeFileSync(path, JSON.stringify(result));
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1);
      expect(release.stderr).toContain('documented --apk --cloud path');
      expect(f.call('release', 'Retry', '--branch', `sol/${f.name}`).stderr).toContain('documented --apk --cloud path');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it('refuses a runtime revert to the old slice base when main has a newer runtime', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      const oldConfig = readFileSync(join(f.root, 'app.json'), 'utf8');
      writeFileSync(join(f.root, 'app.json'), '{"expo":{"version":"0.4.1","runtimeVersion":"2"}}');
      f.git('add', 'app.json'); f.git('commit', '-qm', 'New main runtime');
      const cwd = join(f.base, `prata-raja-${f.name}`);
      execFileSync('git', ['merge', '--no-edit', 'main'], { cwd, env: f.env });
      writeFileSync(join(cwd, 'app.json'), oldConfig);
      execFileSync('git', ['add', 'app.json'], { cwd, env: f.env });
      execFileSync('git', ['commit', '-qm', 'Revert runtime to slice base'], { cwd, env: f.env });
      const path = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(path, 'utf8'));
      result.head = f.git('rev-parse', `sol/${f.name}`);
      writeFileSync(path, JSON.stringify(result));
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1);
      expect(release.stderr).toContain('Runtime changed; use the documented --apk --cloud path');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
    } finally { f.close(); }
  });
  it('rejects stale or failed slice reports before merging or shipping', () => {
    const f = fixture();
    try {
      const slice = f.call('slice', f.name, join(f.base, 'brief.md'));
      expect(slice.status, slice.stderr + readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toBe(0);
      const path = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(path, 'utf8'));
      for (const altered of [{ ...result, head: 'stale' }, { ...result, ok: false }, { ...result, cwd: f.root }]) {
        writeFileSync(path, JSON.stringify(altered));
        const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
        expect(release.status).toBe(1); expect(release.stderr).toContain('Missing/stale/failed');
        expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
        expect(f.git('rev-parse', 'HEAD')).toBe(result.base);
      }
    } finally { f.close(); }
  });
  it('exits nonzero after one fix round when P1 remains; merged failures never ship', () => {
    const f = fixture();
    try {
      Object.assign(f.env, { PIPELINE_OPEN_P1: '1' });
      const slice = f.call('slice', f.name, join(f.base, 'brief.md'));
      expect(slice.status).toBe(1);
      const resultPath = join(f.report, 'result.json');
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(result.ok).toBe(false); expect(result.findings[0].priority).toBe('P1');
      // Simulate a cleared report, then a new integration check failure.
      writeFileSync(resultPath, JSON.stringify({ ...result, ok: true, findings: [] }));
      const reportPath = join(f.report, 'REPORT.md');
      writeFileSync(reportPath, readFileSync(reportPath, 'utf8').replace('Result: FAIL', 'Result: PASS'));
      Object.assign(f.env, { PIPELINE_CHECK_FAIL: '1', PIPELINE_OPEN_P1: '' });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1); expect(release.stderr).toContain('Merged checks failed');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
      expect(existsSync(join(f.base, `prata-raja-${f.name}`))).toBe(true);
    } finally { f.close(); }
  });
  it('does not stamp or ship when akit check fails', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      Object.assign(f.env, { PIPELINE_AKIT_FAIL: '1' });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1);
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(false);
      expect(existsSync(join(f.root, `.akit/reviewed-${f.git('rev-parse', 'HEAD')}`))).toBe(false);
    } finally { f.close(); }
  });
  it('can retry after failed checks with only the release version bump in the lockfile', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      Object.assign(f.env, { PIPELINE_AKIT_FAIL: '1' });
      expect(f.call('release', 'Test', '--branch', `sol/${f.name}`).status).toBe(1);
      Object.assign(f.env, { PIPELINE_AKIT_FAIL: '' });
      const retry = f.call('release', 'Retry', '--branch', `sol/${f.name}`);
      expect(retry.status, retry.stderr + retry.stdout).toBe(0);
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(true);
    } finally { f.close(); }
  });
  it('preserves worktrees and logs when Pages verification fails after shipping', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      Object.assign(f.env, { PIPELINE_PAGES_FAIL: '1' });
      const release = f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(release.status).toBe(1); expect(release.stderr).toContain('Pages unavailable');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(true);
      expect(existsSync(join(f.base, `prata-raja-${f.name}`))).toBe(true);
      expect(existsSync(join(f.report, 'check.log'))).toBe(true);
    } finally { f.close(); }
  });

  it.each(['slice', 'release'])('fails %s when its push is rejected and preserves evidence', (phase) => {
    const f = fixture();
    try {
      if (phase === 'release') expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(0);
      writeFileSync(join(f.base, 'origin.git/hooks/pre-receive'), '#!/bin/sh\necho "Push rejected" >&2\nexit 1\n', { mode: 0o755 });
      const result = phase === 'slice'
        ? f.call('slice', f.name, join(f.base, 'brief.md'))
        : f.call('release', 'Test', '--branch', `sol/${f.name}`);
      expect(result.status).toBe(1);
      const dir = phase === 'slice' ? f.report : join(f.base, 'slices', readdirSync(join(f.base, 'slices')).find((name) => name.startsWith('release-'))!);
      expect(readFileSync(join(dir, 'REPORT.md'), 'utf8')).toContain('Push rejected');
      expect(existsSync(join(f.base, `prata-raja-${f.name}`))).toBe(true);
      if (phase === 'slice') {
        expect(JSON.parse(readFileSync(join(f.report, 'result.json'), 'utf8')).ok).toBe(false);
        expect(f.git('ls-remote', 'origin')).toBe('');
      } else {
        expect(existsSync(join(f.root, '.akit/shipped'))).toBe(true);
        expect(f.git('ls-remote', 'origin', 'main')).toBe('');
      }
    } finally { f.close(); }
  });

  it.each([
    ['PIPELINE_CI_SUCCESS', 'completed / success'],
    ['PIPELINE_CI_SLOW', 'completed / failure'],
    ['PIPELINE_CI_STALE', 'no run for verified HEAD'],
    ['PIPELINE_CI_MISSING', 'no run for verified HEAD'],
    ['PIPELINE_CI_UNAVAILABLE', 'lookup unavailable'],
  ])('reports %s without blocking a green slice', (flag, expected) => {
    const f = fixture();
    try {
      Object.assign(f.env, { [flag]: '1' });
      const slice = f.call('slice', f.name, join(f.base, 'brief.md'));
      expect(slice.status, slice.stderr + slice.stdout).toBe(0);
      const report = readFileSync(join(f.report, 'REPORT.md'), 'utf8');
      expect(report).toContain(expected);
      expect(report).not.toContain('CI refused by account billing');
    } finally { f.close(); }
  });

  it('stops after four capacity retries and writes a failed report', () => {
    const f = fixture();
    try {
      const counter = join(f.base, 'attempts');
      Object.assign(f.env, { PIPELINE_CAPACITY_FILE: counter });
      expect(f.call('slice', f.name, join(f.base, 'brief.md')).status).toBe(1);
      expect(readFileSync(counter, 'utf8')).toBe('5');
      expect(readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toContain('Result: FAIL');
      expect(existsSync(join(f.report, 'build-4.log'))).toBe(true);
    } finally { f.close(); }
  });
});
