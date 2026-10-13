import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

it('durable verifier refuses unshipped jobs, pins commits and files failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'fleet-verify-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'node_modules'));
    mkdirSync(join(root, '.git-fixture-bin'));
    writeFileSync(join(root, '.git-fixture-bin/npx'), '#!/bin/sh\ntest "$VERIFIER_PASS" = 1\n', { mode: 0o755 });
    cpSync(resolve('scripts/verify-fleet.mjs'), join(root, 'scripts/verify-fleet.mjs'));
    writeFileSync(join(root, '.gitignore'), 'node_modules\n');
    writeFileSync(join(root, 'scripts/pipeline.mjs'), `export async function checks(){return process.env.VERIFIER_PASS === '1'} export async function review(){return process.env.VERIFIER_PASS === '1' ? [] : [{priority:'P1',detail:'a regression'}]}`);
    writeFileSync(join(root, 'scripts/fleet.mjs'), `import {appendFileSync} from 'node:fs'; export function openLedger(root){return {addClaimed(row){appendFileSync(root+'/.git/ledger.log',JSON.stringify(row)+'\\n');return {id:1}},status(...args){appendFileSync(root+'/.git/ledger.log',JSON.stringify(args)+'\\n')},close(){}}}`);
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '-q'); git('add', '-A'); git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture');
    const head = git('rev-parse', 'HEAD');
    const queue = spawnSync(process.execPath, ['--input-type=module', '-e', `import {queueVerification} from './scripts/verify-fleet.mjs'; console.log(JSON.stringify(await queueVerification(process.cwd(),{base:'${head}',head:'${head}',label:'0.4.3'})))`], { cwd: root, encoding: 'utf8' });
    expect(queue.status, queue.stderr).toBe(0);
    const job = JSON.parse(queue.stdout);
    const dir = join(root, '.git/fleet-verifications', job.id);
    const call = (pass = false) => spawnSync(process.execPath, ['scripts/verify-fleet.mjs','run',job.id], { cwd: root, encoding:'utf8', env: {...process.env, PATH:join(root,'.git-fixture-bin')+':/usr/bin:/bin', VERIFIER_PASS: pass ? '1' : '0'} });
    expect(call().stderr).toContain('Ship not confirmed');
    job.shippedAt = new Date().toISOString();
    writeFileSync(join(dir, 'job.json'), JSON.stringify(job));
    const run = call();
    expect(run.status, run.stderr).toBe(1);
    const result = JSON.parse(readFileSync(join(dir,'result.json'),'utf8'));
    expect(result.head).toBe(head);
    expect(result.web).toBe(false);
    expect(result.balance).toBe(false);
    expect(result.findings[0].priority).toBe('P1');
    expect(readFileSync(join(root,'.git/ledger.log'),'utf8')).toContain('Investigate release');
    expect(existsSync(join(dir, 'running'))).toBe(false);
    expect(git('status','--porcelain')).toBe('');
    expect(call(true).status).toBe(0);
    expect(JSON.parse(readFileSync(join(dir,'job.json'),'utf8')).status).toBe('verified');
    expect(existsSync(join(dir,'worktree-2'))).toBe(false);
    expect(existsSync(join(dir,'worktree-1'))).toBe(true);
  } finally { rmSync(root, { recursive:true, force:true }); }
}, 60000);
