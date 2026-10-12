#!/usr/bin/env node
// Self-hosted Expo Updates server (protocol v1) for Prata Raja, plus the native APK channel.
// Spec: https://docs.expo.dev/technical-specs/expo-updates-1/  ·  Guide: docs/UPDATES.md
//
//   GET /api/manifest       newest update in updates/<runtimeVersion>/<timestamp>/ for the platform (multipart/mixed)
//   GET /assets?path=…      a file from an update directory (gzip when accepted)
//   GET /api/native-latest  updates/native-latest.json (written by ship.mjs --apk), else 404
//   GET /apk/latest         updates/apk/prata-raja-latest.apk
//   GET /health             {"ok":true}
//
// Usage: node scripts/updates-server.mjs      (PORT=8182 by default; UPDATES_DIR overrides ./updates)
// No dependencies beyond Node built-ins. Update directories are published by scripts/ship.mjs.
import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

export const UPDATES_DIR = resolve(process.env.UPDATES_DIR ?? join(import.meta.dirname, '..', 'updates'));
const PORT = Number(process.env.PORT || 8182);
const PLATFORMS = new Set(['android', 'ios']);
/** A runtime version is used as a directory name, so keep it to one plain path segment. */
export const SAFE_SEGMENT = /^(?!\.)[A-Za-z0-9._-]{1,64}$/;

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  json: 'application/json',
};
export const contentTypeFor = (ext) => CONTENT_TYPES[String(ext ?? '').toLowerCase()] ?? 'application/octet-stream';
/** Content types /assets will echo back from its query string; anything else is served as octet-stream. */
const SERVABLE_TYPES = new Set([...Object.values(CONTENT_TYPES), 'application/javascript', 'application/octet-stream']);
/** Already-compressed formats: gzipping them again only costs CPU. */
const INCOMPRESSIBLE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/** Stable manifest id: SHA-256 of metadata.json + platform, laid out as an RFC 4122 v4 UUID. */
export function updateIdFor(metadataJson, platform) {
  const h = createHash('sha256').update(metadataJson).update(platform).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Update directories are named YYYYMMDDHHmmss in UTC; fall back to the directory's mtime. */
export function createdAtFor(dir, name) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(name);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
  return statSync(dir).mtime.toISOString();
}

function readJsonIfExists(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Newest updates/<rv>/<dir>/ whose metadata.json has a bundle for this platform (dot-dirs are ignored). */
export function latestUpdate(runtimeVersion, platform) {
  const rvDir = join(UPDATES_DIR, runtimeVersion);
  let names;
  try {
    names = readdirSync(rvDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort()
      .reverse();
  } catch {
    return null;
  }
  for (const name of names) {
    const dir = join(rvDir, name);
    let metadataJson;
    let metadata;
    try {
      metadataJson = readFileSync(join(dir, 'metadata.json'));
      metadata = JSON.parse(metadataJson);
    } catch {
      continue;
    }
    const files = metadata?.fileMetadata?.[platform];
    if (files?.bundle && existsSync(join(dir, files.bundle))) return { name, dir, metadataJson, files };
  }
  return null;
}

// Published update files never change (ship.mjs renames a finished directory into place), so hashes can be cached.
const hashCache = new Map();
function fileHashes(file) {
  const st = statSync(file);
  const cacheKey = `${file}|${st.size}|${st.mtimeMs}`;
  let hashes = hashCache.get(cacheKey);
  if (!hashes) {
    const buf = readFileSync(file);
    hashes = {
      hash: createHash('sha256').update(buf).digest('base64url'),
      key: createHash('md5').update(buf).digest('hex'),
    };
    hashCache.set(cacheKey, hashes);
  }
  return hashes;
}

export function buildManifest(update, platform, runtimeVersion, origin) {
  const { dir, name, metadataJson, files } = update;
  const asset = (relPath, contentType, ext) => {
    const file = join(dir, relPath);
    const path = relative(UPDATES_DIR, file).split(sep).join('/');
    return {
      ...fileHashes(file),
      contentType,
      ...(ext ? { fileExtension: `.${ext}` } : {}),
      url: `${origin}/assets?path=${encodeURIComponent(path)}&contentType=${encodeURIComponent(contentType)}`,
    };
  };
  const expoClient = readJsonIfExists(join(dir, 'expoConfig.json'));
  const release = readJsonIfExists(join(dir, 'release.json')); // label/notes from ship.mjs, for "What's new"
  return {
    id: updateIdFor(metadataJson, platform),
    createdAt: createdAtFor(dir, name),
    runtimeVersion,
    launchAsset: asset(files.bundle, 'application/javascript'),
    assets: (files.assets ?? []).map((a) => asset(a.path, contentTypeFor(a.ext), a.ext)),
    metadata: {},
    extra: { ...(expoClient ? { expoClient } : {}), ...(release ? { release } : {}) },
  };
}

function multipart(parts) {
  const boundary = `prata-raja-${randomBytes(12).toString('hex')}`;
  const body = parts
    .map((p) => `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\nContent-Type: ${p.contentType}\r\n\r\n${p.body}\r\n`)
    .join('');
  return { boundary, body: Buffer.from(`${body}--${boundary}--\r\n`) };
}

function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return '127.0.0.1';
}

/** Absolute origin as the phone sees it (from the Host header), so URLs survive the Mac's IP changing. */
function originOf(req) {
  const host = req.headers.host && /^[A-Za-z0-9.:[\]-]+$/.test(req.headers.host) ? req.headers.host : `${lanIp()}:${PORT}`;
  const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https' ? 'https' : 'http';
  return `${proto}://${host}`;
}

const PROTOCOL_HEADERS = { 'expo-protocol-version': '1', 'expo-sfv-version': '0', 'cache-control': 'private, max-age=0' };

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}
const sendJson = (res, status, obj, headers = {}) =>
  send(res, status, { 'content-type': 'application/json', 'cache-control': 'no-cache', ...headers }, JSON.stringify(obj));
const sendText = (res, status, text, headers = {}) =>
  send(res, status, { 'content-type': 'text/plain; charset=utf-8', ...headers }, `${text}\n`);

/** 'multipart' | 'application/expo+json' | 'application/json' | null (nothing we can produce). */
function responseFormat(accept) {
  if (!accept) return 'multipart';
  const types = accept.split(',').map((t) => t.split(';')[0].trim().toLowerCase());
  if (types.includes('multipart/mixed') || types.includes('*/*')) return 'multipart';
  if (types.includes('application/expo+json')) return 'application/expo+json';
  if (types.includes('application/json')) return 'application/json';
  return null;
}

function handleManifest(req, res, url) {
  const q = url.searchParams;
  const protocol = req.headers['expo-protocol-version'] ?? q.get('expo-protocol-version');
  if (protocol !== '1') return sendText(res, 406, 'Unsupported protocol: send expo-protocol-version: 1', PROTOCOL_HEADERS);
  const platform = req.headers['expo-platform'] ?? q.get('platform');
  if (!PLATFORMS.has(platform)) return sendText(res, 400, 'expo-platform must be "android" or "ios"', PROTOCOL_HEADERS);
  const runtimeVersion = req.headers['expo-runtime-version'] ?? q.get('runtime-version');
  if (!runtimeVersion || !SAFE_SEGMENT.test(runtimeVersion)) return sendText(res, 400, 'Missing or invalid expo-runtime-version', PROTOCOL_HEADERS);
  const format = responseFormat(req.headers.accept);
  if (!format) return sendText(res, 406, 'Accept must include multipart/mixed or application/json', PROTOCOL_HEADERS);

  const update = latestUpdate(runtimeVersion, platform);
  const current = req.headers['expo-current-update-id'];
  res.logNote = `${platform} rv=${runtimeVersion} -> ${update ? update.name : 'none'}${current ? ` (client on ${current})` : ''}`;
  if (!update) {
    // Multipart "no-op" is an empty 204; the JSON forms can't express "no update", so the spec says 406.
    if (format === 'multipart') return send(res, 204, PROTOCOL_HEADERS);
    return sendText(res, 406, 'No update for this runtime version', PROTOCOL_HEADERS);
  }
  const manifest = buildManifest(update, platform, runtimeVersion, originOf(req));
  if (format !== 'multipart') return send(res, 200, { ...PROTOCOL_HEADERS, 'content-type': format }, JSON.stringify(manifest));
  const { boundary, body } = multipart([
    { name: 'manifest', contentType: 'application/json', body: JSON.stringify(manifest) },
    { name: 'extensions', contentType: 'application/json', body: JSON.stringify({ assetRequestHeaders: {} }) },
  ]);
  send(res, 200, { ...PROTOCOL_HEADERS, 'content-type': `multipart/mixed; boundary=${boundary}`, 'content-length': body.length }, body);
}

const gzipCache = new Map(); // file|size|mtime -> gzipped bytes (bounded; files are immutable)
function gzipped(file, st) {
  const cacheKey = `${file}|${st.size}|${st.mtimeMs}`;
  let gz = gzipCache.get(cacheKey);
  if (!gz) {
    gz = gzipSync(readFileSync(file));
    gzipCache.set(cacheKey, gz);
    if (gzipCache.size > 64) gzipCache.delete(gzipCache.keys().next().value);
  }
  return gz;
}

function handleAsset(req, res, url) {
  const rel = url.searchParams.get('path') ?? '';
  const segments = rel.split(/[\\/]/);
  // Only files inside an update directory (<rv>/<dir>/…); no dot-segments (blocks "..", staging dirs).
  if (segments.length < 3 || segments.some((s) => !s || s.startsWith('.'))) return sendText(res, 400, 'Bad asset path');
  let file;
  try {
    file = realpathSync(resolve(UPDATES_DIR, rel));
  } catch {
    return sendText(res, 404, 'Asset not found');
  }
  if (!file.startsWith(realpathSync(UPDATES_DIR) + sep)) return sendText(res, 400, 'Bad asset path');
  const st = statSync(file);
  if (!st.isFile()) return sendText(res, 404, 'Asset not found');

  const asked = url.searchParams.get('contentType');
  const contentType = SERVABLE_TYPES.has(asked) ? asked : 'application/octet-stream';
  const headers = { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable', vary: 'accept-encoding' };
  const acceptsGzip = /\bgzip\b/i.test(req.headers['accept-encoding'] ?? '');
  if (acceptsGzip && !INCOMPRESSIBLE.has(contentType)) {
    const gz = gzipped(file, st);
    return send(res, 200, { ...headers, 'content-encoding': 'gzip', 'content-length': gz.length }, req.method === 'HEAD' ? undefined : gz);
  }
  res.writeHead(200, { ...headers, 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

function handleNativeLatest(req, res) {
  const latest = readJsonIfExists(join(UPDATES_DIR, 'native-latest.json'));
  if (!latest) return sendJson(res, 404, { error: 'No native release yet' });
  const apkUrl = !latest.apkUrl || latest.apkUrl.startsWith('/') ? `${originOf(req)}${latest.apkUrl || '/apk/latest'}` : latest.apkUrl;
  sendJson(res, 200, { ...latest, apkUrl });
}

function handleApk(req, res) {
  const file = join(UPDATES_DIR, 'apk', 'prata-raja-latest.apk');
  if (!existsSync(file)) return sendText(res, 404, 'No APK yet: run node scripts/ship.mjs --apk');
  res.writeHead(200, {
    'content-type': 'application/vnd.android.package-archive',
    'content-disposition': 'attachment; filename="prata-raja-latest.apk"',
    'content-length': statSync(file).size,
    'cache-control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

function handle(req, res) {
  const started = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - started).toFixed(0);
    const note = res.logNote ? ` ${res.logNote}` : '';
    console.log(`${new Date().toISOString()} ${req.socket.remoteAddress} ${req.method} ${req.url} ${res.statusCode} ${ms}ms${note}`);
  });
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed', { allow: 'GET, HEAD' });
  try {
    switch (url.pathname) {
      case '/api/manifest':
        return handleManifest(req, res, url);
      case '/assets':
      case '/api/assets':
        return handleAsset(req, res, url);
      case '/api/native-latest':
        return handleNativeLatest(req, res);
      case '/apk/latest':
        return handleApk(req, res);
      case '/health':
        return sendJson(res, 200, { ok: true });
      default:
        return sendText(res, 404, 'Not found');
    }
  } catch (err) {
    console.error(`${new Date().toISOString()} error handling ${req.url}:`, err);
    if (!res.headersSent) sendText(res, 500, 'Internal error');
    else res.destroy(err);
  }
}

if (import.meta.main) {
  const server = createServer(handle);
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${PORT} is already in use (is the updates server already running?)` : err);
    process.exit(1);
  });
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`Prata Raja updates server on http://0.0.0.0:${PORT} (LAN http://${lanIp()}:${PORT}), serving ${UPDATES_DIR}`),
  );
}
