// The game (src/game/GameRoot.tsx: a DOM component running Phaser 4 plus the React overlay) at /play, signed out. The app's
// own server calls are mocked (empty answers) so only the game can fail this. Needs only the web build
// (bash scripts/check.sh --web).
//
//   RUN_SHOTS=1 npx playwright test -c e2e/web play.spec.ts   also saves .spike/run-5s.png and .spike/run-20s.png (shrunk with sips)
import { execFileSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();

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
  // The title screen is the overlay's; Start asks the scene (through the hub) for a run.
  await tid(page, 'ui-start').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  await expect(page.getByText(/Wave 1\/10/)).toBeVisible();

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

  // Quitting mid-run wakes Kannan early: the results screen shows, and Title goes back to the title.
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click();
  await expect(tid(page, 'ui-again')).toBeVisible();
  await tid(page, 'ui-title').click();
  await expect(tid(page, 'ui-start')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the page going hidden holds the run and opens the pause sheet; the fonts come with the game', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watch(page);
  const fontServices: string[] = [];
  page.on('request', (r) => /fonts\.(googleapis|gstatic)\.com/.test(r.url()) && fontServices.push(r.url()));
  await page.goto('/play');
  await tid(page, 'ui-start').click();
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
