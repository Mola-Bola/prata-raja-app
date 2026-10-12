// Sign-up email links and Google sign-in on the web build (J11). Needs the web build on :9490 (the network calls are mocked, so no database).
// Run: npx playwright test -c e2e/web auth.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// The web build's EXPO_PUBLIC_WEB_URL (local build: .env). Email links must come back to `${WEB_URL}/`.
const WEB_URL = (process.env.APP_WEB_URL ?? readFileSync(join(__dirname, '../../.env'), 'utf8').match(/EXPO_PUBLIC_WEB_URL=(\S+)/)?.[1] ?? '').replace(/\/$/, '');

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();

test('J11a: sign-up asks for the confirmation email to land back on the web app, not the site root', async ({ page }) => {
  let signupUrl = '';
  await page.route('**/auth/v1/signup**', (route) => {
    signupUrl = route.request().url();
    return route.fulfill({
      json: { id: '00000000-0000-4000-8000-0000000000e2', aud: 'authenticated', role: '', email: 'new@t.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    });
  });
  await page.goto('/sign-in?mode=up');
  await tid(page, 'auth-name').fill('New Person');
  await tid(page, 'auth-email').fill('new@t.test');
  await page.locator('input[type=password]').first().fill('secret-123');
  await tid(page, 'auth-submit').click();
  await expect(page.getByText('Check your email to confirm your account').filter({ visible: true }).first()).toBeVisible();
  expect(new URL(signupUrl).searchParams.get('redirect_to')).toBe(`${WEB_URL}/`);
});

test('J11b: no Google button until Google is switched on in Supabase', async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) => route.fulfill({ json: { external: { email: true, google: false } } }));
  await page.goto('/sign-in');
  await expect(tid(page, 'auth-submit')).toBeVisible();
  await expect(page.locator('[data-testid="auth-google"]')).toHaveCount(0);
});

test('J11c: Google button starts Google sign-in and returns to the web app', async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) => route.fulfill({ json: { external: { email: true, google: true } } }));
  let authorizeUrl = '';
  await page.route('**/auth/v1/authorize**', (route) => {
    authorizeUrl = route.request().url();
    return route.fulfill({ contentType: 'text/html', body: '<p>google</p>' });
  });
  await page.goto('/sign-in');
  await tid(page, 'auth-google').click();
  await expect(page.getByText('google', { exact: true })).toBeVisible();
  const u = new URL(authorizeUrl);
  expect(u.searchParams.get('provider')).toBe('google');
  expect(u.searchParams.get('redirect_to')).toBe(`${WEB_URL}/`);
});
