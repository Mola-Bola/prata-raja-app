import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 740 } });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

test('Kitchen displays tags, family, fit and bonus for selected links', async ({ page }) => {
  await page.goto('/play?kitchen=1');
  await page.getByTestId('kitchen-setup').click();
  await expect(page.getByTestId('kitchen-sheet')).toBeVisible();
  await expect(page.getByTestId('kitchen-tags-0')).toHaveText('Thrown · Crisp');
  await page.getByTestId('kitchen-dip-0').selectOption('fish-curry');
  const fit = page.getByTestId('kitchen-fit-0');
  await expect(fit).toContainText('Curries · Spice');
  await expect(fit).toContainText('Fits: Lob · Heat · Stuffed');
  await expect(fit).toContainText('Global effect');
  await page.getByTestId('kitchen-link-0').selectOption('kosong');
  await expect(fit).toContainText('No tag bonus');
  await page.getByTestId('kitchen-bread-1').selectOption('inferno-bomb');
  await expect(page.getByTestId('kitchen-tags-1')).toHaveText('Lob · Area · Heat');
  await page.getByTestId('kitchen-link-0').selectOption('inferno-bomb');
  await expect(fit).toContainText('+25% tag bonus');
  await page.getByTestId('kitchen-dip-1').selectOption('masala');
  await expect(page.getByTestId('kitchen-fit-1')).toContainText('Specials · Mixed');
  await expect(page.getByTestId('kitchen-link-1')).toBeDisabled();
});

test('normal level-up cards keep effect and scope visible beside real fit and bonus', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world);
  await page.evaluate(() => {
    window.__hub!.emit('levelUp', { level: 2, rerolls: 1, offer: [
      { kind: 'dip', id: 'fish-curry', level: 1, linkedBread: 'inferno-bomb' },
      { kind: 'dip', id: 'fish-curry', level: 2, linkedBread: 'kosong' },
      { kind: 'dip', id: 'condensed-milk', level: 1 },
    ] });
  });
  const matching = page.getByTestId('ui-card-0');
  await expect(matching).toContainText('Burns over time');
  await expect(matching).toContainText('Linked to Roti Bomb');
  await expect(matching).toContainText('Curries · Spice');
  await expect(matching).toContainText('Fits: Lob · Heat · Stuffed');
  await expect(matching).toContainText('+25% tag bonus');
  await expect(page.getByTestId('ui-card-1')).toContainText('No tag bonus');
  await expect(page.getByTestId('ui-card-2')).toContainText('All breads');
  await expect(page.getByTestId('ui-card-2')).toContainText('Specials · Mixed');
  await expect(page.getByTestId('ui-card-2')).toBeVisible();
  expect(await page.locator('.gu-card').evaluateAll(cards => cards.every(card => card.scrollHeight <= card.clientHeight + 1 && card.scrollWidth <= card.clientWidth + 1))).toBe(true);
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('.gu-card-text > span')).filter(el => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || el.scrollWidth > el.clientWidth + 1; }).length);
  expect(overflow).toBe(0);
});
