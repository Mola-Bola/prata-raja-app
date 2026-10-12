#!/usr/bin/env node
// Serves the exported web build (dist/) with single-page-app fallback, so deep links like /i/<token> work.
// Usage: node scripts/serve-web.mjs [port]   (build first: npx expo export -p web)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist');
const port = Number(process.argv[2] ?? 8181);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json' };

createServer((req, res) => {
  let path;
  try {
    path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  } catch {
    res.writeHead(400).end('Bad request'); // a malformed address (/%zz) must not take the server down
    return;
  }
  let file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`Prata Raja web on http://0.0.0.0:${port} (serving ${root})`));
