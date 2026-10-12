// A person-like session driven through the real UI: Start, drag, level-up card, an uncaught error, a note through the Tell Kannan
// sheet, Analytics off and on, End run. Reference check for docs/TELEMETRY.md (see docs/reviews/feedback-telemetry-report.md).
//   node docs/reviews/feedback-telemetry-check/ui-session.mjs --mode capture|live [--out file.json] [--base http://localhost:9591]
// Needs the web build served at --base, built WITH EXPO_PUBLIC_POSTHOG_HOST/KEY (see the report). Uses the GPU (Metal) on a Mac.
// capture: PostHog capture endpoints and the game-feedback function are answered locally; bodies are kept and checked
//          (events, masked inputs, nothing sent while Analytics is off, replay stops and resumes). Nothing leaves the machine
//          except the config.js script fetch.
// live:    everything is real (events and replay go to PostHog through the relay; ONE note goes to the cloud inbox: close it
//          afterwards with `node scripts/feedback.mjs status <id> not_now`). The session is tagged test=true (?test=1).
import { writeFileSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

import { chromium } from '@playwright/test';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? dflt : process.argv[i + 1];
};
const mode = arg('mode', 'capture');
const out = arg('out', null);
const id = arg('id', randomUUID());
const base = arg('base', 'http://localhost:9591');
const HOST = readFileSync(`${process.env.HOME}/.cell/posthog.env`, 'utf8').match(/^POSTHOG_HOST=(\S+)/m)[1];
const SECRET_BODY = mode === 'live' ? '[test] full-path check from the game UI, ignore; closed right after' : 'SECRETWORDS the first boss comes too early';
const SECRET_NAME = mode === 'live' ? 'pipeline-test' : 'SECRETNAME';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: UA });
await context.addInitScript(
  ([deviceId]) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    try {
      if (!localStorage.getItem('game:prata-raja/device')) localStorage.setItem('game:prata-raja/device', JSON.stringify({ v: 1, id: deviceId, from: '', analytics: true }));
    } catch {
      /* none */
    }
  },
  [id],
);
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.route('**/rest/v1/**', (r) => r.fulfill({ json: [] }));
await page.route('**/auth/v1/**', (r) => r.fulfill({ json: {} }));

const notes = []; // what the game posted to the feedback function, and what came back
await page.route('**/functions/v1/game-feedback', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  const payload = JSON.parse(req.postData() ?? '{}');
  if (mode === 'capture') {
    notes.push({ payload, status: 200 });
    return route.fulfill({ json: { ok: true, id: payload.id }, headers: { 'access-control-allow-origin': '*' } });
  }
  const res = await route.fetch();
  notes.push({ payload, status: res.status(), body: await res.text() });
  return route.fulfill({ response: res });
});

const decode = (buf) => {
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
    return { undecoded: text.slice(0, 120) };
  }
};
const bodies = [];
await page.route(`${HOST}/**`, async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  const captured = /^\/(e|batch|s|i\/v0\/e|capture)\/?$/.test(u.pathname);
  if (captured) bodies.push({ at: Date.now(), path: u.pathname, body: decode(req.postDataBuffer()) });
  if (captured && mode === 'capture') return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
  return route.continue();
});

const tid = (t) => page.locator(`[data-testid="${t}"]`).filter({ visible: true }).first();
const log = [];
const step = (s) => log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`);
const t0 = Date.now();

await page.goto(`${base}/play?test=1`);
step('loaded');
await tid('ui-start').click();
await page.waitForFunction(() => !!window.__world, null, { timeout: 90_000 });
await page.waitForTimeout(2500); // posthog is up (config script + init) before the first touches
step('run started');
await page.mouse.move(195, 700);
await page.mouse.down();
await page.mouse.move(300, 700, { steps: 8 });
await page.mouse.up();
step('dragged');

// A level-up through the real cards.
await page.evaluate(() => {
  window.__world.pendingLevelUps = 1;
});
await tid('ui-card-0').waitFor({ timeout: 20_000 });
await tid('ui-card-0').click();
await page.waitForFunction(() => window.__world.phase === 'wave');
step('picked a card');

// An uncaught error, as a bug in the game would raise.
await page.evaluate(() => setTimeout(() => {
  throw new Error('verify-exception-1');
}, 0));
await page.waitForTimeout(1200);

// A note through the real sheet.
await tid('ui-pause').click();
await tid('ui-tell').click();
await tid('feedback-chip-balance').click();
await tid('feedback-text').fill(SECRET_BODY);
await tid('feedback-from').fill(SECRET_NAME);
await page.waitForTimeout(800);
await tid('feedback-send').click();
await tid('feedback-sent').waitFor({ timeout: 20_000 });
step('note sent');
await tid('feedback-sheet').waitFor({ state: 'hidden', timeout: 8000 });

// Analytics off: nothing new may leave.
await page.waitForTimeout(3500); // let what was already queued go
const offAt = Date.now();
await tid('ui-analytics').click();
step('analytics off');
await page.evaluate(() => setTimeout(() => {
  throw new Error('verify-exception-while-off');
}, 0));
await tid('ui-resume').click();
await page.waitForTimeout(7000);
const sentWhileOff = bodies.filter((b) => b.at > offAt + 1500).length;
const swOffState = await tid('ui-analytics').count() === 0 ? 'hidden' : 'n/a';
step('waited while off');

// On again: replay and events resume.
await tid('ui-pause').click();
await tid('ui-analytics').click();
const onAt = Date.now();
step('analytics on');
await tid('ui-resume').click();
await page.mouse.move(195, 700);
await page.mouse.down();
await page.mouse.move(120, 700, { steps: 8 });
await page.mouse.up();
await page.evaluate(() => setTimeout(() => {
  throw new Error('verify-exception-2');
}, 0));
await page.waitForTimeout(6000);

// End the run through the UI: run_end.
await tid('ui-pause').click();
await tid('ui-quit').click();
await tid('ui-again').waitFor({ timeout: 20_000 });
step('run ended');
await page.waitForTimeout(5000);
const device = await page.evaluate(() => localStorage.getItem('game:prata-raja/device'));
await page.close();
await context.close();
await browser.close();

// ── Read back what was sent ────────────────────────────────────────────────────────────────────────────────────
const items = (b) => (Array.isArray(b.body) ? b.body : b.body?.batch ? b.body.batch : b.body ? [b.body] : []);
const events = [];
const snapshots = [];
for (const b of bodies) for (const e of items(b)) (e?.event === '$snapshot' ? snapshots : events).push({ ...e, at: b.at });
const rr = snapshots.flatMap((s) => s.properties?.$snapshot_data ?? []);
const typed = rr.filter((e) => e.type === 3 && e.data?.source === 5); // input events
const rawText = JSON.stringify(bodies.map((b) => b.body));
const summary = {
  mode,
  deviceId: id,
  errors,
  log,
  events: events.map((e) => ({ name: e.event, t: e.timestamp?.slice(11, 23), p: Object.fromEntries(Object.entries(e.properties ?? {}).filter(([k]) => !k.startsWith('$') && !['token', 'distinct_id'].includes(k))), exc: e.event === '$exception' ? (e.properties?.$exception_list?.[0]?.value ?? '').slice(0, 60) : undefined })),
  eventNames: events.reduce((m, e) => ((m[e.event] = (m[e.event] ?? 0) + 1), m), {}),
  sentWhileOff,
  swOffState,
  offAt: new Date(offAt).toISOString().slice(11, 23),
  onAt: new Date(onAt).toISOString().slice(11, 23),
  snapshotBatches: snapshots.length,
  rrwebEvents: rr.length,
  canvasFrames: rr.filter((e) => e.type === 3 && e.data?.source === 9).length,
  replayWhileOff: rr.filter((e) => e.timestamp > offAt + 1500 && e.timestamp < onAt).length,
  replayAfterOn: rr.filter((e) => e.timestamp > onAt + 800).length,
  canvasAfterOn: rr.filter((e) => e.type === 3 && e.data?.source === 9 && e.timestamp > onAt + 800).length,
  inputEvents: typed.length,
  inputTexts: typed.map((e) => e.data?.text).slice(0, 6),
  secretsInPosthogBodies: { body: rawText.includes('SECRETWORDS'), name: rawText.includes(SECRET_NAME), bodyWords: rawText.includes('first boss comes') },
  notes: notes.map((n) => ({ status: n.status, body: n.body, payload: { ...n.payload, body: n.payload.body?.slice(0, 20) + '…' } })),
  device: JSON.parse(device ?? '{}'),
};
if (out) writeFileSync(out, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
