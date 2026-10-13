import { expect, type Page, test } from '@playwright/test';

const SAVE_KEY = 'game:prata-raja/save';
const stored = (page: Page) => page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
const tid = (page: Page, id: string) => page.getByTestId(id);

test.use({ viewport: { width: 320, height: 740 } });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

test('URL kitchen selects real builds, live knobs and repeatable boss without writing a save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/play?kitchen=1');
  await expect(tid(page, 'kitchen-sheet')).toBeVisible();
  const before = await stored(page);
  await tid(page, 'kitchen-bread-0').selectOption('golden-ghee-chakra');
  await expect(tid(page, 'kitchen-bread-level-0').locator('option')).toHaveCount(1);
  await tid(page, 'kitchen-bread-1').selectOption('murtabak');
  await tid(page, 'kitchen-bread-level-1').selectOption('5');
  await tid(page, 'kitchen-dip-0').selectOption('fish-curry');
  await tid(page, 'kitchen-dip-level-0').selectOption('5');
  await tid(page, 'kitchen-link-0').selectOption('murtabak');
  await tid(page, 'kitchen-dip-1').selectOption('dhal');
  await expect(tid(page, 'kitchen-link-1')).toBeDisabled();
  await tid(page, 'kitchen-chapter').selectOption('hawker-night');
  await tid(page, 'kitchen-wave').selectOption('10');
  await tid(page, 'kitchen-seed').fill('42');
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => window.__world?.seed === 42);
  expect(await page.evaluate(() => ({ chapter: window.__world!.chapter.id, wave: window.__world!.wave, breads: window.__world!.player.breads.map(b => ({ id: b.id, level: b.level })), dips: window.__world!.player.dips.map(d => ({ id: d.id, level: d.level, linkedBread: d.linkedBread })) }))).toEqual({ chapter: 'hawker-night', wave: 10, breads: [{ id: 'golden-ghee-chakra', level: 1 }, { id: 'murtabak', level: 5 }], dips: [{ id: 'fish-curry', level: 5, linkedBread: 'murtabak' }, { id: 'dhal', level: 1, linkedBread: undefined }] });
  await expect(tid(page, 'kitchen-stats')).toContainText('Damage includes overkill');
  await tid(page, 'kitchen-live').click();
  for (const [key, value] of [['hp', '250'], ['damage', '2'], ['throwSpeed', '2'], ['crit', '0.5'], ['moveFire', '1']]) {
    await tid(page, `kitchen-tune-${key}`).fill(value);
  }
  await expect.poll(() => page.evaluate(() => window.__world!.player.stats.maxHp)).toBe(250);
  expect(await page.evaluate(() => window.__world!.player.stats.throwWhileMoving)).toBe(1);
  await tid(page, 'kitchen-pause').click();
  const time = await page.evaluate(() => window.__world!.time);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__world!.time)).toBe(time);
  await tid(page, 'kitchen-pause').click();
  await tid(page, 'kitchen-restart').click();
  await page.waitForFunction(() => window.__world!.time < 1);
  expect(await page.evaluate(() => window.__world!.seed)).toBe(42);
  expect(await stored(page)).toBe(before);
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="kitchen"] input,[data-testid="kitchen"] button,[data-testid="kitchen"] select')).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < 0 || r.right > innerWidth); }).length);
  expect(overflow).toBe(0);
  await tid(page, 'kitchen-exit').click();
  expect(await stored(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('stall kitchen keeps an existing save unchanged through loss, win, restart and quit; normal play still pays', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click();
  await tid(page, 'ui-stall').click();
  const before = await stored(page);
  await tid(page, 'stall-kitchen').click();
  await tid(page, 'kitchen-wave').selectOption('10');
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => window.__world?.wave === 10);
  await page.evaluate(() => { window.__world!.player.hp = 0; });
  await expect(page.getByText('Kannan needs a breather', { exact: true })).toBeVisible();
  expect(await stored(page)).toBe(before);
  await tid(page, 'kitchen-restart').click();
  await page.waitForFunction(() => window.__world!.phase === 'wave');
  await page.evaluate(() => { const w = window.__world!; w.enemies.length = 0; w.budgetLeft = 0; w.waveTime = 10000; });
  await expect(page.getByText('Taste test complete', { exact: true })).toBeVisible();
  expect(await stored(page)).toBe(before);
  await tid(page, 'kitchen-restart').click();
  await page.waitForFunction(() => window.__world!.phase === 'wave');
  await tid(page, 'kitchen-exit').click();
  await expect(tid(page, 'stall-hub')).toBeVisible();
  expect(await stored(page)).toBe(before);
  await tid(page, 'stall-start').click();
  await expect(tid(page, 'ui-pause')).toBeVisible();
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click();
  await expect(tid(page, 'results')).toBeVisible();
  await expect.poll(async () => JSON.parse((await stored(page))!).runs).toBe(JSON.parse(before!).runs + 1);
});
