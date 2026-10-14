import { expect, test } from '@playwright/test';
import type { Enemy, GameEvent, HitEffect, World } from '../../src/core/types';
import type { HapticKind } from '../../src/game/bridgeTypes';
import type { SfxName } from '../../src/game/audio/sfx';
import type { Fx } from '../../src/game/phaser/fx';
import { applyHitEffect, CC_IMMUNITY, tickStatuses } from '../../src/core/status';

// Use the existing __game console fixture; exercise the real renderer and web bridge.
type SceneProbe = {
  handle(w: World, events: GameEvent[]): void;
  buzz(kind: HapticKind, gap?: number): void;
  hold(): void;
  start(seed: number): void;
  shake(dt: number): void;
  update(time: number, delta: number): void;
  trauma: number;
  hapticsOn: boolean;
  reduceMotion: boolean;
  actors: { viewOf(uid: number): unknown };
  stall: { flash(): void };
  fx: { spawn: Fx['spawn']; number(uid: number, x: number, y: number, value: number, kind: 0 | 1 | 2, perspective?: number): void };
  sfx(name: SfxName): void;
  addTrauma(value: number): void;
  cameras: { main: { scrollX: number; scrollY: number } };
};

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

for (const reduced of [false, true]) test(`RunScene mixed combat bursts stay calm (reduced motion ${reduced})`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto('/play?seed=300650584');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world);
  const evidence = await page.evaluate(() => {
    const game = window.__game!;
    game.loop.sleep();
    const scene = game.scene.getScene('RunScene') as unknown as SceneProbe;
    const w = window.__world!;
    let now = 0;
    const originalNow = performance.now.bind(performance);
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    const vibrations: { at: number; duration: number | number[] }[] = [];
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (duration: number | number[]) => {
      vibrations.push({ at: now, duration });
      return true;
    } });
    let flashes = 0;
    let traumaCues = 0;
    let damageNumbers = 0;
    const number = scene.fx.number.bind(scene.fx);
    scene.fx.number = (...args) => { damageNumbers++; number(...args); };
    const flash = scene.stall.flash.bind(scene.stall);
    scene.stall.flash = () => { flashes++; flash(); };
    const addTrauma = scene.addTrauma.bind(scene);
    scene.addTrauma = v => { traumaCues++; addTrauma(v); };
    const viewOf = scene.actors.viewOf.bind(scene.actors);
    scene.actors.viewOf = uid => uid === -99 ? { elite: true, boss: false, sx: 100, sy: 300, bw: 30, bh: 50, topY: 260 } : viewOf(uid);
    const hurt: GameEvent = { t: 'playerHit', source: 'contact', dmg: 1 };
    const hit: GameEvent = { t: 'hit', uid: -99, x: 0, y: 100, dmg: 1, crit: false, color: null };
    const blast: GameEvent = { t: 'blast', x: w.player.x, y: 0, radius: 20, color: null };
    try {
      // Disabled cues do not consume the first allowed haptic slot.
      scene.hapticsOn = false;
      scene.handle(w, [hurt, blast, { t: 'levelUp', level: 2 }]);
      const disabledCount = vibrations.length;
      scene.hapticsOn = true;
      scene.buzz('light');
      const enabledImmediately = vibrations.length;
      vibrations.length = 0;
      scene.start(300650584);
      game.loop.sleep();
      scene.hapticsOn = true;
      flashes = 0; traumaCues = 0;
      const run = window.__world!;
      scene.handle(run, [hurt, blast, hit]); // heavy must beat light in the same batch
      for (now = 50; now < 750; now += 50) scene.handle(run, [hurt, hit, hit, hit]);
      const firstPeak = scene.trauma;
      scene.shake(0.75);
      now = 750;
      scene.handle(run, [hurt, hit]);
      const burst = { vibrations: [...vibrations], flashes, traumaCues, damageNumbers, firstPeak, trauma: scene.trauma };
      now = 1600;
      scene.handle(run, [{ t: 'status', uid: -99, status: 'freeze' }]);
      const afterFreeze = vibrations.length;
      scene.hold();
      const pauseCount = vibrations.length;
      now = 4000;
      scene.update(4000, 100);
      const paused = { count: vibrations.length, trauma: scene.trauma, scrollX: scene.cameras.main.scrollX, scrollY: scene.cameras.main.scrollY };
      scene.start(300650584);
      game.loop.sleep();
      const newRunBeforeCue = vibrations.length;
      now = 4001;
      scene.buzz('medium');
      scene.buzz('heavy');
      now = 4751;
      scene.buzz('heavy', 1000);
      now = 5001;
      scene.buzz('heavy', 1000);
      return { reducedMotion: scene.reduceMotion, disabledCount, enabledImmediately, afterFreeze, burst, pauseCount, paused, newRunBeforeCue, vibrations };
    } finally {
      Object.defineProperty(performance, 'now', { configurable: true, value: originalNow });
      scene.fx.number = number;
      scene.stall.flash = flash;
      scene.addTrauma = addTrauma;
      scene.actors.viewOf = viewOf;
    }
  });
  expect(evidence.reducedMotion).toBe(reduced);
  expect(evidence.disabledCount).toBe(0);
  expect(evidence.enabledImmediately).toBe(1);
  expect(evidence.burst.vibrations).toEqual([{ at: 0, duration: 32 }, { at: 750, duration: 8 }]);
  expect(evidence.burst.flashes).toBe(reduced ? 0 : 2);
  expect(evidence.burst.damageNumbers).toBe(44);
  expect(evidence.afterFreeze).toBe(2);
  expect(evidence.burst.traumaCues).toBe(4); // two hurt cues + two elite cues, despite 44 elite hits
  expect(evidence.burst.firstPeak).toBeLessThanOrEqual(reduced ? 0 : 0.65);
  expect(evidence.burst.trauma).toBeLessThanOrEqual(reduced ? 0 : 0.65);
  expect(evidence.paused).toEqual({ count: evidence.pauseCount, trauma: 0, scrollX: 0, scrollY: 0 });
  expect(evidence.newRunBeforeCue).toBe(evidence.pauseCount);
  expect(evidence.vibrations.slice(2)).toEqual([{ at: 4001, duration: 16 }, { at: 5001, duration: 32 }]);
  await test.info().attach('actual-RunScene-feedback-counts', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: test.info().outputPath(`combat-reduced-${reduced}.png`) });
});

test('real core contact damage continues reaching the HP HUD with haptics off', async ({ page }) => {
  await page.goto('/play?seed=300650584');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world && window.__world.time > 0.5);
  const initialHp = await page.evaluate(() => {
    const scene = window.__game!.scene.getScene('RunScene') as unknown as SceneProbe;
    scene.hapticsOn = false;
    const w = window.__world!;
    const def = w.content.enemies.roach ?? Object.values(w.content.enemies)[0];
    w.enemies.push({ uid: w.nextUid++, def, boss: false, elite: false, x: -170, y: 30, hp: 1e6, maxHp: 1e6,
      shield: 0, statuses: [], state: 'attack', t: 0, age: 0, knock: 0, flash: 0,
      cooldowns: { bx: -170, ph: 0, _mt: 0 }, phase: 0, holdY: 0 });
    return w.player.hp;
  });
  await expect.poll(() => page.evaluate(() => window.__world!.player.hp)).toBeLessThan(initialHp);
  const pill = page.locator('.gu-hp');
  await expect(pill).toHaveAttribute('data-hit', /^[ab]$/);
  const first = await pill.getAttribute('data-hit');
  await expect.poll(() => pill.getAttribute('data-hit')).not.toBe(first);
  const hp = await page.evaluate(() => window.__world!.player.hp);
  await expect(pill).toContainText(String(Math.ceil(hp)));
  await page.screenshot({ path: test.info().outputPath('contact-hud.png') });
});


for (const reduced of [false, true]) test(`blast order cannot hide damage cues (reduced motion ${reduced})`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto('/play?seed=300650584');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world);
  const evidence = await page.evaluate(() => {
    const game = window.__game!;
    game.loop.sleep();
    const scene = game.scene.getScene('RunScene') as unknown as SceneProbe;
    let now = 0;
    const originalNow = performance.now.bind(performance);
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    const vibration: number[] = [];
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { vibration.push(now); return true; } });
    let flashes = 0, impacts = 0, hurts = 0, traumaCues = 0;
    const flash = scene.stall.flash.bind(scene.stall);
    const spawn = scene.fx.spawn.bind(scene.fx);
    const sfx = scene.sfx.bind(scene);
    const addTrauma = scene.addTrauma.bind(scene);
    scene.stall.flash = () => { flashes++; flash(); };
    scene.fx.spawn = (...args) => { if (args[0] === 'fx/impact') impacts++; return spawn(...args); };
    scene.sfx = name => { if (name === 'playerHurt') hurts++; sfx(name); };
    scene.addTrauma = value => { traumaCues++; addTrauma(value); };
    const rows = [];
    try {
      for (const source of ['explode', 'boss'] as const) for (const blastFirst of [true, false]) for (const haptics of [true, false]) {
        now = 0;
        scene.start(300650584);
        game.loop.sleep();
        scene.hapticsOn = haptics;
        flashes = 0; impacts = 0; hurts = 0; traumaCues = 0; vibration.length = 0;
        const w = window.__world!;
        const blast: GameEvent = { t: 'blast', x: w.player.x, y: 0, radius: 20, color: null };
        const hurt: GameEvent = { t: 'playerHit', source, dmg: 10 };
        const events = blastFirst ? [blast, hurt] : [hurt, blast];
        scene.handle(w, events);
        const firstDamage = { impacts, hurts, flashes };
        for (now = 50; now < 750; now += 50) scene.handle(w, events);
        const peak = scene.trauma;
        scene.shake(0.75);
        now = 750;
        scene.handle(w, events);
        rows.push({ source, blastFirst, haptics, firstDamage, flashes, impacts, hurts, traumaCues, peak, vibration: [...vibration] });
      }
      return rows;
    } finally {
      Object.defineProperty(performance, 'now', { configurable: true, value: originalNow });
      scene.stall.flash = flash; scene.fx.spawn = spawn; scene.sfx = sfx; scene.addTrauma = addTrauma;
    }
  });
  for (const row of evidence) {
    expect(row.firstDamage).toEqual({ impacts: 1, hurts: 1, flashes: reduced ? 0 : 1 });
    expect(row.impacts).toBe(2);
    expect(row.hurts).toBe(2);
    expect(row.flashes).toBe(reduced ? 0 : 2);
    expect(row.traumaCues).toBe(2); // blast + hurt share one camera cue, in either order
    expect(row.peak).toBeLessThanOrEqual(reduced ? 0 : 0.7);
    expect(row.vibration).toEqual(row.haptics ? [0, 750] : []);
  }
  await test.info().attach('ordered-blast-damage-cues', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('real CC threshold events create one visual per new application', async ({ page }) => {
  const effects: HitEffect[] = [
    { type: 'chill', slowPerStack: 0.1, time: 2, freezeAt: 3, freezeTime: 1.5 },
    { type: 'sugar', slowPct: 0.3, slowTime: 4, dpsPerStack: 2, stackTime: 5, crashAt: 3, crashStun: 1.5 },
  ];
  const events = effects.flatMap(effect => {
    const enemy = { uid: -99, statuses: [], elite: false, boss: false } as unknown as Enemy;
    const firstAndRetries = Array.from({ length: 12 }, () => applyHitEffect(effect, enemy)).flat();
    tickStatuses(enemy, 1.5, 0);
    const immune = Array.from({ length: 3 }, () => applyHitEffect(effect, enemy)).flat();
    tickStatuses(enemy, CC_IMMUNITY, 0);
    const reapplied = Array.from({ length: 3 }, () => applyHitEffect(effect, enemy)).flat();
    return [...firstAndRetries, ...immune, ...reapplied];
  });
  await page.goto('/play?seed=300650584');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world);
  const evidence = await page.evaluate(events => {
    window.__game!.loop.sleep();
    const scene = window.__game!.scene.getScene('RunScene') as unknown as SceneProbe & { actors: { immune(uid: number): void } };
    const viewOf = scene.actors.viewOf.bind(scene.actors);
    const spawn = scene.fx.spawn.bind(scene.fx);
    const immune = scene.actors.immune.bind(scene.actors);
    const counts = { ice: 0, sugarCrash: 0, immunity: 0, vibration: 0 };
    scene.actors.viewOf = () => ({ sx: 100, sy: 300, bw: 30, bh: 50, sugarStacks: 3 });
    scene.actors.immune = uid => { counts.immunity++; immune(uid); };
    scene.fx.spawn = (...args) => {
      if (args[0] === 'fx/ice') counts.ice++;
      if (args[0] === 'fx/sugar-sparkle') counts.sugarCrash++;
      return spawn(...args);
    };
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { counts.vibration++; return true; } });
    try { scene.handle(window.__world!, events); return counts; }
    finally { scene.actors.viewOf = viewOf; scene.actors.immune = immune; scene.fx.spawn = spawn; }
  }, events);
  expect(evidence).toEqual({ ice: 2, sugarCrash: 2, immunity: 2, vibration: 0 });
  await test.info().attach('CC-application-visual-counts', { body: JSON.stringify(evidence), contentType: 'application/json' });
});
