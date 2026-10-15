#!/usr/bin/env node
// Exa web search for research agents. Key: EXA_API_KEY in ~/.cell/exa.env (never printed).
// Usage: node scripts/exa-search.mjs "query" [count]   → prints title · url · date, then a text excerpt per hit.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const query = process.argv[2];
const count = Number(process.argv[3] ?? 8);
if (!query) { console.error('usage: exa-search.mjs "query" [count]'); process.exit(2); }
let key = process.env.EXA_API_KEY;
try { key ??= readFileSync(join(homedir(), '.cell', 'exa.env'), 'utf8').match(/^EXA_API_KEY=(.+)$/m)?.[1]?.trim(); } catch { /* no file */ }
if (!key) { console.error('no EXA_API_KEY (save it in ~/.cell/exa.env)'); process.exit(2); }

const res = await fetch('https://api.exa.ai/search', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key },
  body: JSON.stringify({ query, numResults: count, contents: { text: { maxCharacters: 1500 } } }),
});
if (!res.ok) { console.error(`exa ${res.status}: ${(await res.text()).slice(0, 200)}`); process.exit(1); }
for (const r of (await res.json()).results ?? []) {
  console.log(`## ${r.title ?? '(untitled)'} · ${r.url} · ${r.publishedDate?.slice(0, 10) ?? ''}`);
  console.log((r.text ?? '').replace(/\s+/g, ' ').slice(0, 1500), '\n');
}
