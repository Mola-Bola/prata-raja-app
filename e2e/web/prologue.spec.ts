import { expect, test } from '@playwright/test';
import { openOldStall } from './hub';

const KEY = 'game:prata-raja/save';
test.use({ viewport: { width: 360, height: 640 } });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

test('first launch shows six panels before run 1; completion survives reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/play');
  await page.getByTestId('ui-start').click();
  await expect(page.getByTestId('prologue')).toBeVisible();
  expect(await page.evaluate(() => window.__world ?? null)).toBeNull();
  for (let i = 1; i <= 6; i++) {
    await expect(page.locator('.gu-story-hint')).toContainText(`${i} / 6`);
    await expect(page.getByTestId('story-skip')).toBeVisible();
    const caption = page.getByTestId('story-caption');
    expect((await caption.innerText()).split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(await caption.evaluate(e => e.scrollHeight - e.clientHeight)).toBe(0);
    await expect(page.locator('.gu-story-art')).toHaveJSProperty('complete', true);
    expect(await page.locator('.gu-story-art').evaluate(e => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByTestId('story-next').click({ position: { x: 180, y: 300 } });
  }
  await expect(page.getByTestId('prologue')).toHaveCount(0);
  await page.waitForFunction(() => !!window.__world);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).prologueSeen, KEY)).toBe(true);
  await page.reload();
  await page.getByTestId('ui-start').click();
  await expect(page.getByTestId('ui-pause')).toBeVisible();
  await expect(page.getByTestId('prologue')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Skip persists immediately; settings replay returns to stall without starting a run', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await expect(page.getByTestId('ui-pause')).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).prologueSeen, KEY)).toBe(true);
  await page.getByTestId('ui-pause').click();
  await page.getByTestId('ui-quit').click();
  await page.getByTestId('ui-stall').click();
  const before = await page.evaluate(key => localStorage.getItem(key), KEY);
  await page.getByTestId('hub-settings').click();
  await page.getByTestId('settings-story').click();
  await expect(page.getByTestId('prologue')).toBeVisible();
  await expect(page.locator('.gu-story-hint')).toContainText('1 / 6');
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(false);
  await page.getByTestId('story-skip').click();
  await expect(page.getByTestId('hub-overlay')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
  await page.reload();
  await page.getByTestId('ui-start').click();
  await expect(page.getByTestId('hub-overlay')).toBeVisible();
  await expect(page.getByTestId('prologue')).toHaveCount(0);
});

for (const v of [1, 2]) {
  test(`returning v${v} player bypasses story and can replay all six panels`, async ({ page }) => {
    await page.addInitScript(([key, v]) => localStorage.setItem(key, JSON.stringify({ v, runs: 2, gold: 42, wins: 0, bestWave: 3 })), [KEY, v] as const);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/play');
    await page.getByTestId('ui-start').click();
    await expect(page.getByTestId('hub-overlay')).toBeVisible();
    await expect(page.getByTestId('prologue')).toHaveCount(0);
    await openOldStall(page);
    await page.getByTestId('stall-recipes').click();
    await expect(page.getByTestId('stall-locked')).toContainText('Cook evolved breads here from stall level 6.');
    await expect(page.getByTestId('stall-locked')).not.toContainText('Coming soon');
    await page.getByTestId('stall-close').click();
    await page.getByTestId('stall-settings').click();
    await page.getByTestId('settings-story').click();
    expect(await page.locator('.gu-story-art').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
    for (let i = 0; i < 6; i++) await page.getByTestId('story-next').click({ position: { x: 180, y: 300 } });
    await expect(page.getByTestId('stall-coins')).toHaveText('42');
    expect(await page.evaluate(() => window.__world ?? null)).toBeNull();
  });
}
