// The app opens straight into the game, with no account: the bare start page goes to /play, while a link to any other
// page opens where it points. The app's own server calls are mocked (empty answers). Needs only the web build
// (bash scripts/check.sh --web).
import { expect, type Page, test } from '@playwright/test';

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/settings', (route) => route.fulfill({ json: { external: { email: true, google: false } } }));
});

test('the start page opens the game, signed out', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/play$/);
  await expect(tid(page, 'play')).toBeVisible();
});

test('a link to another page is not taken over', async ({ page }) => {
  await page.goto('/welcome');
  await expect(tid(page, 'welcome-create')).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/);
});
