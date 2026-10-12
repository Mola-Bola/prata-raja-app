// Reads the two pure-data brand files for scripts: src/ui/brand.ts (the look: `export const brand = {…};`) and src/brand.ts
// (the words: `export const brandWords = {…};`). They are pure data, so they are evaluated as plain JavaScript instead of
// being imported as TypeScript modules (no loader, no warnings, whatever the Node version). app.config.js has its own copy
// of readPureData (it is CommonJS).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

/** Evaluates `export const <name> = {…};` from a pure-data file (relative to the app root, or absolute). */
export function readPureData(file, name) {
  const text = readFileSync(file.startsWith('/') ? file : join(ROOT, file), 'utf8');
  const head = new RegExp(`^export const ${name} = `, 'm');
  if (!head.test(text)) throw new Error(`${file} must be pure data starting with "export const ${name} ="`);
  return new Function(text.replace(head, 'return '))();
}

export const brand = readPureData('src/ui/brand.ts', 'brand');
export const brandWords = readPureData('src/brand.ts', 'brandWords');
