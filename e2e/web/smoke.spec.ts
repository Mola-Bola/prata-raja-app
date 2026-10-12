// The starter's first journey: a signed-out visitor lands on Welcome and can reach sign-in. Needs only the web build
// (bash scripts/check.sh --web). Add one spec per journey as you add screens.
import { expect, type Page, test } from '@playwright/test';

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();

test('welcome opens, and "I already have an account" goes to sign-in', async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) => route.fulfill({ json: { external: { email: true, google: false } } }));
  await page.goto('/');
  await expect(tid(page, 'welcome-create')).toBeVisible();
  await tid(page, 'welcome-signin').click();
  await expect(tid(page, 'auth-submit')).toBeVisible();
});
