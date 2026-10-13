import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve('scripts/fleet.mjs');
const roots: string[] = [];
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'fleet-test-'));
  roots.push(root);
  execFileSync('git', ['init', '-q', root]);
  return root;
}
function cli(root: string, ...args: string[]) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' }));
}
function add(root: string, owned: string[], dependsOn: number[] = []) {
  const file = join(root, 'task.json');
  writeFileSync(file, JSON.stringify({ source: 'test', intent: 'Build a slice', brief: 'Implement the contract', owned, dependsOn }));
  return cli(root, 'add', file);
}
function claim(root: string, worker: string): Promise<any> {
  return new Promise((resolveResult, reject) => {
    const p = spawn(process.execPath, [script, 'claim', worker], { cwd: root });
    let out = '', err = '';
    p.stdout.on('data', x => { out += x; });
    p.stderr.on('data', x => { err += x; });
    p.on('error', reject);
    p.on('exit', code => code === 0 ? resolveResult(JSON.parse(out)) : reject(new Error(err)));
  });
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
describe('fleet ledger', () => {
  it('serializes racing claims and keeps directory ownership until integration', async () => {
    const root = repo();
    const first = add(root, ['src/core']);
    add(root, ['src/core/game.ts']);
    const claims = await Promise.all(Array.from({ length: 6 }, (_, n) => claim(root, `worker-${n}`)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean).id).toBe(first.id);
    cli(root, 'status', String(first.id), 'ready');
    expect(cli(root, 'claim', 'other')).toBeNull();
    cli(root, 'status', String(first.id), 'failed', 'Checks failed');
    expect(cli(root, 'claim', 'other')).toBeNull();
    cli(root, 'status', String(first.id), 'shipped', 'Lead integrated');
    expect(cli(root, 'claim', 'other').id).toBe(2);
    expect(readFileSync(join(root, 'docs/LEDGER.md'), 'utf8')).toContain('Lead integrated');
  });
  it('blocks dependencies and rejects path escapes and unknown dependencies', () => {
    const root = repo();
    const first = add(root, ['src/a.ts']);
    add(root, ['src/b.ts'], [first.id]);
    cli(root, 'claim', 'one');
    expect(cli(root, 'claim', 'two')).toBeNull();
    cli(root, 'status', '1', 'verified');
    expect(cli(root, 'claim', 'two').id).toBe(2);
    expect(() => add(root, ['../escape'])).toThrow();
    expect(() => add(root, ['src/**'])).toThrow();
    expect(() => add(root, ['src/c.ts'], [99])).toThrow();
    expect(() => cli(root, 'status', '1', 'open', 'undo')).toThrow();
  });
  it('runs bounded slices with unique ports and preserves failed ownership', async () => {
    const root = repo();
    mkdirSync(join(root, 'scripts'));
    writeFileSync(join(root, 'scripts/slice.sh'), '#!/bin/bash\nprintf "%s %s\\n" "$1" "$PORT" >> invocations\nexit 7\n');
    add(root, ['src/a.ts']);
    add(root, ['src/b.ts']);
    add(root, ['src/c.ts']);
    const code = `import { workers } from ${JSON.stringify('file://' + script)}; console.log(JSON.stringify(await workers(${JSON.stringify(root)}, {count:2,maxTasks:3,timeoutMs:2000})));`;
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(out).flat()).toHaveLength(2);
    expect(cli(root, 'list').map((r: any) => r.status)).toEqual(['failed', 'failed', 'open']);
    const calls = readFileSync(join(root, 'invocations'), 'utf8').trim().split('\n');
    expect(calls).toHaveLength(2);
    expect(new Set(calls.map(line => line.split(' ')[1])).size).toBe(2);
    expect(cli(root, 'list')[0].result.code).toBe(7);
  });
  it('lets release writes defer the tracked snapshot until explicit render', () => {
    const root = repo();
    add(root, ['src/a.ts']);
    const before = readFileSync(join(root, 'docs/LEDGER.md'), 'utf8');
    const code = `import { openLedger } from ${JSON.stringify('file://' + script)}; const db=openLedger(${JSON.stringify(root)}, {render:false}); db.status(1,'verified',{note:'release verified'}); db.close();`;
    execFileSync(process.execPath, ['--input-type=module', '-e', code]);
    expect(readFileSync(join(root, 'docs/LEDGER.md'), 'utf8')).toBe(before);
    expect(cli(root, 'list')[0].status).toBe('verified');
    cli(root, 'render');
    expect(readFileSync(join(root, 'docs/LEDGER.md'), 'utf8')).toContain('release verified');
  });
  it('rejects changes outside the claimed paths in a pinned slice result', () => {
    const root = repo();
    const commit = () => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qam', 'Change'], {cwd:root});
    writeFileSync(join(root, 'owned.txt'), 'before');
    execFileSync('git', ['add', '.'], {cwd:root}); commit();
    const base = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
    const name = `test-${Date.now()}`;
    const worktree = join(root, '..', `prata-raja-${name}`); roots.push(worktree);
    execFileSync('git', ['worktree', 'add', '-qb', `sol/${name}`, worktree], {cwd:root});
    writeFileSync(join(worktree, 'outside.txt'), 'unowned');
    execFileSync('git', ['add', '.'], {cwd:worktree});
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Outside'], {cwd:worktree});
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:worktree,encoding:'utf8'}).trim();
    const report = join(root, 'result.json');
    writeFileSync(report, JSON.stringify({ok:true, name, branch:`sol/${name}`, cwd:worktree, base, head}));
    const code = `import { validateResult } from ${JSON.stringify('file://' + script)}; validateResult(${JSON.stringify(root)}, {owned:['owned.txt']}, ${JSON.stringify(name)}, ${JSON.stringify(report)});`;
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', code], {stdio:'pipe'})).toThrow();
    const allowed = code.replace("owned:['owned.txt']", "owned:['outside.txt']");
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', allowed], {stdio:'pipe'})).not.toThrow();
  });
  it('shares state across worktrees and dry run does not claim', () => {
    const root = repo();
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-qm', 'Initial'], { cwd: root });
    const worktree = `${root}-linked`;
    roots.push(worktree);
    execFileSync('git', ['worktree', 'add', '-qb', 'worker', worktree], { cwd: root });
    add(root, ['src/a.ts']);
    expect(cli(worktree, 'list')).toHaveLength(1);
    expect(cli(worktree, 'workers', '3', '--dry-run')).toHaveLength(1);
    expect(cli(root, 'list')[0].status).toBe('open');
    expect(cli(worktree, 'claim', 'linked').id).toBe(1);
    expect(cli(root, 'claim', 'main')).toBeNull();
  });
});
