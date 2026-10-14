import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'game:prata-raja/save';
const tid = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true }).first();
const stored = (page: Page) => page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
const legacy = { v: 2, runs: 1, bestWave: 2, gold: 10, wins: 0, totalKills: 10, prologueSeen: true, settings: { sfx: false, music: false, haptics: false } };

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});
async function seed(page: Page, over = {}) {
  await page.addInitScript(([k, value]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, value); }, [SAVE_KEY, JSON.stringify({ ...legacy, ...over })]);
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'stall-hub')).toBeVisible();
}
async function unobscured(page: Page, id: string) {
  const control = tid(page, id);
  await expect(control).toBeVisible();
  expect(await control.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el === hit || el.contains(hit); }), id).toBe(true);
}

for (const [width, height] of [[320, 480], [360, 640]]) {
  test(`legacy collection and all stall controls are reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seed(page);
    for (const id of ['stall-dips', 'stall-signature', 'stall-kitchen', 'stall-tell', 'stall-start', 'stall-chests', 'stall-calendar', 'stall-training', 'stall-special', 'stall-recipes', 'stall-gear', 'stall-idle']) await unobscured(page, id);
    await page.screenshot({ path: `.spike/dip-simmer/hub-${width}x${height}.png` });
    await tid(page, 'stall-dips').click();
    await expect(tid(page, 'dip-collection')).toContainText('Links begin with Signature at stall level 9');
    await expect(tid(page, 'collection-mint-chutney')).toContainText('Simmer 1 / 20 · +0% chill duration');
    await expect(tid(page, 'collection-chicken-curry')).toContainText('Available at stall level 2');
    await expect(tid(page, 'collection-sambal')).toContainText('Cook in Recipes from stall level 6');
    await page.screenshot({ path: `.spike/dip-simmer/collection-top-${width}x${height}.png` });
    await tid(page, 'collection-fish-curry').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.spike/dip-simmer/collection-bar-${width}x${height}.png` });
    await tid(page, 'collection-dhal').scrollIntoViewIfNeeded();
    await expect(tid(page, 'collection-dhal')).toBeInViewport();
    expect(await page.evaluate(() => { const sheet = document.querySelector('[data-testid="stall-sheet"]')!; return sheet.scrollWidth > sheet.clientWidth; })).toBe(false);
    await page.screenshot({ path: `.spike/dip-simmer/collection-bottom-${width}x${height}.png` });
    await tid(page, 'stall-close').click();
  });
}

test('two earned receipts, duplicate result guard, collection reload and Kitchen save isolation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await seed(page, { stallXp: 5000, signatureBread: 'kosong', unlocks: { signature: true }, dipXp: { 'mint-chutney': 39, 'condensed-milk': 39 } });
  await tid(page, 'stall-start').click();
  await expect(tid(page, 'ui-pause')).toBeVisible();
  await page.evaluate(() => {
    const w = window.__world!;
    w.player.dips = [{ id: 'mint-chutney', level: 5, linkedBread: 'kosong' }, { id: 'condensed-milk', level: 5, linkedBread: 'kosong' }];
    w.wave = 2; w.player.hp = 0; w.dipUseXp = { 'mint-chutney': 15, 'condensed-milk': 15 };
  });
  await expect(tid(page, 'results-dip-mint-chutney')).toContainText('Mint Chutney · +15 simmer XP');
  await expect(tid(page, 'results-dip-condensed-milk')).toContainText('sticky slow duration');
  await expect(tid(page, 'results-dip-mint-chutney')).toContainText('14 / 50 to Simmer 3');
  for (const id of ['mint-chutney', 'condensed-milk']) expect((await tid(page, `results-dip-${id}`).boundingBox())!.height).toBeLessThan(130);
  await page.screenshot({ path: '.spike/dip-simmer/results-top-360x640.png' });
  await tid(page, 'results-dip-condensed-milk').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.spike/dip-simmer/results-receipts-360x640.png' });
  expect(await page.evaluate(() => { const el = document.querySelector('[data-testid="results"]')!; return el.scrollWidth > el.clientWidth; })).toBe(false);
  await expect.poll(async () => JSON.parse((await stored(page))!).dipXp).toEqual({ 'mint-chutney': 54, 'condensed-milk': 54 });
  const paid = await stored(page);
  await page.evaluate(() => { window.__hub!.emit('runEnd', window.__world!.result!); window.__hub!.emit('runEnd', window.__world!.result!); });
  await page.waitForTimeout(200); expect(await stored(page)).toBe(paid);
  await page.reload(); await tid(page, 'ui-start').click();
  await tid(page, 'stall-dips').click();
  await expect(tid(page, 'collection-mint-chutney')).toContainText('Simmer 2 / 20 · +0.5% chill duration');
  await expect(tid(page, 'collection-mint-chutney')).toContainText('14 / 50 to Simmer 3');
  await tid(page, 'collection-mint-chutney').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.spike/dip-simmer/collection-earned-360x640.png' });
  await tid(page, 'stall-close').click();
  const beforeKitchen = await stored(page);
  await tid(page, 'stall-kitchen').click();
  await tid(page, 'kitchen-dip-0').selectOption('mint-chutney');
  await tid(page, 'kitchen-dip-level-0').selectOption('5');
  await tid(page, 'kitchen-link-0').selectOption('kosong');
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => !!window.__world && window.__world.phase === 'wave');
  expect(await page.evaluate(() => window.__world!.loadout?.dipSimmer)).toBeUndefined();
  await page.evaluate(() => { window.__world!.player.hp = 0; });
  await expect(page.getByText('Kannan needs a breather', { exact: true })).toBeVisible();
  await tid(page, 'kitchen-restart').click();
  await page.waitForFunction(() => window.__world!.phase === 'wave');
  await tid(page, 'kitchen-exit').click();
  expect(await stored(page)).toBe(beforeKitchen);
});

for (const wave of [1, 2]) {
  test(`Pause then End run preserves actual linked-hit use on wave ${wave}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seed(page, { stallXp: 5000, signatureBread: 'kosong', unlocks: { signature: true }, dipXp: { 'mint-chutney': 39, 'condensed-milk': 39 } });
    await tid(page, 'stall-start').click();
    await page.waitForFunction(() => window.__world?.phase === 'wave');
    // Fix the acquired build, then let real projectile hits earn use through the simulation.
    await page.evaluate(wave => {
      const w = window.__world!;
      w.wave = wave;
      w.player.dips = [{ id: 'mint-chutney', level: 1, linkedBread: 'kosong' }, { id: 'condensed-milk', level: 1, linkedBread: 'kosong' }];
    }, wave);
    await page.waitForFunction(() => (window.__world?.dipUseXp?.['mint-chutney'] ?? 0) > 0 && (window.__world?.dipUseXp?.['condensed-milk'] ?? 0) > 0, undefined, { timeout: 30_000 });
    await tid(page, 'ui-pause').click();
    const earned = await page.evaluate(() => ({ ...window.__world!.dipUseXp }));
    await tid(page, 'ui-quit').click();
    await expect(tid(page, 'results')).toBeVisible();
    expect(await page.evaluate(() => window.__world!.result!.dipUseXp)).toEqual(earned);
    if (wave === 2) {
      await expect.poll(async () => JSON.parse((await stored(page))!).dipXp).toEqual({
        'mint-chutney': 39 + earned['mint-chutney']!, 'condensed-milk': 39 + earned['condensed-milk']!,
      });
      for (const id of ['mint-chutney', 'condensed-milk']) await expect(tid(page, `results-dip-${id}`)).toContainText(`+${earned[id as keyof typeof earned]} simmer XP`);
    } else {
      await expect(tid(page, 'results-short')).toBeVisible();
      expect(JSON.parse((await stored(page))!).dipXp).toEqual({ 'mint-chutney': 39, 'condensed-milk': 39 });
      await expect(page.locator('[data-testid^="results-dip-"]')).toHaveCount(0);
    }
    const paid = await stored(page);
    await page.evaluate(() => window.__hub!.emit('runEnd', window.__world!.result!));
    await page.waitForTimeout(200);
    expect(await stored(page)).toBe(paid);
  });
}
