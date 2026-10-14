import { expect, test } from '@playwright/test';
import { CONTENT } from '../../src/content';
import { computeStats } from '../../src/core/stats';
import type { GameEvent, World } from '../../src/core/types';

type Probe = {
  paused: boolean;
  publishHud(w: World, dt: number): void;
  handle(w: World, events: GameEvent[]): void;
  choose(index: number): void;
};

for (const viewport of [{ width: 320, height: 480 }, { width: 390, height: 844 }]) {
  test.describe(`current build at ${viewport.width}`, () => {
    test.use({ viewport });
    test('owned levels, current effects, pause, upgrade and clean transitions', async ({ page }) => {
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
      await page.goto('/play?seed=123');
      await page.getByTestId('ui-start').click();
      await page.getByTestId('story-skip').click();
      await page.waitForFunction(() => !!window.__world);
      const stats = computeStats([{ id: 'strong-wrists', level: 3 }, { id: 'fast-flip', level: 2 }, { id: 'hot-tawa', level: 2 }], CONTENT);
      await page.evaluate(stats => {
        window.__game!.loop.sleep();
        const scene = window.__game!.scene.getScene('RunScene') as unknown as Probe;
        const w = window.__world!;
        w.time = 2;
        w.player.breads = [
          { id: 'kosong', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 },
          { id: 'roti-bomb', level: 3, cd: 0, volleyLeft: 0, volleyT: 0 },
          { id: 'thosai-typhoon', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 },
        ];
        w.player.dips = [{ id: 'fish-curry', level: 2, linkedBread: 'roti-bomb' }, { id: 'ghee', level: 3 }, { id: 'mint-chutney', level: 4 }, { id: 'chicken-curry', level: 2 }];
        w.player.passives = [{ id: 'strong-wrists', level: 3 }, { id: 'fast-flip', level: 2 }, { id: 'hot-tawa', level: 2 }];
        w.player.stats = stats;
        w.player.buffs = [{ id: 'spin', time: 2.5, stacks: 0, hitCount: 0 }, { id: 'stackDmg', time: 1.5, stacks: 3, hitCount: 0 }, { id: 'haste', time: 0, stacks: 0, hitCount: 2 }];
        w.loadout = { dipSimmer: { 'fish-curry': 10 } };
        scene.handle(w, [{ t: 'hit', uid: -1, x: 0, y: 200, dmg: 1000, crit: false, color: null }, { t: 'dot', uid: -1, x: 0, y: 200, dmg: 20, color: '#ffffff' }]);
        scene.publishHud(w, 1);
      }, stats);
      await expect(page.getByTestId('run-dps')).toHaveText('DPS 510.0');
      const storedBefore = await page.evaluate(() => localStorage.getItem('game:prata-raja/save'));
      await page.getByTestId('ui-pause').click();
      await page.getByTestId('ui-build').click();
      await expect(page.getByTestId('build-bread-kosong')).toContainText('L1');
      await expect(page.getByTestId('build-bread-kosong')).toContainText('Damage');
      await expect(page.getByTestId('build-bread-thosai-typhoon')).toContainText('L1');
      await expect(page.getByTestId('build-dip-fish-curry')).toContainText('Roti Bomb');
      await expect(page.getByTestId('build-dip-fish-curry')).toContainText('Burn 6.27/s · 3.75s');
      await expect(page.getByTestId('build-dip-ghee')).toContainText('All breads');
      await expect(page.getByTestId('build-passive-strong-wrists')).toContainText('Hit damage +18%');
      await expect(page.getByTestId('build-effective')).toContainText('Current crit damage ×1.8');
      await expect(page.getByTestId('run-build')).toContainText('including overkill');
      await expect(page.getByTestId('run-build')).toContainText('Ghee · 2.5s left');
      await expect(page.getByTestId('run-build')).not.toContainText('Teh Tarik ·');
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => window.__world!.time)).toBe(2);
      await expect(page.getByTestId('build-dps')).toHaveText('510.0');
      const layout = await page.getByRole('dialog', { name: 'Current build' }).evaluate(el => {
        const r = el.getBoundingClientRect(); const body = el.querySelector('[data-testid="run-build"]')!;
        const buttons = Array.from(el.querySelectorAll('button')).map(b => { const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, scrollable: body.scrollHeight > body.clientHeight, overflow: body.scrollWidth > body.clientWidth, buttons };
      });
      expect(layout.left).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(viewport.width);
      expect(layout.top).toBeGreaterThanOrEqual(0); expect(layout.bottom).toBeLessThanOrEqual(viewport.height);
      expect(layout.scrollable).toBe(true); expect(layout.overflow).toBe(false);
      for (const button of layout.buttons) { expect(button.top).toBeGreaterThanOrEqual(0); expect(button.bottom).toBeLessThanOrEqual(viewport.height); }
      await page.screenshot({ path: test.info().outputPath(`run-build-${viewport.width}.png`) });
      await page.getByTestId('build-resume').click();
      expect(await page.evaluate(() => (window.__game!.scene.getScene('RunScene') as unknown as Probe).paused)).toBe(false);
      await page.evaluate(() => {
        const w = window.__world!;
        w.phase = 'levelup'; w.pendingLevelUps = 1; w.offer = [{ kind: 'bread', id: 'kosong', level: 2 }];
        (window.__game!.scene.getScene('RunScene') as unknown as Probe).choose(0);
      });
      await page.getByTestId('ui-pause').click(); await page.getByTestId('ui-build').click();
      await expect(page.getByTestId('build-bread-kosong')).toContainText('L2');
      await expect(page.getByTestId('build-bread-kosong')).toContainText('Damage');
      expect(await page.evaluate(() => localStorage.getItem('game:prata-raja/save'))).toBe(storedBefore);
      await page.getByTestId('build-back').click();
      await expect(page.getByTestId('ui-resume')).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Sound' })).toBeAttached();
      await page.getByTestId('ui-restart').click();
      await expect(page.getByTestId('run-build')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => window.__world!.time)).toBeLessThan(2);
      await page.getByTestId('ui-pause').click(); await page.getByTestId('ui-build').click();
      await expect(page.getByTestId('build-dps')).toHaveText('0.0');
      await expect(page.getByTestId('run-build')).toContainText('No dips picked yet');
      await expect(page.getByTestId('run-build')).toContainText('No passives picked yet');
      await page.getByTestId('build-back').click(); await page.getByTestId('ui-quit').click();
      await expect(page.getByTestId('results')).toBeVisible();
      await expect(page.getByTestId('run-build')).toHaveCount(0);
    });
  });
}

test('both chapter bosses use their real content sprite in the HUD', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
  await page.goto('/play?seed=123');
  await page.getByTestId('ui-start').click(); await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world);
  await page.evaluate(() => window.__game!.loop.sleep());
  const portraits: string[] = [];
  for (const id of ['king-cockroach', 'burger-baron']) {
    await page.evaluate(id => {
      const w = window.__world!, def = w.content.bosses[id];
      w.enemies = [{ def, boss: true, state: 'idle', hp: 100, maxHp: 200 } as unknown as World['enemies'][number]];
      (window.__game!.scene.getScene('RunScene') as unknown as Probe).publishHud(w, 1);
    }, id);
    const img = page.getByTestId('boss-portrait');
    await expect(page.locator('.gu-boss-name')).toHaveText(CONTENT.bosses[id].name);
    await expect(img).toHaveAttribute('src', new RegExp(id));
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    portraits.push((await img.getAttribute('src'))!);
  }
  expect(portraits[0]).not.toBe(portraits[1]);
});
