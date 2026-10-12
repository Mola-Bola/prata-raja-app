#!/usr/bin/env node
// Claude's side of "Tell Prata Raja": a thin wrapper over the shared `akit feedback` (~/cell/akit/feedback.mjs), which
// reads akit.json in this folder and talks to this app's cloud project (or the Mac's test database with --local).
//   node scripts/feedback.mjs digest | list | show <id> | plan <id> "…" | reply <id> "…" | status <id> <status> | record-release …
// Full usage: ~/cell/akit/feedback.mjs (header). Override the kit's folder with CELL_KIT.
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const kit = process.env.CELL_KIT || join(homedir(), 'cell', 'akit');
const run = spawnSync(process.execPath, [join(kit, 'feedback.mjs'), ...process.argv.slice(2)], { stdio: 'inherit', cwd: process.cwd() });
process.exit(run.status ?? 1);
