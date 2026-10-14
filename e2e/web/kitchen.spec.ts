import { writeFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { openKitchen } from './hub';

const SAVE_KEY = 'game:prata-raja/save';
const stored = (page: Page) => page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
const tid = (page: Page, id: string) => page.getByTestId(id);

test.use({ viewport: { width: 320, height: 740 } });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

test('root kitchen shortcut preserves the query when launching the game', async ({ page }) => {
  await page.goto('/?kitchen=1');
  await expect(tid(page, 'kitchen-sheet')).toBeVisible();
  await expect(page).toHaveURL(/\/play\?kitchen=1/);
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
  for (const key of ['hp', 'damage', 'throwSpeed', 'crit', 'moveFire']) {
    await tid(page, `kitchen-tune-${key}`).press('End');
  }
  await expect.poll(() => page.evaluate(() => window.__world!.player.stats.maxHp)).toBe(10000);
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
  await expect(tid(page, 'hub-overlay')).toBeVisible();
  const before = await stored(page);
  await openKitchen(page);
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
  await expect(tid(page, 'hub-overlay')).toBeVisible();
  expect(await stored(page)).toBe(before);
  await tid(page, 'hub-go').click();
  await expect(tid(page, 'ui-pause')).toBeVisible();
  await tid(page, 'ui-pause').click();
  await tid(page, 'ui-quit').click();
  await expect(tid(page, 'results')).toBeVisible();
  await expect.poll(async () => JSON.parse((await stored(page))!).runs).toBe(JSON.parse(before!).runs + 1);
});


test('Flaky Kosong is explicit, restartable and isolated from saves and the next Kitchen visit', async ({ page }) => {
  await page.goto('/play?kitchen=1');
  await expect(tid(page, 'kitchen-flaky')).not.toBeChecked();
  const before = await stored(page);
  await tid(page, 'kitchen-bread-level-0').selectOption('5');
  await tid(page, 'kitchen-flaky').check();
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => window.__world?.flakyKosong === true);
  await expect(tid(page, 'kitchen-stats')).toContainText('Experimental Flaky Kosong');
  await tid(page, 'kitchen-restart').click();
  await page.waitForFunction(() => window.__world?.flakyKosong === true && window.__world.time < 1);
  await tid(page, 'kitchen-setup').click();
  await tid(page, 'kitchen-flaky').uncheck();
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => window.__world != null && window.__world.flakyKosong === undefined);
  await expect(tid(page, 'kitchen-stats')).not.toContainText('Experimental Flaky Kosong');
  expect(await stored(page)).toBe(before);
  await tid(page, 'kitchen-exit').click();
  await openKitchen(page);
  await expect(tid(page, 'kitchen-flaky')).not.toBeChecked();
  expect(await stored(page)).toBe(before);
});

// Paused, controlled scene frames exercise the real sim + renderer without a screenshot racing the 0.2s child lifetime.
for (const width of [390, 320]) test(`Flaky Kosong moving pieces and pool reset at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/play?kitchen=1');
  await tid(page, 'kitchen-bread-level-0').selectOption('5');
  await tid(page, 'kitchen-flaky').check();
  await tid(page, 'kitchen-start').click();
  await page.waitForFunction(() => window.__world?.flakyKosong === true);
  await page.evaluate(() => {
    const w = window.__world!;
    const scene = window.__game!.scene.getScene('RunScene') as unknown as { paused: boolean; acc: number; hitStop: number; actors: { clear(): void }; frame(dt: number): void };
    scene.paused = true; scene.acc = 0; scene.hitStop = 0; scene.actors.clear();
    w.enemies = []; w.projectiles = []; w.events = []; w.budgetLeft = 0; w.waveTime = 0; w.time = 0;
    w.player.breads.forEach(b => { b.cd = 1e6; }); w.player.stats.critChance = 0;
    for (const y of [250, 450, 650]) w.enemies.push({ uid: w.nextUid++,
      def: { ...w.content.enemies.roach, speed: 0, contactDps: 0, radius: 32 }, boss: false, elite: false,
      x: 0, y, hp: 1e6, maxHp: 1e6, shield: 0, statuses: [], state: 'hold', t: 0, age: 0,
      knock: 0, flash: 0, cooldowns: { bx: 0 }, phase: 0, holdY: y });
    const st = w.content.breads.kosong.levels[4];
    w.projectiles.push({ uid: w.nextUid++, owner: 'player', breadId: 'kosong', sprite: w.content.breads.kosong.sprite,
      motion: 'straight', x: 0, y: 150, vx: 0, vy: 900, z: 0, t: 0, ttl: 2, dmg: st.dmg, radius: st.radius,
      pierceLeft: 0, hopsLeft: st.hops, hit: [], returning: false, targetUid: null, tx: 0, ty: 0, stats: st, spin: 0 });
    scene.frame(0);
  });
  const snapshots: unknown[] = [];
  for (const [name, frames] of [['before', 0], ['first-impact', 5], ['fan-travel', 5], ['second-impact', 5]] as const) {
    const snapshot = await page.evaluate(({ name, frames }) => {
      const w = window.__world!;
      type Image = { width: number; height: number; isCropped: boolean; _crop: { width: number; height: number } };
      type Disc = { img: Image; cont: { scaleX: number; scaleY: number } };
      const scene = window.__game!.scene.getScene('RunScene') as unknown as { acc: number; hitStop: number; frame(dt: number): void;
        actors: { shotMap: Map<number, { disc: Disc; dia: number; texMax: number; px: number; py: number }> }; proj: { at(x: number, y: number): void; ppu: number; s: number } };
      for (let i = 0; i < frames; i++) { scene.hitStop = 0; scene.frame(1 / 60); }
      const shots = w.projectiles.map(s => {
        const v = scene.actors.shotMap.get(s.uid);
        if (!v?.disc) return { uid: s.uid, flake: s.flake, rendered: false };
        const img = v.disc.img;
        const alpha = Math.min(1, scene.acc / (1 / 60));
        scene.proj.at(v.px + (s.x - v.px) * alpha, v.py + (s.y - v.py) * alpha);
        return { uid: s.uid, flake: s.flake === true, x: s.x, y: s.y, flakesShed: s.flakesShed ?? 0,
          cropped: img.isCropped, widthPx: (img.isCropped ? img._crop.width : img.width) * v.disc.cont.scaleX,
          heightPx: (img.isCropped ? img._crop.height : img.height) * v.disc.cont.scaleY,
          layerScale: v.disc.cont.scaleX * v.texMax / (v.dia * scene.proj.ppu * Math.max(0.55, scene.proj.s)) };
      });
      return { name, time: w.time, shots };
    }, { name, frames });
    snapshots.push(snapshot);
    await page.screenshot({ path: testInfo.outputPath(`${width}-${name}.png`) });
    if (name === 'first-impact') {
      expect(snapshot.shots.filter(s => s.flake)).toHaveLength(2);
      expect(snapshot.shots.filter(s => s.flake).every(s => 'cropped' in s && s.cropped)).toBe(true);
      expect(snapshot.shots[0].layerScale).toBeCloseTo(0.84, 2);
      expect(snapshot.shots.filter(s => s.flake).every(s => 'widthPx' in s && s.widthPx! >= 6)).toBe(true);
    }
    if (name === 'second-impact') expect(snapshot.shots[0].layerScale).toBeCloseTo(0.68, 2);
  }
  const evidence = testInfo.outputPath('controlled-motion.json');
  writeFileSync(evidence, JSON.stringify(snapshots, null, 2));
  await testInfo.attach('controlled-motion.json', { path: evidence, contentType: 'application/json' });
  // Return the cropped discs, then fill the reused pool with ordinary Kosong: every image must be whole again.
  const reused = await page.evaluate(() => {
    const w = window.__world!;
    type Img = { isCropped: boolean };
    const scene = window.__game!.scene.getScene('RunScene') as unknown as { frame(dt: number): void;
      actors: { clear(): void; shotMap: Map<number, { disc: { img: Img } }> } };
    const cropped = [...scene.actors.shotMap.values()].map(v => v.disc.img).filter(img => img.isCropped);
    scene.actors.clear(); w.projectiles = []; w.enemies = []; w.flakyKosong = undefined;
    const st = w.content.breads.kosong.levels[4];
    for (let i = 0; i < 10; i++) w.projectiles.push({ uid: w.nextUid++, owner: 'player', breadId: 'kosong', sprite: w.content.breads.kosong.sprite,
      motion: 'straight', x: -180 + (i % 5) * 90, y: 350 + Math.floor(i / 5) * 100, vx: 0, vy: 900, z: 0, t: 0, ttl: 2, dmg: st.dmg, radius: st.radius,
      pierceLeft: 0, hopsLeft: st.hops, hit: [], returning: false, targetUid: null, tx: 0, ty: 0, stats: st, spin: 0 });
    scene.frame(0);
    const images = [...scene.actors.shotMap.values()].map(v => v.disc.img);
    return { reused: images.filter(img => cropped.includes(img)).length, cropped: images.filter(img => img.isCropped).length };
  });
  expect(reused.reused).toBeGreaterThan(0); expect(reused.cropped).toBe(0);
  await page.screenshot({ path: testInfo.outputPath(`${width}-ordinary-pool-reset.png`) });
});
