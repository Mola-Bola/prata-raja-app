#!/usr/bin/env node
// Builds the production web app (cloud backend, base path /prata-raja) and publishes it to GitHub Pages:
// https://mola-bola.github.io/prata-raja/ — repo Mola-Bola/prata-raja holds ONLY the built files (no source, no secrets).
// The source repo (~/prata-raja, private Mola-Bola/prata-raja-app) is never pushed anywhere by this script.
// Usage: node scripts/publish-web.mjs [--label 1.0.1]
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { retainWebChunks } from './retain-web-chunks.mjs';
import { addPwaTags } from './web-pwa.mjs';

const ROOT = join(import.meta.dirname, '..');
const BUILD = join(ROOT, '.pages-build');
const REPO_DIR = join(ROOT, '.pages-repo');
const REPO = 'Mola-Bola/prata-raja';
const URL = 'https://mola-bola.github.io/prata-raja/';
const label = process.argv.includes('--label') ? process.argv[process.argv.indexOf('--label') + 1] : new Date().toISOString().slice(0, 16);

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', ...opts });
const ok = (cmd, args, opts = {}) => {
  try {
    run(cmd, args, opts);
    return true;
  } catch {
    return false;
  }
};

// The web build must know its own address (auth e-mail links are built from it).
const prodEnv = readFileSync(join(ROOT, '.env.production'), 'utf8');
const webUrl = prodEnv.match(/^EXPO_PUBLIC_WEB_URL=(\S+)/m)?.[1];
if (webUrl !== URL.replace(/\/$/, '')) throw new Error(`.env.production EXPO_PUBLIC_WEB_URL must be ${URL.replace(/\/$/, '')} (found ${webUrl ?? 'nothing'}); refusing to publish.`);

// 1. Build (NODE_ENV=production → .env.production → cloud Supabase; PRATA_RAJA_WEB_BASE → app.config.js baseUrl).
rmSync(BUILD, { recursive: true, force: true });
// Private per-checkout Metro cache (the shared one has served another checkout's route files, see ship-cloud.mjs); kept between ships so exports stay warm.
function metroTmp() { const d = join(ROOT, '.fleet', 'metro-tmp'); mkdirSync(d, { recursive: true }); return d; }
run('npx', ['expo', 'export', '-p', 'web', '--output-dir', BUILD], { env: { ...process.env, PRATA_RAJA_WEB_BASE: '/prata-raja', CI: '1', TMPDIR: metroTmp() }, stdio: 'inherit' });
// Production = the cloud's publishable key and not the Mac's test server (the cloud URL alone proves nothing: every
// bundle embeds the updates URL, which is on the same host).
const prodKey = prodEnv.match(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(\S+)/)?.[1];
const localApi = readFileSync(join(ROOT, '.env'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_URL=https?:\/\/(\S+)/)?.[1];
const jsDir = join(BUILD, '_expo', 'static', 'js', 'web');
const js = readdirSync(jsDir).map((f) => readFileSync(join(jsDir, f), 'utf8')).join('');
if (!prodKey || !js.includes(prodKey) || (localApi && js.includes(localApi))) throw new Error('Web bundle is not the production build (.env.production); refusing to publish.');
if (!js.includes(URL.replace(/\/$/, ''))) throw new Error(`Web bundle does not carry ${URL.replace(/\/$/, '')}; refusing to publish.`);
addPwaTags(BUILD, '/prata-raja', URL); // installable (manifest + Apple touch icon), offline list, link previews (Open Graph)
copyFileSync(join(BUILD, 'index.html'), join(BUILD, '404.html')); // SPA fallback: /prata-raja/play etc.
writeFileSync(join(BUILD, '.nojekyll'), '');
if (existsSync(join(ROOT, 'LICENSE'))) copyFileSync(join(ROOT, 'LICENSE'), join(BUILD, 'LICENSE')); // the Pages repo is wiped on each publish; keep the notice

// 2. Repo (create once).
if (!existsSync(join(REPO_DIR, '.git'))) {
  if (!ok('gh', ['repo', 'view', REPO])) {
    run('gh', ['repo', 'create', REPO, '--public', '--description', 'Prata Raja web app (built files only)']);
  }
  mkdirSync(REPO_DIR, { recursive: true });
  if (!ok('git', ['clone', `https://github.com/${REPO}.git`, REPO_DIR])) {
    run('git', ['init', '-b', 'main'], { cwd: REPO_DIR });
    run('git', ['remote', 'add', 'origin', `https://github.com/${REPO}.git`], { cwd: REPO_DIR });
  }
}

// Another checkout may have published since this copy was cloned: start from the remote's main, or the push is rejected.
if (ok('git', ['fetch', '-q', 'origin', 'main'], { cwd: REPO_DIR })) ok('git', ['reset', '-q', '--hard', 'origin/main'], { cwd: REPO_DIR });

retainWebChunks(BUILD, REPO_DIR);

// 3. Replace contents, commit, push (to the PUBLIC built-files repo only).
for (const f of readdirSync(REPO_DIR)) if (f !== '.git') rmSync(join(REPO_DIR, f), { recursive: true, force: true });
cpSync(BUILD, REPO_DIR, { recursive: true });
run('git', ['add', '-A'], { cwd: REPO_DIR });
if (ok('git', ['diff', '--cached', '--quiet'], { cwd: REPO_DIR })) {
  console.log('Web unchanged; nothing to publish.');
} else {
  run('git', ['commit', '-m', `Publish Prata Raja web ${label}`], { cwd: REPO_DIR });
  run('git', ['push', '-u', 'origin', 'HEAD:main'], { cwd: REPO_DIR, stdio: 'inherit' });
}

// 4. Pages on (first time only).
if (!ok('gh', ['api', `repos/${REPO}/pages`])) {
  run('gh', ['api', '-X', 'POST', `repos/${REPO}/pages`, '-f', 'source[branch]=main', '-f', 'source[path]=/']);
}
console.log(`Published web ${label} → ${URL} (GitHub Pages can take a minute to refresh)`);
