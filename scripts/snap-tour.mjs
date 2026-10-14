#!/usr/bin/env node
// Visual check-in: visits chosen points of the game with the bot (hitless via god=1), screenshots each, prints a balance table,
// and writes one labelled contact sheet JPEG. Usage: npm run snap -- [--local] [--url <play url>] [--random N] [--seed N] [--wait ms]
// Needs the ?chapter / ?at / ?god switches in the build (a live site older than that ignores them: the sheet shows the start).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = join(import.meta.dirname, '..');
const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const local = process.argv.includes('--local');
const seed = Number(arg('seed', Math.floor(Math.random() * 1e6)));
const wait = Number(arg('wait', 6000));
const random = Number(arg('random', 0));
// Chapters mirror src/content/chapters.ts (id, bossAt).
const CHAPTERS = [['kopitiam-street', 1200], ['hawker-night', 1200]];
let s = seed || 1;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

let stops = [];
if (random > 0) {
  for (let i = 0; i < random; i++) {
    const [id, boss] = CHAPTERS[Math.floor(rnd() * CHAPTERS.length)];
    stops.push({ chapter: id, at: Math.round(rnd() * boss * 0.98) });
  }
} else {
  for (const [id, boss] of CHAPTERS) {
    for (const f of [0.15, 0.5, 0.85, 1]) stops.push({ chapter: id, at: Math.round(Math.min(boss, boss * (f + (f === 1 ? 0 : (rnd() - 0.5) * 0.2)))) });
  }
}
console.log(`seed ${seed}, ${stops.length} stops`);

let server;
let base = arg('url', 'https://mola-bola.github.io/prata-raja/play');
if (local) {
  console.log('exporting web build…');
  // The export needs the .env values (never printed); a worktree has none, so fall back to the main checkout's.
  const envFile = [join(ROOT, '.env'), join(ROOT, '../../../.env')].find(existsSync);
  const env = { ...process.env };
  for (const l of envFile ? readFileSync(envFile, 'utf8').split('\n') : []) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  execFileSync('npx', ['expo', 'export', '-p', 'web', '--clear'], { cwd: ROOT, stdio: 'ignore', env });
  server = spawn('node', ['scripts/serve-web.mjs', '8199'], { cwd: ROOT, stdio: 'ignore' }); // (killed in finally)
  await new Promise((r) => setTimeout(r, 800));
  base = 'http://localhost:8199/play';
}

const browser = await chromium.launch();
const out = join('/private/tmp/claude-501/snap-tour');
mkdirSync(out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const cells = [];
try {
  for (const [i, st] of stops.entries()) {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.goto(`${base}?bot=1&test=1&god=1&seed=${seed + i}&chapter=${st.chapter}&at=${st.at}`, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    const stat = await page.evaluate(() => {
      const w = window.__world;
      return w ? { alive: w.enemies.filter((e) => e.state !== 'dead').length, hp: Math.round(w.player.hp), maxHp: Math.round(w.player.stats.maxHp), dist: Math.round(w.dist), kills: w.kills, time: +w.time.toFixed(1), level: w.player.level, phase: w.phase } : null;
    });
    const img = (await page.screenshot({ type: 'jpeg', quality: 70 })).toString('base64');
    cells.push({ img, label: `${st.chapter} @${st.at}m`, stat });
    await page.context().close();
  }
} finally {
  await browser.close();
  server?.kill();
}

console.log('\nstop'.padEnd(26) + 'dist  alive  hp      kills  kills/s  lvl  phase');
cells.forEach((c) => {
  const t = c.stat;
  console.log(c.label.padEnd(25) + (t ? `${String(t.dist).padEnd(6)}${String(t.alive).padEnd(7)}${`${t.hp}/${t.maxHp}`.padEnd(8)}${String(t.kills).padEnd(7)}${(t.kills / Math.max(1, t.time)).toFixed(2).padEnd(9)}${String(t.level).padEnd(5)}${t.phase}` : 'no world'));
});

const html = `<body style="margin:0;background:#222;font:14px sans-serif;color:#fff"><div style="display:grid;grid-template-columns:repeat(${Math.min(4, cells.length)},390px);gap:6px;padding:6px;width:max-content">${cells
  .map((c) => `<div><img src="data:image/jpeg;base64,${c.img}" width=390 height=844><div style="padding:3px">${c.label}${c.stat ? ` · ${c.stat.alive} alive · hp ${c.stat.hp}` : ''}</div></div>`)
  .join('')}</div></body>`;
const b2 = await chromium.launch();
const sheet = await b2.newPage({ viewport: { width: Math.min(4, cells.length) * 396 + 6, height: 600 } });
await sheet.setContent(html);
const file = join(out, `${stamp}.jpg`);
await sheet.screenshot({ path: file, type: 'jpeg', quality: 80, fullPage: true });
await b2.close();
console.log(`\nsheet: ${file}`);
