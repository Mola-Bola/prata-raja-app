#!/usr/bin/env node
// Publishes an Android APK to the cloud 'updates' storage bucket (public) and points the app's
// "New Prata Raja version → Download" banner at it (app_config.native_latest, served by the `updates` function).
// Prata Raja's APKs are NOT hosted on GitHub: the bucket is the only public place.
//   node scripts/release-apk.mjs --label 1.0.0 --apk path/to/app-release.apk --notes "…" [--runtime 1]
// Called by ship-cloud.mjs --apk; runnable on its own to (re)publish an existing APK.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { cloudEnv } from './cloud-env.mjs';

const ROOT = join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const label = flag('label');
const apk = flag('apk');
const notes = flag('notes');
if (!label || !apk || !notes) throw new Error('usage: --label <x.y.z> --apk <file> --notes "…" [--runtime N]');
const runtime = flag('runtime') ?? JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.runtimeVersion;

const env = cloudEnv(ROOT); // refuses unless .env.cloud is this app's own project (akit.json projectRef)
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const path = `apk/prata-raja-${label}.apk`;
const body = readFileSync(apk);
const up = await db.storage.from('updates').upload(path, body, { contentType: 'application/vnd.android.package-archive', upsert: true, cacheControl: '3600' });
if (up.error) throw new Error(`upload failed (${body.length} bytes): ${up.error.message}`);
const apkUrl = `${env.SUPABASE_URL}/storage/v1/object/public/updates/${path}`;

const nativeLatest = { runtimeVersion: String(runtime), version: label, apkUrl, notes, createdAt: new Date().toISOString() };
const { error } = await db.from('app_config').upsert({ key: 'native_latest', value: JSON.stringify(nativeLatest) });
if (error) throw new Error(error.message);
console.log(`APK ${label} (runtime ${runtime}, ${(body.length / 1048576).toFixed(1)} MB) → ${apkUrl}`);
