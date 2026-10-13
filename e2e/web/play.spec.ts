// The game (src/game/GameRoot.tsx: a DOM component running Phaser 4 plus the React overlay) at /play, signed out. The app's
// own server calls are mocked (empty answers) so only the game can fail this. Needs only the web build
// (bash scripts/check.sh --web).
//
//   RUN_SHOTS=1 npx playwright test -c e2e/web play.spec.ts   also saves .spike/run-5s.png and .spike/run-20s.png (shrunk with sips)
import { execFileSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();
const all = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`);
/** The save the game wrote (SaveV2 under the bridge's localStorage key). */
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('game:prata-raja/save') ?? 'null'));

/** Collect console errors and page errors; the game must draw a whole run without one. */
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: {} }));
});

test('title, start, drag, pick a card, pause, quit', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watch(page);
  await page.goto('/play');
  await expect(page.locator('canvas')).toBeVisible();
  // The title screen is the overlay's; Start asks the scene (through the hub) for a run. A first launch goes straight into
  // run 1: no stall in between. No run is live, so the game loop sleeps behind the title (it only costs battery there).
  await expect(tid(page, 'ui-start')).toHaveText('Start daydream');
  await page.waitForFunction(() => !!window.__game && !window.__game.loop.running, null, { timeout: 30_000 });
  // Nothing in the game box can scroll (the canvas used to leave 4 px under itself, and a focus then shifted every screen).
  expect(await page.evaluate(() => { const r = document.querySelector('[data-testid="game-root"]')!; return r.scrollHeight - r.clientHeight; })).toBe(0);
  await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(true); // the run woke it
  await expect(page.getByText(/Wave 1\/10/)).toBeVisible();
  await expect(page.locator('[data-testid="stall-hub"]')).toHaveCount(0);

  // Drag below the HUD band: Kannan's target follows the finger (field x, 0 at the middle of the screen).
  await page.mouse.move(195, 700);
  await page.mouse.down();
  await page.mouse.move(330, 700, { steps: 6 });
  await page.waitForFunction(() => window.__world!.player.targetX > 80);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__world!.player.x)).toBeGreaterThan(0);

  // A level-up pauses the sim and shows the cards; picking one resumes the run.
  await page.evaluate(() => {
    window.__world!.pendingLevelUps = 1;
  });
  await expect(tid(page, 'ui-card-0')).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => window.__world!.phase)).toBe('levelup');
  await tid(page, 'ui-card-0').click();
  await page.waitForFunction(() => window.__world!.phase === 'wave');

  // Pause stops the clock; Resume restarts it.
  await tid(page, 'ui-pause').click();
  const t0 = await page.evaluate(() => window.__world!.time);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__world!.time)).toBe(t0);
  await tid(page, 'ui-resume').click();
  await page.waitForFunction((t) => window.__world!.time > t, t0);

  // The Sound switch lives in the save (SaveV2 now), and the save keeps its other fields.
  await tid(page, 'ui-pause').click();
  await page.getByRole('switch', { name: 'Sound' }).click();
  await expect.poll(async () => (await stored(page))?.settings.sfx).toBe(false);
  expect((await stored(page)).v).toBe(2);
  await page.getByRole('switch', { name: 'Sound' }).click();
  await expect.poll(async () => (await stored(page))?.settings.sfx).toBe(true);

  // End run wakes Kannan early. This one is still on wave 1, so it is too short to pay: the results say so, nothing is paid
  // (no coins, XP, chest or ingredients), and the run still counts in the records. Back to stall opens the hub.
  await tid(page, 'ui-quit').click();
  await expect(tid(page, 'ui-again')).toBeVisible();
  expect(await page.evaluate(() => window.__world!.result!.wave)).toBe(1);
  await expect(tid(page, 'results-short')).toHaveText('Too short a daydream — no tips this time');
  await expect(all(page, 'results-coins')).toHaveCount(0);
  await expect.poll(async () => (await stored(page))?.runs).toBe(1);
  const short = await stored(page);
  expect(short).toMatchObject({ gold: 0, stallXp: 0, pendingChests: [], inventory: [], bestWave: 1 });
  expect(Object.values(short.materials).every((n) => n === 0)).toBe(true);
  await page.waitForFunction(() => !window.__game!.loop.running); // the wake-up screen covers the canvas: the loop sleeps again
  await tid(page, 'ui-stall').click();
  await expect(tid(page, 'stall-hub')).toBeVisible();
  await expect(tid(page, 'stall-coins')).toHaveText('0');
  await page.waitForTimeout(300);
  expect(await stored(page)).toEqual(short); // looking around the stall pays and changes nothing
  expect(await page.evaluate(() => window.__game!.loop.running)).toBe(false);
  expect(errors).toEqual([]);
});

test('the page going hidden holds the run and opens the pause sheet; the fonts come with the game', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watch(page);
  const fontServices: string[] = [];
  page.on('request', (r) => /fonts\.(googleapis|gstatic)\.com/.test(r.url()) && fontServices.push(r.url()));
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  // The overlay's typefaces are bundled: all five Fredoka and Nunito faces load from the app itself, nothing from a font service.
  const faces = await page.evaluate(async () => {
    await Promise.all(['600 16px Fredoka', '700 16px Fredoka', '600 16px Nunito', '700 16px Nunito', '800 16px Nunito'].map((f) => document.fonts.load(f)));
    return Array.from(document.fonts).filter((x) => x.family === 'Fredoka' || x.family === 'Nunito').map((x) => `${x.family} ${x.weight} ${x.status}`);
  });
  expect(faces.sort()).toEqual(['Fredoka 600 loaded', 'Fredoka 700 loaded', 'Nunito 600 loaded', 'Nunito 700 loaded', 'Nunito 800 loaded']);
  // visibilitychange to hidden (what the OS does when the app goes to the background).
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(tid(page, 'ui-resume')).toBeVisible();
  const t0 = await page.evaluate(() => window.__world!.time);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__world!.time)).toBe(t0);
  await page.evaluate(() => {
    delete (document as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tid(page, 'ui-resume').click();
  await page.waitForFunction((t) => window.__world!.time > t, t0);
  expect(fontServices).toEqual([]);
  expect(errors).toEqual([]);
});

test('a bot-played run reaches wave 3 with no console error', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  // ?bot=1 plays by itself and starts at once; ?seed fixes the run; ?speed runs the sim faster than real time.
  await page.goto('/play?bot=1&seed=7&speed=4');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  const t0 = Date.now();
  const shot = async (name: string, at: number) => {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    const path = `.spike/run-${name}.png`;
    await page.screenshot({ path });
    try {
      execFileSync('sips', ['-Z', '900', path]);
    } catch {
      // not macOS: keep the full-size picture
    }
  };
  if (process.env.RUN_SHOTS === '1') await shot('5s', 5_000);
  await page.waitForFunction(() => window.__world!.wave >= 3, null, { timeout: 200_000 });
  if (process.env.RUN_SHOTS === '1') await shot('20s', 20_000);
  await page.waitForTimeout(Math.max(0, 10_000 - (Date.now() - t0)));
  const fps = await page.evaluate(() => window.__game!.loop.actualFps);
  console.log(`actualFps after 10 s: ${fps.toFixed(1)}`);
  test.info().annotations.push({ type: 'fps', description: fps.toFixed(1) });
  expect(await page.evaluate(() => window.__world!.wave)).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

/** Save a screenshot for the owner when RUN_SHOTS=1: .spike/<name>.png, shrunk with sips. */
async function shot(page: Page, name: string): Promise<void> {
  if (process.env.RUN_SHOTS !== '1') return;
  const path = `.spike/${name}.png`;
  await page.screenshot({ path });
  try {
    execFileSync('sips', ['-Z', '900', path]);
  } catch {
    // not macOS: keep the full-size picture
  }
}

for (const [w, h] of [
  [390, 844],
  [360, 640],
  [412, 915],
] as const) {
  test(`the title: a wide Start pill near the bottom, the tagline just above it, the hero in view (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = watch(page);
    await page.goto('/play');
    await expect(tid(page, 'ui-start')).toBeEnabled();
    const box = async (sel: string) => (await page.locator(sel).filter({ visible: true }).first().boundingBox())!;
    const start = await box('[data-testid="ui-start"]');
    const chip = await box('.gu-splash-foot .gu-chip');
    const foot = await box('.gu-splash-foot');
    const logo = await box('.gu-logo');
    // A wide chunky pill, not the old 240 px round badge: at least 280 px across (never wider than the screen less a gutter), about 70 px
    // tall, and its bottom a little above the screen's.
    expect(start.width).toBeGreaterThanOrEqual(Math.min(280, w - 36));
    expect(start.width).toBeLessThanOrEqual(w - 24);
    expect(start.height).toBeGreaterThanOrEqual(64);
    expect(start.height).toBeLessThanOrEqual(90);
    expect(start.y + start.height).toBeLessThanOrEqual(h - 16);
    expect(start.y + start.height).toBeGreaterThanOrEqual(h - 60);
    expect(start.x + start.width / 2).toBeCloseTo(w / 2, 0);
    // The tagline sits just above it, and everything but that foot (a quarter of a short screen at most) is hero.
    expect(chip.y + chip.height).toBeLessThanOrEqual(start.y);
    expect(start.y - (chip.y + chip.height)).toBeLessThanOrEqual(24);
    expect(foot.y).toBeGreaterThanOrEqual(0.72 * h);
    expect(logo.y + logo.height).toBeLessThan(0.45 * h);
    if (w === 390) await shot(page, 's2-title');
    await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
    await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
}

test('every level-up card line takes three lines at most on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const errors = watch(page);
  await page.goto('/play?seed=3');
  await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  // Every card there is, three at a time, as the level-up sheet shows them.
  const cards = await page.evaluate(() => {
    const c = window.__world!.content;
    const all = [
      ...Object.values(c.breads).map((b) => ({ kind: b.evolvedFrom ? 'evolve' : 'bread', id: b.id, level: b.evolvedFrom ? 1 : 2 })),
      ...Object.keys(c.dips).map((id) => ({ kind: 'dip', id, level: 2 })),
      ...Object.keys(c.passives).map((id) => ({ kind: 'passive', id, level: 2 })),
      { kind: 'heal', id: '', level: 1 },
      { kind: 'gold', id: '', level: 1 },
    ];
    return all;
  });
  const expectedCount = await page.evaluate(() => {
    const c = window.__world!.content;
    return Object.keys(c.breads).length + Object.keys(c.dips).length + Object.keys(c.passives).length + 2;
  });
  expect(cards).toHaveLength(expectedCount);
  const wrapped: string[] = [];
  for (let i = 0; i < cards.length; i += 3) {
    await page.evaluate((offer) => window.__hub!.emit('levelUp', { offer: offer as never, rerolls: 1, level: 2 }), cards.slice(i, i + 3));
    await expect(tid(page, 'ui-card-0')).toBeVisible();
    await page.waitForTimeout(400); // the cards pop in
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.gu-card')).map((c) => {
        const line = c.querySelector<HTMLElement>('.gu-card-line')!;
        return { text: line.textContent ?? '', lines: Math.round(line.getBoundingClientRect().height / parseFloat(getComputedStyle(line).lineHeight)), overflow: c.scrollHeight - c.clientHeight };
      }),
    );
    for (const r of rows) {
      if (r.lines > 3) wrapped.push(`${r.lines} lines: ${r.text}`);
      if (r.overflow > 1) wrapped.push(`overflows its card: ${r.text}`);
    }
  }
  expect(wrapped).toEqual([]);
  expect(errors).toEqual([]);
});

test('an enemy biting at the counter shows the danger cue, and every hit flashes the HP pill', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watch(page);
  await page.goto('/play?seed=3');
  await tid(page, 'ui-start').click();
  await tid(page, 'story-skip').click();
  await page.waitForFunction(() => !!window.__world && window.__world.time > 0.5, null, { timeout: 60_000 });
  const marks = () =>
    page.evaluate(() => {
      const scene = window.__game!.scene.getScene('RunScene') as unknown as { children: { list: { type: string; text?: string; visible: boolean }[] } };
      return scene.children.list.filter((o) => o.type === 'Text' && o.text === '!' && o.visible).length;
    });
  expect(await marks()).toBe(0);
  const pill = page.locator('.gu-hp');
  await expect(pill).not.toHaveAttribute('data-hit', /./);
  // A roach at the counter, far to the left of Kannan, chewing on him.
  await page.evaluate(() => {
    const w = window.__world!;
    const def = w.content.enemies.roach ?? Object.values(w.content.enemies)[0];
    w.enemies.push({
      uid: w.nextUid++, def, boss: false, elite: false, x: -170, y: 30, hp: 1e6, maxHp: 1e6, shield: 0, statuses: [], state: 'attack',
      t: 0, age: 0, knock: 0, flash: 0, cooldowns: { bx: -170, ph: 0, _mt: 0 }, phase: 0, holdY: 0,
    });
  });
  await expect.poll(marks, { message: 'the "!" over the biter' }).toBe(1);
  // Its bites hurt (every half second), and each drop in HP restarts the flash: the two animation names take turns.
  await expect(pill).toHaveAttribute('data-hit', /^[ab]$/, { timeout: 10_000 });
  const first = await pill.getAttribute('data-hit');
  await expect.poll(() => pill.getAttribute('data-hit'), { timeout: 10_000 }).not.toBe(first);
  const name = await pill.evaluate((el) => getComputedStyle(el).animationName);
  expect(['gu-hurt-a', 'gu-hurt-b']).toContain(name);
  // Freeze the flash a moment into it for the picture: the pill red, the glow and the "!" over the biter.
  await page.addStyleTag({ content: '.gu-hp[data-hit] { animation-play-state: paused !important; animation-delay: -0.05s !important; }' });
  await page.waitForTimeout(150);
  await shot(page, 's2-danger');
  // Gone when it is gone.
  await page.evaluate(() => {
    const w = window.__world!;
    w.enemies.length = 0;
  });
  await expect.poll(marks).toBe(0);
  expect(errors).toEqual([]);
});
