// The stall (S2): a run's payout, the hub and every sheet, a training step showing up in the next run, a 0.1.x save moving
// to v2, and the hub's props lining up with their tap areas on different phone shapes. The game is at /play, signed out; the
// app's own server calls are mocked so only the game can fail this. Needs only the web build (bash scripts/check.sh --web).
//
//   RUN_SHOTS=1 npx playwright test -c e2e/web stall.spec.ts   also saves .spike/s2-{hub,gear,results}.png (shrunk with sips)
import { execFileSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';
import { openStation, type Station } from './hub';

test.use({ viewport: { width: 390, height: 844 } });

const SAVE_KEY = 'game:prata-raja/save';
const HOUR = 3_600_000;

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();
const all = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`);
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), SAVE_KEY);

/** Collect console errors and page errors; the game must go through all of this without one. */
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function shot(page: Page, name: string): Promise<void> {
  if (process.env.RUN_SHOTS !== '1') return;
  const path = `.spike/s2-${name}.png`;
  await page.screenshot({ path });
  try {
    execFileSync('sips', ['-Z', '900', path]);
  } catch {
    // not macOS: keep the full-size picture
  }
}

/** A player a few runs in: stall level 2 (320 XP, so the next run crosses 350 and unlocks training), 50 coins, 5 hours of tips
 *  in the jar, three plain headbands (a merge), a towel, no gift claimed yet. */
function seed(over: Record<string, unknown> = {}) {
  const now = Date.now();
  const item = (uid: string, baseId: string, slot: string) => ({ uid, baseId, slot, rarity: 'common', level: 1, affixes: [] });
  return {
    v: 2, bestWave: 2, runs: 1, wins: 0, gold: 50, totalKills: 40, lastPlayed: new Date(now - 5 * HOUR).toISOString(),
    settings: { sfx: true, music: true, haptics: true }, stallXp: 320,
    inventory: [item('t1', 'plain-headband', 'headband'), item('t2', 'plain-headband', 'headband'), item('t3', 'plain-headband', 'headband'), item('t4', 'faded-kopitiam-towel', 'towel')],
    equipped: {}, training: { wrist: 0, stamina: 0, flip: 0 },
    materials: { flour: 0, ghee: 0, egg: 0, onion: 0, spice: 0, sugar: 0, milk: 0 },
    streak: { day: 0, lastClaimDay: null, windowStartDay: null, restDaysUsed: 0 },
    idle: { lastCollectedAt: new Date(now - 5 * HOUR).toISOString() }, chestPity: { rare: 0, epic: 0, opened: 0 },
    unlocks: {}, pendingChests: [],
    ...over,
  };
}
/** Put a save in storage before the game loads (once: a reload keeps what the game wrote since). */
const withSave = (page: Page, save: unknown) =>
  page.addInitScript(([k, v]) => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, v);
  }, [SAVE_KEY, JSON.stringify(save)]);

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: {} }));
});

const inSheet = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[data-testid="hub-panel"]'));
/** A hub station's sheet: walk to the station and open the named tab (the sheets live in the hub panels, HubOverlay.tsx). */
const openSheet = async (page: Page, station: Station, tab: string) => {
  await openStation(page, station, tab);
  await expect(tid(page, 'hub-panel')).toBeVisible();
};
const closeSheet = async (page: Page) => {
  await tid(page, 'hub-close').click();
  await expect(all(page, 'hub-panel')).toHaveCount(0);
};

test('a run pays once; the stall and every sheet work; a training step shows up in the next run', async ({ page }) => {
  test.setTimeout(480_000);
  const errors = watch(page);
  const start = seed();
  await withSave(page, start);
  // ?bot=1 plays by itself and starts at once; ?seed fixes the run; ?speed runs the sim faster than real time.
  await page.goto('/play?bot=1&seed=3&speed=6');

  // ── Run 1 ends: the wake-up screen shows the payout ───────────────────────────────────────────────────────────
  await expect(tid(page, 'ui-again')).toBeVisible({ timeout: 300_000 });
  const run = await page.evaluate(() => window.__world!.result!);
  const waves = Math.max(0, run.wave - (run.won ? 0 : 1)); // on a loss the reached wave was not cleared
  const coins = 20 + 12 * waves + 60 * run.bossKills + run.gold; // the waves, plus the run's own coins (Tips bonus included)
  const xp = 40 + 10 * waves + 50 * run.bossKills + Math.floor(run.kills / 4); // kannan.ts runXp: kills count a quarter each
  await expect(tid(page, 'results-coins')).toHaveText(`+${coins}`);
  await expect(tid(page, 'results-xp')).toHaveText(`+${xp}`);
  await expect(tid(page, 'results-unlocks')).toContainText('Training unlocked!'); // 320 XP + any run crosses 350
  await expect(tid(page, 'results-chest')).toContainText('Chest earned');
  expect(await tid(page, 'results').innerText()).toContain(String(run.kills));
  expect(await page.evaluate(() => window.__world!.loadout?.startBread)).toBe('kosong'); // the bot starts like the Start button
  await expect(tid(page, 'stall-level')).toHaveText('3', { timeout: 5_000 }); // the bar fills, crosses a level, and ends on 3
  await expect(tid(page, 'stall-next')).toHaveText(`Next: Extra reroll in ${600 - (320 + xp)} XP`);
  await page.waitForTimeout(1_500);
  await shot(page, 'results');
  // The wake-up screen covers the canvas, so the game loop is asleep behind it (and stays so in the stall) until a run starts.
  await page.waitForFunction(() => !window.__game!.loop.running);

  // Paid exactly once, to the coin.
  await expect.poll(async () => (await stored(page))?.runs).toBe(2);
  const paid = await stored(page);
  expect(paid.v).toBe(3);
  expect(paid.gold).toBe(start.gold + coins);
  expect(paid.stallXp).toBe(start.stallXp + xp);
  expect(paid.totalKills).toBe(start.totalKills + run.kills);
  expect(paid.pendingChests).toHaveLength(1);
  expect(paid.inventory).toHaveLength(start.inventory.length + 1);
  const grains = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  expect(grains(paid.materials) - grains(start.materials)).toBe(Math.floor(waves / 5) * 2);
  // The same run ending again (a replayed event, a double tap) pays nothing: the save does not change at all.
  await page.evaluate(() => {
    window.__hub!.emit('runEnd', window.__world!.result!);
    window.__hub!.emit('runEnd', window.__world!.result!);
  });
  await page.waitForTimeout(400);
  expect(await stored(page)).toEqual(paid);
  await expect(tid(page, 'results-coins')).toHaveText(`+${coins}`);

  // ── The stall ─────────────────────────────────────────────────────────────────────────────────────────────────
  await tid(page, 'ui-stall').click();
  await expect(tid(page, 'hub-overlay')).toBeVisible();
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(false);
  await expect(tid(page, 'hub-coins')).toHaveText(String(paid.gold));
  await page.waitForTimeout(500);
  await shot(page, 'hub');
  let gold = paid.gold;

  // Calendar: day 1 is 50 coins, and a double tap claims it once.
  await openSheet(page, 'orders', 'Calendar');
  await tid(page, 'calendar-claim').dblclick();
  await expect.poll(async () => (await stored(page)).gold).toBe((gold += 50));
  await expect(tid(page, 'calendar-claim')).toBeDisabled();
  // The button that had focus just disabled itself: focus must stay inside the sheet, Tab included.
  await expect.poll(() => inSheet(page)).toBe(true);
  await page.keyboard.press('Tab');
  expect(await inSheet(page)).toBe(true);
  expect((await stored(page)).streak.day).toBe(1);
  await closeSheet(page);

  // Tip jar: five hours at 24 coins an hour (stall level 3), collected once.
  await openSheet(page, 'pantry', 'Tip jar');
  const waiting = Number((await tid(page, 'idle-waiting').innerText()).match(/\d+/)![0]);
  expect(waiting).toBeGreaterThanOrEqual(115);
  await tid(page, 'idle-collect').dblclick();
  await expect.poll(async () => (await stored(page)).gold - gold).toBeGreaterThanOrEqual(waiting);
  const collected = (await stored(page)).gold - gold;
  expect(collected).toBeLessThanOrEqual(waiting + 2);
  gold += collected;
  await expect(tid(page, 'idle-collect')).toBeDisabled();
  await closeSheet(page);

  // Gear: wear the towel and a headband, merge the three headbands into one Uncommon, upgrade the towel.
  await openSheet(page, 'gear', 'Wear');
  const rack = all(page, 'gear-item');
  await expect(rack).toHaveCount(4); // the run's chest is still closed: its item is not on the rack yet
  await rack.filter({ hasText: 'Faded kopitiam towel' }).click();
  await expect.poll(async () => (await stored(page)).equipped.towel).toBe('t4');
  await rack.filter({ hasText: 'Plain headband' }).first().click();
  await expect.poll(async () => Object.keys((await stored(page)).equipped).sort()).toEqual(['headband', 'towel']);
  await tid(page, 'gear-merge').click();
  await expect(rack).toHaveCount(2);
  await expect(rack.filter({ hasText: 'Uncommon' })).toHaveCount(1);
  const merged = await stored(page);
  expect(merged.inventory.filter((i: { baseId: string }) => i.baseId === 'plain-headband')).toHaveLength(1);
  expect(merged.equipped.headband).toBe(merged.inventory.find((i: { baseId: string }) => i.baseId === 'plain-headband').uid); // wearing the merged one
  await rack.filter({ hasText: 'Faded kopitiam towel' }).click();
  await tid(page, 'gear-upgrade').click();
  await expect.poll(async () => (await stored(page)).gold).toBe((gold -= 40));
  expect((await stored(page)).inventory.find((i: { uid: string }) => i.uid === 't4').level).toBe(2);
  await shot(page, 'gear');
  await closeSheet(page);

  // Chests: the run's chest opens with a reveal, and the item joins the rack.
  await openSheet(page, 'pantry', 'Chests');
  await expect(all(page, 'chest-open')).toHaveCount(1);
  await tid(page, 'chest-open').click();
  await expect(tid(page, 'chest-reveal')).toBeVisible();
  await expect(all(page, 'chest-open')).toHaveCount(0);
  expect((await stored(page)).pendingChests).toEqual([]);
  await closeSheet(page);
  await openSheet(page, 'gear', 'Wear');
  await expect(rack).toHaveCount(3);
  await closeSheet(page);

  // Training: one step of Stamina (+10 HP) for 60 coins.
  await openSheet(page, 'spec', 'Training');
  await tid(page, 'train-stamina-buy').click();
  await expect.poll(async () => (await stored(page)).training.stamina).toBe(1);
  expect((await stored(page)).gold).toBe(gold - 60);
  await tid(page, 'train-respec').click(); // free: every coin comes back
  await expect.poll(async () => (await stored(page)).training.stamina).toBe(0);
  expect((await stored(page)).gold).toBe(gold);
  await expect(tid(page, 'train-respec')).toBeDisabled();
  await tid(page, 'train-stamina-buy').click();
  await expect.poll(async () => (await stored(page)).training.stamina).toBe(1);
  expect((await stored(page)).gold).toBe(gold - 60);
  await closeSheet(page);

  // The recipe book and Chef's Special are locked previews.
  await openSheet(page, 'tawa', 'Recipes');
  await expect(tid(page, 'stall-locked')).toContainText('Unlocks at stall level 6');
  await closeSheet(page);

  // ── Run 2 starts with the stall's gear and training ────────────────────────────────────────────────────────────
  await tid(page, 'hub-go').click();
  await expect(tid(page, 'ui-pause')).toBeVisible();
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(true); // the run woke the loop
  const loadout = await page.evaluate(() => ({ loadout: window.__world!.loadout, maxHp: window.__world!.player.stats.maxHp }));
  expect(loadout.maxHp).toBe(110);
  expect(loadout.loadout!.stats!.maxHp).toBe(10);
  expect(loadout.loadout!.stats!.dmgPct).toBeCloseTo(0.03 * 1.3, 4); // the merged Uncommon headband
  expect(loadout.loadout!.stats!.critChance).toBeCloseTo(0.02 * 1.1, 4); // the Common towel, upgraded to level 2
  await expect(page.locator('.gu-hp')).toHaveAttribute('aria-label', /of 110 HP/); // the HUD shows it

  // Ending run 2 early pays it too (once it is past wave 1), and the stall shows the new totals.
  gold -= 60;
  const before2 = await stored(page);
  expect(before2.gold).toBe(gold);
  await page.waitForFunction(() => window.__world!.wave >= 2, null, { timeout: 120_000 });
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click(); await tid(page, 'ui-quit-confirm').click();
  await expect(tid(page, 'ui-again')).toBeVisible();
  const early = await page.evaluate(() => window.__world!.result!);
  expect(early.won).toBe(false);
  expect(early.wave).toBeGreaterThanOrEqual(2);
  const coins2 = 20 + 12 * Math.max(0, early.wave - 1) + early.gold;
  const xp2 = 40 + 10 * Math.max(0, early.wave - 1) + Math.floor(early.kills / 4);
  await expect(tid(page, 'results-coins')).toHaveText(`+${coins2}`);
  await expect.poll(async () => (await stored(page)).runs).toBe(3);
  const second = await stored(page);
  expect(second.gold).toBe(before2.gold + coins2);
  expect(second.stallXp).toBe(before2.stallXp + xp2);
  expect(second.pendingChests).toHaveLength(1); // run 2's chest, still closed (run 1's was opened)
  await page.evaluate(() => window.__hub!.emit('runEnd', window.__world!.result!));
  await page.waitForTimeout(300);
  expect(await stored(page)).toEqual(second);
  expect(errors).toEqual([]);
});

test('a first launch starts run 1 at once; a returning player opens the stall; a 0.1.x save moves to v2 with its coins', async ({ page }) => {
  const errors = watch(page);
  const v1 = { v: 1, bestWave: 5, runs: 4, wins: 1, gold: 123, totalKills: 90, lastPlayed: new Date(Date.now() - 2 * HOUR).toISOString(), settings: { sfx: false, music: true, haptics: false } };
  await withSave(page, v1);
  await page.goto('/play');
  await expect(tid(page, 'ui-start')).toHaveText('Continue');
  await expect(tid(page, 'ui-start')).toBeEnabled();
  expect(await stored(page)).toEqual(v1); // reading it changed nothing on disk
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'hub-overlay')).toBeVisible();
  expect(await page.evaluate(() => window.__world ?? null)).toBeNull(); // no run was started
  await expect(tid(page, 'hub-coins')).toHaveText('123');
  // The first change writes the v2 save, with everything the v1 one had.
  await openSheet(page, 'orders', 'Calendar');
  await tid(page, 'calendar-claim').click();
  await expect.poll(async () => (await stored(page)).v).toBe(3);
  expect(await stored(page)).toMatchObject({ v: 3, gold: 173, runs: 4, wins: 1, bestWave: 5, totalKills: 90, settings: v1.settings, stallXp: 0 });
  await closeSheet(page);
  expect(errors).toEqual([]);

  // After a restart the same save loads: nothing was lost, and the gift is still claimed.
  await page.reload();
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'hub-coins')).toHaveText('173');
  await openSheet(page, 'orders', 'Calendar');
  await expect(tid(page, 'calendar-claim')).toBeDisabled();
});

// A run that ended on wave 1 pays nothing and says so (the whole message fits, buttons on screen).
test('a daydream that ends on wave 1 says so and pays nothing, on a 9:16 phone too', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const errors = watch(page);
  const start = seed({ runs: 3 });
  await withSave(page, start);
  await page.goto('/play?seed=3');
  await tid(page, 'ui-start').click();
  await tid(page, 'hub-go').click();
  await page.waitForFunction(() => !!window.__world);
  await page.evaluate(() => window.__hub!.emit('runEnd', { won: false, wave: 1, kills: 4, bossKills: 0, time: 20, level: 1, gold: 999, breads: [], dips: [] }));
  await expect(tid(page, 'ui-again')).toBeVisible();
  await expect(tid(page, 'results-short')).toHaveText('Too short a daydream. Go a little further for tips.');
  await expect(all(page, 'results-coins')).toHaveCount(0);
  await expect(all(page, 'results-rewards')).toHaveCount(0);
  for (const id of ['ui-again', 'ui-stall']) {
    const r = (await tid(page, id).boundingBox())!;
    expect(r.y + r.height, id).toBeLessThanOrEqual(640);
  }
  await expect.poll(async () => (await stored(page)).runs).toBe(start.runs + 1);
  expect(await stored(page)).toMatchObject({ gold: start.gold, stallXp: start.stallXp, pendingChests: [], totalKills: start.totalKills + 4 });
  expect((await stored(page)).inventory).toHaveLength(start.inventory.length);
  expect(errors).toEqual([]);
});

test('the settings cog flips the same Sound and Haptics switches as the pause sheet', async ({ page }) => {
  const errors = watch(page);
  await withSave(page, seed({ runs: 9 }));
  await page.goto('/play?seed=3');
  await tid(page, 'ui-start').click();
  await tid(page, 'hub-settings').click();
  await expect(tid(page, 'hub-panel')).toHaveAttribute('aria-label', 'Settings');
  const sound = page.getByRole('switch', { name: 'Sound' });
  const haptics = page.getByRole('switch', { name: 'Haptics' });
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await sound.click();
  await haptics.click();
  await expect.poll(async () => (await stored(page)).settings).toMatchObject({ sfx: false, haptics: false, music: true });
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await tid(page, 'hub-close').click();
  // The run's pause sheet shows what the cog set, and changing it there is the same change.
  await tid(page, 'hub-go').click();
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-settings').click(); // the pause sheet's Settings view holds the switches
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('switch', { name: 'Sound' }).click();
  await expect.poll(async () => (await stored(page)).settings.sfx).toBe(true);
  expect(errors).toEqual([]);
});

test('the game loop sleeps whenever no run is live, wakes for a run, and still tears down from sleep', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watch(page);
  await withSave(page, seed({ runs: 9 }));
  const running = () => page.evaluate(() => window.__game?.loop.running ?? true); // no game yet counts as awake
  await page.goto('/play?seed=3');
  await expect.poll(running, { message: 'asleep behind the title' }).toBe(false);
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'hub-overlay')).toBeVisible();
  expect(await running()).toBe(false); // the hub is a picture too
  await tid(page, 'hub-go').click();
  await expect(tid(page, 'ui-pause')).toBeVisible();
  expect(await running()).toBe(true);
  await tid(page, 'ui-pause').click(); // held, but a run is still live: the loop stays awake behind the pause sheet
  await page.waitForTimeout(400);
  expect(await running()).toBe(true);
  await tid(page, 'ui-quit').click(); await tid(page, 'ui-quit-confirm').click();
  await expect(tid(page, 'ui-again')).toBeVisible();
  await expect.poll(running).toBe(false);
  await tid(page, 'ui-again').click(); // Daydream again wakes it
  await expect(tid(page, 'ui-pause')).toBeVisible();
  expect(await running()).toBe(true);
  await page.waitForFunction(() => window.__world!.time > 1);
  // Leaving the game from sleep: the engine's teardown happens on its next step, so GameRoot wakes the loop to let it run.
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click(); await tid(page, 'ui-quit-confirm').click();
  await expect.poll(running).toBe(false);
  await page.evaluate(() => {
    (window as unknown as { __kept: unknown }).__kept = window.__game;
    window.history.pushState({}, '', '/welcome');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect.poll(() => page.evaluate(() => !window.__game)).toBe(true);
  // destroy() only asks; the engine finishes on its next step. It has finished (it was woken to do it), not still waiting for a step that never comes.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __kept: { pendingDestroy: boolean } }).__kept.pendingDestroy)).toBe(false);
  expect(errors).toEqual([]);
});

/** A calendar date n days from today, on the local calendar (what the streak counts in). */
function localDay(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('the day-7 gift chest waits in the chests box, even across a restart, and opens with a reveal', async ({ page }) => {
  const errors = watch(page);
  // Six days claimed in a row, the last one yesterday: today's claim is day 7, a Rare-or-better chest.
  await withSave(page, seed({ runs: 9, streak: { day: 6, lastClaimDay: localDay(-1), windowStartDay: localDay(-6), restDaysUsed: 0 } }));
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await openSheet(page, 'orders', 'Calendar');
  await expect(tid(page, 'calendar-claim')).toHaveText('Claim day 7');
  await tid(page, 'calendar-claim').click();
  await openSheet(page, 'pantry', 'Chests'); // the gift waits in the chests box
  await expect(all(page, 'chest-open')).toHaveCount(1);
  const claimed = await stored(page);
  expect(claimed.streak).toMatchObject({ day: 7, lastClaimDay: localDay(0) });
  expect(claimed.pendingChests).toHaveLength(1);
  const chest = claimed.inventory.find((i: { uid: string }) => i.uid === claimed.pendingChests[0]);
  expect(['rare', 'epic', 'legendary', 'raja']).toContain(chest.rarity);
  await closeSheet(page);

  // Closing the app does not lose it: after a restart it is still there, unopened.
  await page.reload();
  await tid(page, 'ui-start').click();
  await openSheet(page, 'pantry', 'Chests');
  await tid(page, 'chest-open').click();
  await expect(tid(page, 'chest-reveal')).toContainText(chest.rarity.replace(/^./, (c: string) => c.toUpperCase()));
  expect((await stored(page)).pendingChests).toEqual([]);
  expect((await stored(page)).inventory).toHaveLength(claimed.inventory.length);
  expect(errors).toEqual([]);
});

test('a write that fails keeps everything in memory, says so, and the retry writes it all', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if ((window as unknown as { __failWrites?: boolean }).__failWrites && key.startsWith('game:')) throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, key, value);
    };
  });
  await withSave(page, seed({ runs: 9 }));
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await page.evaluate(() => ((window as unknown as { __failWrites: boolean }).__failWrites = true));
  await openSheet(page, 'orders', 'Calendar');
  await tid(page, 'calendar-claim').click();
  await expect(tid(page, 'save-error')).toBeVisible();
  await expect(tid(page, 'hub-coins')).toHaveText('100'); // the coins are in the game even though the disk refused them
  expect((await stored(page)).gold).toBe(50);
  await page.evaluate(() => ((window as unknown as { __failWrites: boolean }).__failWrites = false));
  await tid(page, 'save-error').getByRole('button', { name: 'Retry save' }).click();
  await expect.poll(async () => (await stored(page)).gold).toBe(100);
  await expect(all(page, 'save-error')).toHaveCount(0);
  expect((await stored(page)).streak.day).toBe(1);
  expect(errors).toEqual([]);
});

test('a save that cannot be read leaves the title with Try again and never writes over it', async ({ page }) => {
  await page.addInitScript(([k]) => {
    localStorage.setItem(k, JSON.stringify({ v: 2, gold: 999, runs: 7 }));
    const real = Storage.prototype.getItem;
    let fails = 1;
    Storage.prototype.getItem = function (key: string) {
      if (key === k && fails-- > 0) throw new Error('storage is busy');
      return real.call(this, key);
    };
  }, [SAVE_KEY]);
  await page.goto('/play');
  await expect(tid(page, 'ui-start')).toHaveText('Try again');
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'ui-start')).toHaveText('Continue');
  await tid(page, 'ui-start').click();
  await expect(tid(page, 'hub-coins')).toHaveText('999');
  expect(await stored(page)).toMatchObject({ gold: 999, runs: 7 });
});

// The fullest payout there is (a win: two unlock chips, the chest, four ingredients) fits the wake-up screen with both buttons on
// screen, on the 9:16 phone as well as the tall one.
for (const [w, h] of [
  [360, 640],
  [390, 844],
] as const) {
  test(`the wake-up screen shows the whole payout without scrolling on a ${w}x${h} screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = watch(page);
    await withSave(page, seed({ runs: 3 }));
    await page.goto('/play?seed=3');
    await tid(page, 'ui-start').click();
    await tid(page, 'hub-go').click();
    await page.waitForFunction(() => !!window.__world);
    await page.evaluate(() => window.__hub!.emit('runEnd', { won: true, wave: 10, kills: 247, bossKills: 1, time: 300, level: 12, gold: 100, breads: [], dips: [] }));
    await expect(tid(page, 'ui-again')).toBeVisible();
    await expect(tid(page, 'results-coins')).toHaveText('+300'); // 200 for the run + the 100 it picked up
    await expect(tid(page, 'results-xp')).toHaveText('+251'); // 40 + 10 per wave + 50 per boss + a quarter of the 247 kills
    await expect(all(page, 'results-unlocks').locator('.gu-newbest')).toHaveCount(2);
    await page.waitForTimeout(1_500);
    expect(await page.evaluate(() => { const b = document.querySelector('.sh-result-body')!; return b.scrollHeight - b.clientHeight; })).toBeLessThanOrEqual(1);
    for (const id of ['ui-again', 'ui-stall']) {
      const r = (await tid(page, id).boundingBox())!;
      expect(r.y + r.height, id).toBeLessThanOrEqual(h);
      expect(r.x + r.width, id).toBeLessThanOrEqual(w);
    }
    expect(errors).toEqual([]);
  });
}

// [width, height, safe-area insets in px]: a phone with a notch and a home bar loses room at the top and bottom of the screen.
const SCREENS: [number, number, { top: number; bottom: number }][] = [
  [360, 640, { top: 0, bottom: 0 }], // 9:16
  [390, 844, { top: 0, bottom: 0 }], // about 9:19.5
  [412, 915, { top: 0, bottom: 0 }], // about 9:20
  [390, 844, { top: 47, bottom: 34 }], // the same with a notch and a home bar
];
for (const [w, h, inset] of SCREENS) {
  const name = `${w}x${h}${inset.top ? ' with a notch' : ''}`;
  test(`the hub's controls and station panels stay on screen on a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = watch(page);
    await withSave(page, seed({ stallXp: 3900, runs: 9, pendingChests: ['t4'] }));
    await page.goto('/play');
    await tid(page, 'ui-start').click();
    await expect(tid(page, 'hub-overlay')).toBeVisible();
    // An Android WebView reports no safe area: the app measures it and GameRoot passes it down as these two variables.
    await page.evaluate(({ top, bottom }) => {
      const root = document.querySelector<HTMLElement>('[data-testid="game-root"]')!;
      root.style.setProperty('--gu-safe-top', `${top}px`);
      root.style.setProperty('--gu-safe-bottom', `${bottom}px`);
    }, inset);
    await page.waitForTimeout(600);

    const box = async (id: string) => (await tid(page, id).boundingBox())!;
    const controls = ['hub-go', 'hub-settings', 'hub-coins', 'hub-tell'];
    const rects: Record<string, { x: number; y: number; r: number; b: number }> = {};
    for (const id of controls) {
      const r = await box(id);
      rects[id] = { x: r.x, y: r.y, r: r.x + r.width, b: r.y + r.height };
      expect(r.x, `${id} left`).toBeGreaterThanOrEqual(0);
      expect(rects[id].r, `${id} right`).toBeLessThanOrEqual(w);
      expect(rects[id].y, `${id} below the notch`).toBeGreaterThanOrEqual(inset.top);
      expect(rects[id].b, `${id} above the home bar`).toBeLessThanOrEqual(h - inset.bottom);
    }
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = rects[controls[i]];
        const b = rects[controls[j]];
        expect(a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b, `${controls[i]} and ${controls[j]} overlap`).toBe(false);
      }
    }
    // A station's panel opens on screen too, and the page never scrolls sideways.
    await openSheet(page, 'gear', 'Wear');
    const panel = await box('hub-panel');
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(w);
    expect(panel.y + panel.height).toBeLessThanOrEqual(h);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await shot(page, `hub-${w}x${h}${inset.top ? '-notch' : ''}`);
    expect(errors).toEqual([]);
  });
}

test('recipe book shows known and unknown evolutions and cooking persists once', async ({ page }) => {
  const errors = watch(page);
  await withSave(page, seed({ stallXp: 1300, unlockedBreads: [], unlockedDips: [], materials: { flour: 10, ghee: 10, egg: 10, onion: 10, spice: 10, sugar: 10, milk: 10 } }));
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await openSheet(page, 'tawa', 'Recipes');
  await expect(tid(page, 'recipe-book')).toBeVisible();
  await expect(all(page, 'evolution-recipe')).toHaveCount(8);
  const chakra = all(page, 'evolution-recipe').filter({ hasText: 'Kosong Lv 5 + Ghee Lv 5' });
  await expect(chakra).toHaveAttribute('data-known', 'false');
  await expect(chakra).toContainText('Unknown recipe');
  await expect(all(page, 'evolution-recipe').filter({ hasText: 'Tarik Lance' })).toHaveAttribute('data-known', 'true');
  await tid(page, 'cook-rc-ghee').click();
  await expect(tid(page, 'cook-rc-ghee')).toHaveText('Known'); // a cooked recipe's button becomes the Known label
  await expect(chakra).toContainText('Golden Ghee Chakra');
  await expect(chakra).toHaveAttribute('data-known', 'true');
  await expect.poll(async () => (await stored(page)).unlockedDips).toEqual(['ghee']);
  expect((await stored(page)).materials).toMatchObject({ milk: 6, sugar: 9 });
  await closeSheet(page);
  await page.reload();
  await tid(page, 'ui-start').click();
  await openSheet(page, 'tawa', 'Recipes');
  await expect(tid(page, 'cook-rc-ghee')).toHaveText('Known'); // a cooked recipe's button becomes the Known label
  await expect(all(page, 'evolution-recipe').filter({ hasText: 'Golden Ghee Chakra' })).toHaveAttribute('data-known', 'true');
  expect(errors).toEqual([]);
});

for (const attempts of [2, 3]) {
  test(`Start daydream uses the chapter gate at ${attempts} boss attempts`, async ({ page }) => {
    const errors = watch(page);
    await withSave(page, seed({ bossAttempts: { 'kopitiam-street': attempts } }));
    await page.goto('/play?seed=3');
    await tid(page, 'ui-start').click();
    await tid(page, 'hub-go').click();
    if (attempts === 3) {
      await expect(tid(page, 'hub-panel')).toHaveAttribute('data-station', 'exit'); // GO opens the chapter list
      await expect(tid(page, 'chapter-kopitiam-street')).toBeVisible();
      await tid(page, 'chapter-hawker-night').click();
    } else {
      await expect(all(page, 'hub-panel')).toHaveCount(0);
    }
    await page.waitForFunction(() => !!window.__world);
    const expected = attempts === 3 ? 'hawker-night' : 'kopitiam-street';
    expect(await page.evaluate(() => window.__world!.chapter.id)).toBe(expected);
    expect(await page.evaluate(() => window.__world!.chapter.background)).toBe(attempts === 3 ? 'scene/background2' : 'scene/background');
    // Verify the background texture selected by the renderer as well as the content definition.
    expect(await page.evaluate(() => {
      const scene = window.__game!.scene.getScene('RunScene') as unknown as { stall: { bg: { texture: { key: string } } } };
      return scene.stall.bg.texture.key;
    })).toBe(attempts === 3 ? 'scene/background2' : 'scene/background');
    expect(errors).toEqual([]);
  });
}
