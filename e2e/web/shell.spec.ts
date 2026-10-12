// The signed-in shell with every network call mocked (no database): sign in, land on Home, see the "Tell Kannan" tab,
// open Me and My notes. Needs only the web build (bash scripts/check.sh --web).
import { expect, type Page, test } from '@playwright/test';

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();
const USER = { id: '11111111-0000-4000-8000-000000000009', aud: 'authenticated', role: 'authenticated', email: 'shell@t.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

async function mockServer(page: Page) {
  await page.route('**/auth/v1/settings', (route) => route.fulfill({ json: { external: { email: true, google: false } } }));
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      json: { access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: USER },
    }),
  );
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill({ json: { id: USER.id, display_name: 'Shell Tester', is_admin: false, created_at: '2026-01-01T00:00:00Z' } }),
  );
  await page.route('**/rest/v1/app_config**', (route) => route.fulfill({ json: [{ key: 'min_client_version', value: '0.1.0' }, { key: 'feedback_audience', value: 'everyone' }] }));
  await page.route('**/rest/v1/feedback**', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/releases**', (route) => route.fulfill({ json: [] }));
}

test('signed in: Home says hello, the feedback tab is there, Me and My notes open', async ({ page }) => {
  await mockServer(page);
  await page.goto('/sign-in?mode=in');
  await tid(page, 'auth-email').fill('shell@t.test');
  await page.locator('input[type=password]').first().fill('secret-123');
  await tid(page, 'auth-submit').click();
  await expect(tid(page, 'home-hello')).toBeVisible();
  await expect(tid(page, 'feedback-button')).toBeVisible();
  await expect(tid(page, 'feedback-button-label')).toHaveText(/Tell /);
  await tid(page, 'tab-me').click();
  await expect(tid(page, 'me-profile')).toBeVisible();
  await tid(page, 'me-feedback').click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(page.getByText('What’s happening with each note').filter({ visible: true }).first()).toBeVisible();
});
