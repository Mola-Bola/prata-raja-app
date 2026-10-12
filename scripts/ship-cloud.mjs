#!/usr/bin/env node
// Ship to PRODUCTION (cloud): phones anywhere get the update over the air; the web app on GitHub Pages is republished
// (https://mola-bola.github.io/prata-raja/, built files only, see scripts/publish-web.mjs).
//   node scripts/ship-cloud.mjs --notes "What changed, in plain words" [--ids a,b] [--label 1.0.1] [--apk [--cloud [--eas-build <id>]] [--reuse-apk]] [--no-web]
// JS-only changes: default. Native changes (new native module/permission/plugin/icon): bump expo.runtimeVersion, then
// ship with --apk --cloud (the signed APK is built on EAS, uploaded to the cloud 'updates' bucket and Firebase App
// Distribution; the app then says "New Prata Raja version → Download"). Needs ~/prata-raja/.env.cloud (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY), .env.production (baked into bundles) and the release key (EAS holds it; the local copy is in
// ~/.prata-raja-secrets, see docs/UPDATES.md).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { cloudEnv } from './cloud-env.mjs';
import { contentTypeFor, updateIdFor } from './updates-server.mjs';

const ROOT = join(import.meta.dirname, '..');
// Where a finished APK is also copied for the owner (optional): akit.json "apkDir", or APK_DIR. Without it the APK stays in
// android/app/build/outputs/apk/release/ and in the cloud 'updates' bucket.
const AKIT = existsSync(join(ROOT, 'akit.json')) ? JSON.parse(readFileSync(join(ROOT, 'akit.json'), 'utf8')) : {};
const APK_DIR = (process.env.APK_DIR || AKIT.apkDir || '').replace(/^~(?=\/|$)/, process.env.HOME ?? '');
const args = process.argv.slice(2);
const flag = (n) => (args.includes(`--${n}`) ? (args[args.indexOf(`--${n}`) + 1] ?? 'true') : undefined);
const has = (n) => args.includes(`--${n}`);
const notes = flag('notes');
if (!notes || notes.startsWith('--')) throw new Error('--notes "…" is required');
const ids = (flag('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: ROOT, stdio: 'inherit', ...opts });
// Builds use a private Metro cache: the shared one in $TMPDIR has served another checkout's route files (worktrees
// share node_modules), which would ship the wrong screens.
const BUILD_ENV = { CI: '1', TMPDIR: mkdtempSync(join(tmpdir(), 'prata-raja-ship-')) };

// A bundle is for production when it carries the cloud's publishable key and not the Mac's test server. (Checking for
// the cloud URL alone proves nothing: every bundle embeds the updates URL, which is on the same host.)
const PROD_KEY = readFileSync(join(ROOT, '.env.production'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(\S+)/)?.[1];
const LOCAL_API = readFileSync(join(ROOT, '.env'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_URL=https?:\/\/(\S+)/)?.[1];
function assertCloudBundle(buf, what) {
  if (!PROD_KEY || !buf.includes(Buffer.from(PROD_KEY))) throw new Error(`${what} doesn't carry the production key (.env.production); not shipping`);
  if (LOCAL_API && buf.includes(Buffer.from(LOCAL_API))) throw new Error(`${what} points at the Mac's test server (${LOCAL_API}); not shipping`);
}

const env = cloudEnv(ROOT); // refuses unless .env.cloud is this app's own project (akit.json projectRef)
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
// Supabase calls retry a few times on network blips ("fetch failed"), which otherwise waste a 20-minute APK build.
async function net(call, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await call();
      if (res.error && /fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(res.error.message ?? '') && i < tries) throw res.error;
      return must(res);
    } catch (e) {
      if (i >= tries || !/fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(String(e?.message ?? e))) throw e;
      console.log(`  network blip (${e?.message ?? e}); retrying in ${i * 3}s…`);
      await new Promise((r) => setTimeout(r, i * 3000));
    }
  }
}

const appJsonPath = join(ROOT, 'app.json');
let appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const runtime = appJson.expo.runtimeVersion;
if (typeof runtime !== 'string') throw new Error('expo.runtimeVersion must be a plain string');

// Label: bump the patch of the newest cloud release (or start from app.json version).
async function nextLabel() {
  if (flag('label')) return flag('label');
  const rows = await net(() => db.from('releases').select('label').order('created_at', { ascending: false }).limit(20));
  const semver = rows.map((r) => r.label).filter((l) => /^\d+\.\d+\.\d+$/.test(l));
  const base = appJson.expo.version;
  if (!semver.length) return base;
  const top = semver.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  const [ma, mi, pa] = top.split('.').map(Number);
  const [bma, bmi] = base.split('.').map(Number);
  return bma > ma || (bma === ma && bmi > mi) ? base : `${ma}.${mi}.${pa + 1}`;
}
const label = await nextLabel();
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const kind = has('apk') ? 'apk' : 'ota';

// 1. Native build first (it may bump versionCode), so a failed build ships nothing.
//    --reuse-apk ships the APK already built by an earlier run that failed later (e.g. a network blip while uploading),
//    without bumping versionCode or rebuilding.
// --cloud builds the APK on EAS (Expo's servers, eas.json profile "apk", signed with the release key held in EAS
// credentials) instead of Gradle on the Mac; --eas-build <id> downloads a build an earlier run already started.
// After the APK ships it also goes to Firebase App Distribution (group "family") when ~/.cell/firebase-sa.json exists.
// Both helpers live in ~/cell/scripts (see ~/cell/docs/TOOLING.md).
const CELL_SCRIPTS = join(process.env.HOME ?? '', 'cell', 'scripts');
const APK_FILE = join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
if (has('apk') && !has('reuse-apk')) {
  // versionCode goes up with every APK after the first (Android refuses to install a lower or equal one over it).
  const priorApks = await net(() => db.from('releases').select('id').eq('kind', 'apk').limit(1));
  if (priorApks.length && !flag('eas-build')) {
    appJson.expo.android.versionCode = (appJson.expo.android.versionCode ?? 1) + 1;
    writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
  }
  if (has('cloud')) {
    run('node', [join(CELL_SCRIPTS, 'eas-apk.mjs'), '--root', ROOT, '--out', APK_FILE, '--message', label, ...(flag('eas-build') ? ['--build-id', flag('eas-build')] : [])]);
  } else {
    run('npx', ['expo', 'prebuild', '-p', 'android', '--no-install', '--clean'], { env: { ...process.env, CI: '1' } });
    // A Gradle daemon started by a local test build still carries that shell's .env (the Mac's Supabase): stop it.
    run('./gradlew', ['--stop'], { cwd: join(ROOT, 'android') });
    run('./gradlew', ['assembleRelease', '--max-workers=6'], { cwd: join(ROOT, 'android'), env: { ...process.env, ...BUILD_ENV } });
  }
}
if (has('apk')) {
  const embedded = execFileSync('unzip', ['-p', APK_FILE, 'assets/index.android.bundle'], { maxBuffer: 1 << 30 });
  assertCloudBundle(embedded, 'The APK');
  appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
}

// 2. Export the Android update with production env and upload it to the public 'updates' bucket.
const out = join(ROOT, '.cloud-staging', stamp);
rmSync(out, { recursive: true, force: true });
run('npx', ['expo', 'export', '-p', 'android', '--clear', '--output-dir', out], { env: { ...process.env, ...BUILD_ENV } });
const cfgRaw = execFileSync('npx', ['expo', 'config', '--json', '--type', 'public'], { cwd: ROOT, encoding: 'utf8' });
const expoClient = JSON.parse(cfgRaw.slice(cfgRaw.indexOf('{')));
const metadataJson = readFileSync(join(out, 'metadata.json'));
const files = JSON.parse(metadataJson).fileMetadata.android;
const bundleText = readFileSync(join(out, files.bundle));
assertCloudBundle(bundleText, 'The update bundle');

const prefix = `${runtime}/${stamp}`;
const publicUrl = (p) => `${env.SUPABASE_URL}/storage/v1/object/public/updates/${prefix}/${p}`;
async function upload(relPath, contentType) {
  const buf = readFileSync(join(out, relPath));
  await net(() => db.storage.from('updates').upload(`${prefix}/${relPath}`, buf, { contentType, upsert: true, cacheControl: '31536000' }));
  return {
    hash: createHash('sha256').update(buf).digest('base64url'),
    key: createHash('md5').update(buf).digest('hex'),
    contentType,
    url: publicUrl(relPath),
  };
}
const launchAsset = await upload(files.bundle, 'application/javascript');
const assets = [];
for (const a of files.assets ?? []) assets.push({ ...(await upload(a.path, contentTypeFor(a.ext))), fileExtension: `.${a.ext}` });
const manifest = {
  id: updateIdFor(metadataJson, 'android'),
  createdAt: new Date().toISOString(),
  runtimeVersion: runtime,
  launchAsset,
  assets,
  metadata: {},
  extra: { expoClient, release: { label, notes } },
};
await net(() => db.from('ota_updates').upsert({ id: manifest.id, label, runtime_version: runtime, platform: 'android', manifest }));

// 3. Native build → the owner's APK folder (if set), plus the public bucket + native_latest that older apps' "New Prata Raja version → Download" opens.
if (has('apk')) {
  const apk = join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
  if (APK_DIR) copyFileSync(apk, join(APK_DIR, `prata-raja-${label}.apk`));
  run('node', ['scripts/release-apk.mjs', '--label', label, '--apk', apk, '--runtime', runtime, '--notes', notes]);
  if (existsSync(join(process.env.HOME ?? '', '.cell', 'firebase-sa.json'))) {
    try {
      run('node', [join(CELL_SCRIPTS, 'firebase.mjs'), 'distribute', '--package', appJson.expo.android.package, '--apk', apk, '--notes', `${label}: ${notes}`]);
    } catch {
      console.log('  App Distribution upload failed (the APK is still live in the updates bucket); retry: node ~/cell/scripts/firebase.mjs distribute …');
    }
  }
}

// 4. Web (GitHub Pages).
if (!has('no-web')) run('node', ['scripts/publish-web.mjs', '--label', label]);

// 5. Record the release and close the feedback items.
run('node', ['scripts/feedback.mjs', 'record-release', '--label', label, '--kind', kind, '--runtime', runtime, '--notes', notes, ...(ids.length ? ['--ids', ids.join(',')] : [])]);
rmSync(out, { recursive: true, force: true });
console.log(`\nShipped ${label} (${kind}, runtime ${runtime}) to production.`);
console.log(`  phones: over the air on next launch/foreground${has('apk') && APK_DIR ? ` · APK copied to ${APK_DIR} as prata-raja-${label}.apk` : ''}`);
if (!has('no-web')) console.log('  web:    https://mola-bola.github.io/prata-raja/');
