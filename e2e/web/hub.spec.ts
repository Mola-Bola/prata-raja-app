// The walkable hub, the home screen after the title (src/game/ui/hub/HubOverlay.tsx): Continue lands in it, and its GO pill starts
// a run. Needs only the web build (bash scripts/check.sh --web e2e/web/hub.spec.ts).
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
const SAVE_KEY = 'game:prata-raja/save';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: {} }));
});

test('Continue lands in the hub, and its GO pill starts a run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const save = { v: 2, runs: 2, wins: 0, bestWave: 3, prologueSeen: true, gold: 40, totalKills: 20, settings: { sfx: false, music: false, haptics: false } };
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SAVE_KEY, JSON.stringify(save)]);
  await page.goto('/play?seed=3');
  await expect(page.getByTestId('ui-start')).toHaveText('Continue');
  await page.getByTestId('ui-start').click();
  await expect(page.getByTestId('hub-overlay')).toBeVisible();
  await expect(page.getByTestId('hub-coins')).toHaveText('40');
  expect(await page.evaluate(() => window.__world ?? null)).toBeNull(); // the hub starts no run by itself
  await page.getByTestId('hub-go').click();
  await expect(page.getByTestId('ui-pause')).toBeVisible();
  await expect(page.getByTestId('hub-overlay')).toHaveCount(0);
  await page.waitForFunction(() => window.__world?.phase === 'wave');
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(true); // the run woke the loop
  expect(errors).toEqual([]);
});
