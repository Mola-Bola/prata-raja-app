#!/usr/bin/env node
// You.com web search for research agents. Key: YDC_API_KEY in ~/.cell/you.env (never printed).
// Usage: node scripts/you-search.mjs "query" [count]   → prints title · url · snippet per hit.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const query = process.argv[2];
const count = Number(process.argv[3] ?? 10);
if (!query) { console.error('usage: you-search.mjs "query" [count]'); process.exit(2); }
let key = process.env.YDC_API_KEY;
try { key ??= readFileSync(join(homedir(), '.cell', 'you.env'), 'utf8').match(/^YDC_API_KEY=(.+)$/m)?.[1]?.trim(); } catch { /* no file */ }
if (!key) { console.error('no YDC_API_KEY (save it in ~/.cell/you.env)'); process.exit(2); }

// Current and legacy endpoints; the first that answers wins.
const urls = [
  `https://ydc-index.io/v1/search?query=${encodeURIComponent(query)}&count=${count}`,
  `https://api.ydc-index.io/v1/search?query=${encodeURIComponent(query)}&count=${count}`,
  `https://api.ydc-index.io/search?query=${encodeURIComponent(query)}&num_web_results=${count}`,
];
for (const url of urls) {
  const res = await fetch(url, { headers: { 'X-API-Key': key } }).catch(() => null);
  if (!res?.ok) { console.error(`(${res?.status ?? 'network'} from ${new URL(url).host}${new URL(url).pathname})`); continue; }
  const j = await res.json();
  const hits = j.results?.web ?? j.hits ?? j.results ?? [];
  for (const h of hits.slice(0, count)) {
    const snip = (h.snippets ?? [h.description ?? h.snippet ?? '']).join(' ').replace(/\s+/g, ' ').slice(0, 300);
    console.log(`${h.title} · ${h.url}\n  ${snip}`);
  }
  process.exit(0);
}
process.exit(1);
