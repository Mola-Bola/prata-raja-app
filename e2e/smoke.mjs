#!/usr/bin/env node
// Headless smoke check for a screen on the web build (the web build must be served on :9490: bash scripts/dev-up.sh).
// Usage: node e2e/smoke.mjs --as demo --path /me [--expect "Me"] [--shot /tmp/x.png] [--width 390]
//   --as <demo|friend|none>   seed user to sign in as (default demo; "none" = signed out)
//   --do "fill:<testid>:<text>;click:<testid>;wait:<ms>"   steps to run on the page before the screenshot
// Prints JSON: { ok, url, missing[], consoleErrors[], shot }. Exit 1 when not ok.
import { chromium } from '@playwright/test';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1]]] : acc), []),
);
const BASE = process.env.APP_WEB ?? 'http://localhost:9490';
const who = args.as ?? 'demo';
const path = args.path ?? '/';
const expects = [].concat(args.expect ?? []).flatMap((e) => String(e).split('|')).filter(Boolean);
const shot = args.shot ?? `/tmp/prata-raja-smoke-${Date.now()}.png`;
const width = Number(args.width ?? 390);

import { existsSync, mkdirSync } from 'node:fs';
const stateDir = '/tmp/prata-raja-smoke-state';
mkdirSync(stateDir, { recursive: true });
const statePath = `${stateDir}/${who}.json`;
const browser = await chromium.launch();
// Reuse a saved session per user (the local auth server limits sign-ins per 5 minutes).
const context = await browser.newContext({ viewport: { width, height: 844 }, storageState: who !== 'none' && existsSync(statePath) ? statePath : undefined });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/DevTools|favicon|Download the React/i.test(m.text())) consoleErrors.push(m.text().slice(0, 300));
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));

try {
  let signedIn = false;
  if (who !== 'none' && existsSync(statePath)) {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    signedIn = !page.url().includes('/welcome') && !page.url().includes('/sign-in');
  }
  if (who !== 'none' && !signedIn) {
    await page.goto(`${BASE}/sign-in?mode=in`, { waitUntil: 'networkidle' });
    await page.getByTestId('auth-email').locator('input').or(page.locator('input[type=email]')).first().fill(`${who}@prata-raja.test`);
    await page.locator('input[type=password]').first().fill('prata-raja-demo-1');
    await page.getByTestId('auth-submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 15000 });
    await context.storageState({ path: statePath });
  }
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  for (const step of String(args.do ?? '').split(';').filter(Boolean)) {
    const [op, id, ...rest] = step.split(':');
    const el = page.getByTestId(id);
    if (op === 'fill') await (await el.locator('input,textarea').count() ? el.locator('input,textarea').first() : el).fill(rest.join(':'));
    else if (op === 'click') await el.first().click();
    else if (op === 'wait') await page.waitForTimeout(Number(id));
    await page.waitForTimeout(400);
  }
  const text = await page.locator('body').innerText();
  const missing = expects.filter((e) => !text.includes(e));
  await page.screenshot({ path: shot, fullPage: true });
  const ok = missing.length === 0 && consoleErrors.length === 0;
  console.log(JSON.stringify({ ok, url: page.url(), missing, consoleErrors, shot, textSample: text.slice(0, 600) }, null, 2));
  await browser.close();
  process.exit(ok ? 0 : 1);
} catch (e) {
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ ok: false, error: String(e).slice(0, 500), consoleErrors, shot }, null, 2));
  await browser.close();
  process.exit(1);
}
