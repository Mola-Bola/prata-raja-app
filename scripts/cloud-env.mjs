// The cloud credentials the ship scripts use, with the same fail-closed rules as `akit` (~/cell/akit/target.mjs): they
// come only from this app's env file (.env.cloud), akit.json must name the project (`projectRef`), and the URL must be
// that project's own https address. So a .env.cloud copied from another app can never publish into that app's project.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readEnvFile(path) {
  const e = {};
  for (const l of readFileSync(path, 'utf8').split('\n')) {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) e[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return e;
}

/** { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, … } of this app's cloud project, or an Error("Refusing: …"). */
export function cloudEnv(root = join(import.meta.dirname, '..')) {
  const akitFile = join(root, 'akit.json');
  if (!existsSync(akitFile)) throw new Error('Refusing: no akit.json here.');
  const akit = JSON.parse(readFileSync(akitFile, 'utf8'));
  const ref = akit.projectRef;
  if (!ref) throw new Error('Refusing: akit.json has no "projectRef" yet (the cloud project is created by the owner; then run `node scripts/set-project.mjs <ref>`).');
  const file = join(root, akit.envFile ?? '.env.cloud');
  if (!existsSync(file)) throw new Error(`Refusing: ${file} is missing.`);
  const env = readEnvFile(file);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(`Refusing: ${file} must define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`);
  let u;
  try {
    u = new URL(env.SUPABASE_URL);
  } catch {
    throw new Error('Refusing: SUPABASE_URL in the env file is not a valid URL.');
  }
  if (u.protocol !== 'https:' || u.port || u.username || u.password) throw new Error('Refusing: SUPABASE_URL must be plain https with no port or credentials.');
  if (u.hostname !== `${ref}.supabase.co`) throw new Error(`Refusing: SUPABASE_URL host "${u.hostname}" is not project "${ref}" (akit.json projectRef). Nothing was changed.`);
  return env;
}
