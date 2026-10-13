import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const MANIFEST = '.static-releases.json';
const PREFIX = '_expo/static/';
function staticFiles(root) {
  const files = [];
  const walk = dir => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(relative(root, path).split('\\').join('/'));
    }
  };
  walk(join(root, PREFIX));
  return files.sort();
}
/** Retain two previous releases, using file membership rather than clone timestamps. */
export function retainWebChunks(build, previous) {
  const current = staticFiles(build);
  const manifest = join(previous, MANIFEST);
  // First publish after rollout: the existing tree is one previous release.
  const history = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : [staticFiles(previous)];
  if (!Array.isArray(history) || history.some(release => !Array.isArray(release))) throw new Error('Invalid static release manifest');
  const releases = [current, ...history.slice(0, 2)];
  for (const file of new Set(releases.flat())) {
    if (typeof file !== 'string' || !file.startsWith(PREFIX) || file.split('/').some(part => part === '..' || part === '.') || file.includes('\\')) throw new Error('Invalid retained chunk path');
    const destination = join(build, file);
    const source = join(previous, file);
    if (!existsSync(destination) && existsSync(source)) {
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source, destination);
    }
  }
  writeFileSync(join(build, MANIFEST), JSON.stringify(releases));
}
