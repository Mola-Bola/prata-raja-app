#!/usr/bin/env node
// Brand lint: fails when the app name, or a registered feature word, is written as a string literal or JSX text outside the
// words file (src/brand.ts). Those must come from the words file so a rename is one edit (README "Renaming the app").
//   node scripts/brand-lint.mjs [appRoot]     exit 0 clean, 1 with one line per finding, 2 when it can't run
// Guarded words: brandWords.appName, shortName, every extension name (brandWords.extensions) and brandWords.lintWords.
// Matching is whole-word and case-sensitive ("Hatch" is guarded, the id 'hatch' is not). Comments are never checked.
// Scanned: src/**/*.{ts,tsx,js,jsx} and supabase/functions/**/*.ts, except src/brand.ts.
// Exceptions: scripts/brand-allow.txt, one per line: `<path or folder/> [word]` (no word = every word in that path); # comments.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readPureData } from './brand-data.mjs';

const SCAN = [['src', /\.(ts|tsx|js|jsx)$/], ['supabase/functions', /\.ts$/]];
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist']);
const WORDS_FILE = 'src/brand.ts';

/** The words the lint guards: the app name, the short name, the extension names and lintWords (2+ characters, no duplicates). */
export function guardedWords(words) {
  // An extension name written like an id ("garden", "kite-club") is also its id, route and test id: guarding it would
  // fail the scaffold's own code. Such names are guarded only when listed in lintWords on purpose.
  // The app's own names are always guarded (a lowercase one too: allow its id in scripts/brand-allow.txt if it clashes).
  const exts = Object.values(words.extensions ?? {}).filter((w) => typeof w === 'string' && !/^[a-z0-9_-]+$/.test(w.trim()));
  const list = [words.appName, words.shortName, ...exts, ...(words.lintWords ?? [])];
  return [...new Set(list.filter((w) => typeof w === 'string' && w.trim().length >= 2).map((w) => w.trim()))];
}

/** What JSX text renders as: entities decoded, runs of whitespace (line breaks included) read as one space. */
export function jsxRendered(raw) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return raw
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : named[e.toLowerCase()] ?? m))
    .replace(/\s+/g, ' ');
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole word, case-sensitive: not preceded or followed by a letter, digit or underscore. "Prata Raja" (the starter's own token) works too. */
export const wordPattern = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(w).replace(/ +/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'u'); // "Kite Club" also across a line break

/** Parses scripts/brand-allow.txt. */
export function parseAllow(text) {
  return text.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => {
    const m = /^(\S+)(?:\s+(.+))?$/.exec(l);
    return { path: m[1], word: m[2]?.trim() ?? null };
  });
}

export const allowed = (allow, file, word) =>
  allow.some((a) => (a.path === file || (a.path.endsWith('/') && file.startsWith(a.path))) && (a.word === null || a.word === word));

/** Every user-visible literal in one source file: [{line, text}]. String literals, template text, JSX text and regular expressions; not import paths. */
export function literalsIn(ts, fileName, source) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const K = ts.SyntaxKind;
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return; // module paths
    if (ts.isExternalModuleReference?.(node)) return;
    if (ts.isCallExpression(node) && (node.expression.kind === K.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) return;
    if ([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.JsxText, K.RegularExpressionLiteral].includes(node.kind)) {
      // node.text is the decoded value ('\u0048atch' is "Hatch"); JSX text is decoded the way it renders.
      const text = node.kind === K.JsxText ? jsxRendered(node.getText(sf)) : node.kind === K.RegularExpressionLiteral ? node.getText(sf) : node.text;
      if (text.trim()) out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function filesUnder(root, dir, re, out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) filesUnder(root, rel, re, out); }
    else if (e.isFile() && re.test(e.name)) out.push(rel);
  }
  return out;
}

/** Runs the lint over an app folder. Returns {findings: [{file, line, word, text}], words, scanned}. */
export function lintApp(root, ts = createRequire(join(root, 'package.json'))('typescript')) {
  const words = readPureData(join(root, WORDS_FILE), 'brandWords');
  const guarded = guardedWords(words).map((w) => ({ w, re: wordPattern(w) }));
  const allowFile = join(root, 'scripts', 'brand-allow.txt');
  const allow = existsSync(allowFile) ? parseAllow(readFileSync(allowFile, 'utf8')) : [];
  const findings = [];
  let scanned = 0;
  for (const [dir, re] of SCAN) {
    for (const file of filesUnder(root, dir, re)) {
      if (file === WORDS_FILE) continue;
      scanned++;
      const source = readFileSync(join(root, file), 'utf8'); // no raw-text shortcut: escapes ('\u0048atch') only show once parsed
      for (const lit of literalsIn(ts, file, source)) {
        for (const { w, re: r } of guarded) {
          if (r.test(lit.text) && !allowed(allow, file, w)) findings.push({ file, line: lit.line, word: w, text: lit.text.trim().replace(/\s+/g, ' ').slice(0, 80) });
        }
      }
    }
  }
  return { findings, words: guarded.map((g) => g.w), scanned };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..'));
  let r;
  try {
    r = lintApp(root);
  } catch (e) {
    console.error(`brand-lint: ${e.message}`);
    process.exit(2);
  }
  for (const f of r.findings) console.log(`${f.file.split('/').join(sep)}:${f.line}  "${f.word}" in "${f.text}"`);
  if (r.findings.length) {
    console.log(`${r.findings.length} hard-coded name${r.findings.length === 1 ? '' : 's'}: use brandWords / APP_NAME / WORDS from src/brand.ts (or add an exception to scripts/brand-allow.txt).`);
    process.exit(1);
  }
  console.log(`brand words clean (${r.scanned} files; guarding ${r.words.map((w) => JSON.stringify(w)).join(', ')})`);
}
