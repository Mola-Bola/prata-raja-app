import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
const SAVE_KEY = 'game:prata-raja/save';

test('choose a signature, persist it, and start a level-one Murtabak run', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      v: 2, runs: 1, wins: 0, bestWave: 2, prologueSeen: true, stallXp: 3100, unlockedBreads: ['murtabak'], bossAttempts: {},
    }));
  }, SAVE_KEY);
  await page.goto('/play?seed=11');
  await expect(page.getByTestId('ui-start')).toHaveText('Open the stall');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('stall-signature').click();
  await page.getByTestId('signature-murtabak').click();
  await expect(page.getByTestId('signature-murtabak')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).signatureBread, SAVE_KEY)).toBe('murtabak');
  await page.reload();
  await page.getByTestId('ui-start').click();
  await expect(page.getByTestId('stall-signature')).toContainText('Murtabak');
  await page.getByTestId('stall-start').click();
  await expect.poll(() => page.evaluate(() => window.__world?.player.breads.map(b => ({ id: b.id, level: b.level })))).toEqual([{ id: 'murtabak', level: 1 }]);
  expect(await page.evaluate(() => window.__world?.loadout?.signatureBread)).toBe('murtabak');
});

test('a chunk failure reloads once and does not loop', async ({ page }) => {
  let chunks = 0;
  await page.route('**/GameRoot-*.js', route => {
    chunks++;
    return chunks === 1 ? route.fulfill({ status: 404, body: 'Not found' }) : route.continue();
  });
  await page.goto('/play');
  await page.waitForFunction(() => sessionStorage.getItem('chunk-reload-once') === '1' && !!window.__hub);
  expect(chunks).toBeGreaterThanOrEqual(2);
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { error: Object.assign(new Error('GameRoot-old.js'), { name: 'AsyncRequireError' }) })));
  await page.waitForTimeout(300);
  expect(navigations).toBe(0);
});
