// The hub workbench (round 8, milestone 4): drag gear onto the tawa, dips into katori, two dips into the curry pot, with undo.
//   RUN_SHOTS=1 npx playwright test -c e2e/web workbench.spec.ts   saves .spike/wb-{gear,dips}.png (shrunk with sips)
import { execFileSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
const SAVE_KEY = 'game:prata-raja/save';
const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), SAVE_KEY);
async function shot(page: Page, name: string) {
  if (process.env.RUN_SHOTS !== '1') return;
  const path = `.spike/wb-${name}.png`;
  await page.screenshot({ path });
  try { execFileSync('sips', ['-Z', '900', path]); } catch { /* not macOS */ }
}
async function dragTo(page: Page, from: string, to: string) {
  await tid(page, to).scrollIntoViewIfNeeded();
  await tid(page, from).scrollIntoViewIfNeeded();
  const a = (await tid(page, from).boundingBox())!;
  const b = (await tid(page, to).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}
async function walkTo(page: Page, x: number, y: number) { await page.mouse.click(x, y); }

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (r) => r.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', (r) => r.fulfill({ json: {} }));
  const item = (uid: string, baseId: string, slot: string) => ({ uid, baseId, slot, rarity: 'common', level: 1, affixes: [] });
  const save = {
    v: 2, runs: 3, wins: 0, bestWave: 4, prologueSeen: true, gold: 2000, stallXp: 4000, signatureBread: 'kosong',
    unlockedDips: ['masala', 'dhal', 'sambal', 'ghee'], inventory: [item('g1', 'plain-headband', 'headband'), item('g2', 'faded-kopitiam-towel', 'towel')],
    materials: { flour: 20, ghee: 20, masala: 20, chilli: 5, curryLeaves: 5 },
  };
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SAVE_KEY, JSON.stringify(save)]);
  await page.goto('/play?seed=5');
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'hub-overlay')).toBeVisible();
});

test('gear onto the hot tawa enhances it, and Undo restores the save', async ({ page }) => {
  await walkTo(page, 62, 480);
  await expect(tid(page, 'hub-panel')).toHaveAttribute('data-station', 'gear');
  await tid(page, 'hub-tab-forge').click();
  await expect(tid(page, 'gear-bench')).toBeVisible();
  const goldBefore = (await stored(page)).gold;
  await dragTo(page, 'wb-item', 'wb-tawa');
  await expect(tid(page, 'wb-undo')).toBeVisible();
  await expect.poll(async () => (await stored(page)).inventory.find((i: { enhance?: number }) => i.enhance)?.enhance).toBe(1);
  await shot(page, 'gear');
  await tid(page, 'wb-undo-btn').click();
  await expect.poll(async () => (await stored(page)).gold).toBe(goldBefore);
  await expect.poll(async () => (await stored(page)).inventory.some((i: { enhance?: number }) => i.enhance)).toBe(false);
});

test('dips: socket into a katori, then fuse in the curry pot (and a bad pair fizzles)', async ({ page }) => {
  await walkTo(page, 340, 600);
  await expect(tid(page, 'hub-panel')).toHaveAttribute('data-station', 'dips');
  await dragTo(page, 'shelf-masala', 'socket-0');
  await expect.poll(async () => (await stored(page)).sockets?.kosong?.[0]).toBe('masala');
  await shot(page, 'dips');
  await tid(page, 'hub-tab-curry-pot').click();
  await tid(page, 'pot-dip-masala').click();
  await tid(page, 'pot-dip-sambal').click();
  await expect(tid(page, 'wb-msg')).toContainText('Not a match');
  await expect.poll(async () => (await stored(page)).fusions).toEqual([]);
  await page.waitForTimeout(1000);
  await dragTo(page, 'pot-dip-masala', 'wb-pot');
  await dragTo(page, 'pot-dip-ghee', 'wb-pot');
  await expect(tid(page, 'wb-msg')).toContainText('Golden masala');
  await expect.poll(async () => (await stored(page)).fusions).toEqual(['golden-masala']);
  await shot(page, 'pot');
});
