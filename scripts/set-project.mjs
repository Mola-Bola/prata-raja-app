#!/usr/bin/env node
// Point this app at its Supabase cloud project once one exists (the project is created by the owner: it costs money).
//   node scripts/set-project.mjs <project-ref>
// Writes the ref into akit.json (projectRef) and into app.json (updates.url, and turns over-the-air updates on).
// It does not touch any .env file: put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.cloud yourself (docs/UPDATES.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ref = process.argv[2];
if (!/^[a-z0-9]{20}$/.test(ref ?? '')) {
  console.error('usage: node scripts/set-project.mjs <project-ref>   (the 20 lowercase letters/digits in https://<ref>.supabase.co)');
  process.exit(2);
}
const root = join(import.meta.dirname, '..');
const edit = (file, fn) => {
  const path = join(root, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  fn(json);
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
};
edit('akit.json', (a) => {
  a.projectRef = ref;
});
edit('app.json', (a) => {
  a.expo.updates = { ...a.expo.updates, url: `https://${ref}.supabase.co/functions/v1/updates`, enabled: true };
});
console.log(`akit.json projectRef and app.json updates.url now use ${ref}. Over-the-air updates are on: changing native code needs a runtimeVersion bump. For cloud APKs, copy the three EXPO_PUBLIC_* values from .env.production into eas.json build.apk.env (eas-apk.mjs refuses a build whose key differs).`);
