// Frame-rate and cost check for the game's analytics: the same self-playing run with Analytics off and on, alternate them and compare.
//   node docs/reviews/feedback-telemetry-check/fps.mjs --mode off|capture|live [--secs 15] [--warm 5] [--dpr 2] [--gl metal|swiftshader]
//        [--uncap 1] [--path "/play?bot=1&seed=3"] [--out file.json] [--keep-frames dir] [--base http://localhost:9591]
// Needs the web build served at --base, built WITH EXPO_PUBLIC_POSTHOG_HOST/KEY. Reports rAF fps, frame-time percentiles, main-thread
// CPU per frame and, from the replay uploads, how many snapshot batches and what events were sent.
// off:     the device's Analytics switch is off from the start (the baseline).
// capture: PostHog capture endpoints are answered locally (bodies kept and decoded); the config script goes to the real relay.
// live:    everything goes to the real relay (tagged test=true by ?bot=1).
// --uncap 1 (with --gl metal) removes the 60 Hz limit, so fps measures the cost of a frame instead of the screen's rate.
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? dflt : process.argv[i + 1];
};
const mode = arg('mode', 'capture');
const secs = Number(arg('secs', 25));
const dpr = Number(arg('dpr', 2));
const path = arg('path', '/play?bot=1&seed=3');
const out = arg('out', null);
const id = arg('id', randomUUID());
const framesDir = arg('keep-frames', null);
const base = arg('base', 'http://localhost:9591');
const HOST = (await import('node:fs')).readFileSync(`${process.env.HOME}/.cell/posthog.env`, 'utf8').match(/^POSTHOG_HOST=(\S+)/m)[1];

const gl = arg('gl', 'metal');
const browser = await chromium.launch({ args: gl === 'metal' ? ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...(arg('uncap', '0') === '1' ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : [])] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, userAgent: UA });
// posthog-js treats webdriver browsers as bots and sends nothing; a phone's WebView is not one.
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
});
await context.addInitScript(
  ([deviceId, analytics]) => {
    try {
      localStorage.setItem('game:prata-raja/device', JSON.stringify({ v: 1, id: deviceId, from: '', analytics }));
    } catch {
      /* none */
    }
  },
  [id, mode !== 'off'],
);
await context.addInitScript(() => {
  window.__raf = 0;
  window.__long = { n: 0, ms: 0 };
  window.__ft = []; // frame times (ms) between animation frames
  let last = performance.now();
  const tick = (now) => {
    window.__raf++;
    if (window.__ft.length < 60000) window.__ft.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__long.n++;
        window.__long.ms += e.duration;
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    /* no longtask support */
  }
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.route('**/rest/v1/**', (r) => r.fulfill({ json: [] }));
await page.route('**/auth/v1/**', (r) => r.fulfill({ json: {} }));

const hits = []; // everything that went to the relay
const bodies = []; // decoded capture bodies
const decode = (buf, url) => {
  if (!buf) return null;
  let raw = buf;
  try {
    raw = gunzipSync(buf);
  } catch {
    /* not gzip */
  }
  let text = raw.toString('utf8');
  if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return { undecoded: text.slice(0, 200), url };
  }
};
await page.route(`${HOST}/**`, async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  const captured = /^\/(e|batch|s|i\/v0\/e|capture)\/?$/.test(u.pathname);
  hits.push({ method: req.method(), path: u.pathname, search: u.search.slice(0, 80), captured });
  if (captured) bodies.push({ path: u.pathname, search: u.search, body: decode(req.postDataBuffer(), req.url()) });
  if (captured && mode === 'capture') return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
  return route.continue();
});

const t0 = Date.now();
await page.goto(`${base}${path}`);
await page.waitForFunction(() => !!window.__world, null, { timeout: 90_000 });
const startMs = Date.now() - t0;
// posthog-js holds the replay buffer until the person touches the page (a bot run never does): one tap, as a player would
// (after posthog has started, which takes a second or two).
if (arg('tap', '1') === '1') {
  await page.waitForTimeout(Number(arg('tapAfter', 4)) * 1000);
  await page.mouse.move(195, 700);
  await page.mouse.down();
  await page.mouse.up();
}
const renderer = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const g = c?.getContext('webgl2') ?? c?.getContext('webgl');
  const ext = g?.getExtension('WEBGL_debug_renderer_info');
  return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const warm = Number(arg('warm', 6));
await page.waitForTimeout(warm * 1000);
const raf0 = await page.evaluate(() => ({ raf: window.__raf, long: { ...window.__long }, t: performance.now(), ft: window.__ft.length }));
const m0 = await metrics();
const fps = [];
for (let s = 0; s < secs; s++) {
  await page.waitForTimeout(1000);
  fps.push(await page.evaluate(() => window.__game?.loop.actualFps ?? 0));
}
const raf1 = await page.evaluate(() => ({ raf: window.__raf, long: { ...window.__long }, t: performance.now(), ft: window.__ft.length }));
const ftWindow = await page.evaluate(([a, b]) => window.__ft.slice(a, b), [raf0.ft, raf1.ft]);
const sortedFt = [...ftWindow].sort((x, y) => x - y);
const pct = (q) => +(sortedFt[Math.min(sortedFt.length - 1, Math.floor(sortedFt.length * q))] ?? 0).toFixed(2);
const frameMs = { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), slowPct: +((100 * ftWindow.filter((v) => v > 25).length) / Math.max(1, ftWindow.length)).toFixed(2) };
const m1 = await metrics();
const rafFps = ((raf1.raf - raf0.raf) / (raf1.t - raf0.t)) * 1000;
const wall = m1.Timestamp - m0.Timestamp;
// CPU seconds the page's main thread used per second of wall time (script, layout and style): unlike fps it does not move
// when other programs on the Mac take the cores.
const cpu = { task: +((m1.TaskDuration - m0.TaskDuration) / wall).toFixed(3), script: +((m1.ScriptDuration - m0.ScriptDuration) / wall).toFixed(3), layout: +((m1.LayoutDuration - m0.LayoutDuration + m1.RecalcStyleDuration - m0.RecalcStyleDuration) / wall).toFixed(3), perFrameMs: +(((m1.TaskDuration - m0.TaskDuration) / Math.max(1, raf1.raf - raf0.raf)) * 1000).toFixed(2) };
const longTasks = { n: raf1.long.n - raf0.long.n, ms: Math.round(raf1.long.ms - raf0.long.ms) };
const wave = await page.evaluate(() => window.__world?.wave ?? null);
const ph = await page.evaluate(() => {
  const p = window.posthog;
  return { present: !!p, sessionId: p?.get_session_id?.() ?? null, recording: p?.sessionRecordingStarted?.() ?? null, distinct: p?.get_distinct_id?.() ?? null };
});
// Give the batch a moment to flush, then close the page (pagehide flushes the rest).
await page.waitForTimeout(4000);
await page.close();
await context.close();
await browser.close();

const events = [];
const snapshots = [];
for (const b of bodies) {
  const items = Array.isArray(b.body) ? b.body : b.body?.batch ? b.body.batch : b.body ? [b.body] : [];
  for (const e of items) {
    if (e?.event === '$snapshot') snapshots.push(e);
    else if (e?.event) events.push(e);
  }
}
const sorted = [...fps].sort((a, b) => a - b);
const mean = fps.reduce((a, b) => a + b, 0) / (fps.length || 1);
const result = {
  mode,
  id,
  dpr,
  gl: renderer,
  secs,
  startMs,
  rafFps: +rafFps.toFixed(2),
  frameMs,
  cpu,
  longTasks,
  fps: { mean: +mean.toFixed(2), median: sorted[Math.floor(sorted.length / 2)] ?? 0, min: sorted[0] ?? 0, samples: fps.map((f) => +f.toFixed(1)) },
  wave,
  posthog: ph,
  errors: errors.slice(0, 20),
  hostHits: hits.reduce((m, h) => ((m[h.path] = (m[h.path] ?? 0) + 1), m), {}),
  eventNames: events.reduce((m, e) => ((m[e.event] = (m[e.event] ?? 0) + 1), m), {}),
  snapshotBatches: snapshots.length,
  firstEvent: events[0] ? { event: events[0].event, properties: Object.fromEntries(Object.entries(events[0].properties ?? {}).filter(([k]) => !k.startsWith('$') || ['$lib', '$process_person_profile', '$session_id', '$device_id', '$current_url', '$os', '$browser'].includes(k))) } : null,
};
if (framesDir) {
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(join(framesDir, 'events.json'), JSON.stringify(events, null, 1));
  writeFileSync(join(framesDir, 'snapshots.json'), JSON.stringify(snapshots));
}
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
