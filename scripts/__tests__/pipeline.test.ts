import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chooseLabel } from '../ship-label.mjs';

const source = resolve('scripts');
function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'pipeline-test-'));
  const root = join(base, 'repo');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  for (const file of ['pipeline.mjs', 'slice.sh', 'release.sh']) cpSync(join(source, file), join(root, 'scripts', file));
  const pipeline = join(root, 'scripts/pipeline.mjs');
  writeFileSync(pipeline, readFileSync(pipeline, 'utf8')
    .replace("const store = '/private/tmp/claude-501/slices';", `const store = ${JSON.stringify(join(base, 'slices'))};`)
    .replace('setTimeout(r, ms)', 'setTimeout(r, 0)')); // Exercise retries without five-minute waits.
  mkdirSync(join(root, 'node_modules'));
  writeFileSync(join(root, '.env'), 'LOCAL_ONLY=1\n');
  writeFileSync(join(root, '.gitignore'), '.env\nnode_modules\n.akit\n.pages-repo\n');
  writeFileSync(join(root, 'app.json'), '{"expo":{"version":"0.4.1"}}');
  writeFileSync(join(root, 'package.json'), '{"version":"0.4.1"}');
  writeFileSync(join(root, 'package-lock.json'), '{"version":"0.4.1","packages":{"":{"version":"0.4.1"}}}');
  writeFileSync(join(root, 'scripts/check.sh'), `#!/bin/bash
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
if [ "$1" = check ] && [ "$PIPELINE_AKIT_FAIL" = 1 ]; then exit 1; fi
`, { mode: 0o755 });
  writeFileSync(join(bin, 'gh'), `#!/bin/bash
if [ "$PIPELINE_PAGES_FAIL" = 1 ]; then echo 'Pages unavailable' >&2; exit 1; fi
printf '{"commit":"%s","status":"built"}' "$(git -C .pages-repo rev-parse HEAD)"
`, { mode: 0o755 });
  writeFileSync(join(base, 'fetch.mjs'), `import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
net.createServer = () => ({ once() { return this; }, listen(_port, _host, cb) { cb(); }, close(cb) { cb(); } });
syncBuiltinESMExports();
globalThis.fetch = async () => ({ ok: true, text: async () => 'published\\n' });`);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, NODE_OPTIONS: `--import=${join(base, 'fetch.mjs')}`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Test', GIT_COMMITTER_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main'); git('add', '-A'); git('commit', '-qm', 'fixture');
  const name = `test-${process.pid}-${Date.now()}`;
  const report = join(base, 'slices', name);
  writeFileSync(join(base, 'brief.md'), 'Implement change; write a report.');
  const call = (script: string, ...args: string[]) => spawnSync('bash', [`scripts/${script}.sh`, ...args], { cwd: root, env, encoding: 'utf8' });
  return { base, root, name, report, git, call, env, close: () => { rmSync(base, { recursive: true, force: true }); rmSync(report, { recursive: true, force: true }); } };
}

describe('pipeline', () => {
  it('shares ship label semantics and handles numeric ordering/minor bumps', () => {
    expect(chooseLabel('0.4.1', ['0.4.9', '0.4.10', 'junk'])).toBe('0.4.11');
    expect(chooseLabel('0.5.0', ['0.4.10'])).toBe('0.5.0');
    expect(chooseLabel('0.4.1', [])).toBe('0.4.1');
    expect(chooseLabel('0.4.1', ['0.4.10'], true)).toBe('0.5.0');
  });
  it('dry runs have no writes; fixes failing checks/P1, then ships and cleans only verified slices', () => {
    const f = fixture();
    try {
      expect(f.call('slice', f.name, join(f.base, 'brief.md'), '--dry-run').status).toBe(0);
      expect(f.call('release', 'Preview', '--branch', `sol/${f.name}`, '--minor', '--dry-run').status).toBe(0);
      expect(existsSync(f.report)).toBe(false);
      expect(f.git('branch', '--list')).toBe('* main');
      const slice = f.call('slice', f.name, join(f.base, 'brief.md'));
      expect(slice.status, slice.stderr + slice.stdout + readFileSync(join(f.report, 'REPORT.md'), 'utf8')).toBe(0);
      const report = readFileSync(join(f.report, 'REPORT.md'), 'utf8');
      expect(report.trim().split('\n').length).toBeLessThanOrEqual(15);
      expect(report).toContain('Balance: ch1 60/45/20');
      expect(report).toContain('2 passed'); expect(report).toContain('3 passed');
      expect(report).toContain('no open P0/P1');
      const release = f.call('release', 'Test release', '--branch', `sol/${f.name}`);
      expect(release.status, release.stderr + release.stdout).toBe(0);
      expect(JSON.parse(readFileSync(join(f.root, 'package.json'), 'utf8')).version).toBe('0.4.2');
      expect(JSON.parse(readFileSync(join(f.root, 'package-lock.json'), 'utf8')).packages[''].version).toBe('0.4.2');
      expect(existsSync(join(f.root, '.akit/shipped'))).toBe(true);
      expect(existsSync(join(f.base, `prata-raja-${f.name}`))).toBe(false);
      expect(existsSync(join(f.report, 'REPORT.md'))).toBe(true);
      expect(existsSync(join(f.report, 'check.log'))).toBe(false);
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
      Object.assign(f.env, { PIPELINE_CHECK_FAIL: '1' });
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
