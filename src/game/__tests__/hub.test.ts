import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTENT } from '@/content';
import { DEFAULT_KITCHEN_TUNING, type KitchenConfig, type KitchenTuning } from '@/core/kitchen';
import type { GameEvent, World } from '@/core/types';
import type { Bridge } from '../bridgeTypes';
import { RunScene } from '../phaser/RunScene';
import { BootScene } from '../phaser/BootScene';
import type { KitchenStats } from '../hub';
import { createHub } from '../hub';

vi.mock('phaser', () => ({ Scene: class {}, TintModes: { MULTIPLY: 0, FILL: 1 } }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn(), setSfxEnabled: vi.fn(), unlockAudio: vi.fn() }));
vi.mock('../phaser/tex', () => ({ loadSprites: vi.fn(), makeShadow: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe('hub', () => {
  it('delivers typed events to listeners until they unsubscribe', () => {
    const hub = createHub();
    const seen: number[] = [];
    const off = hub.on('waveStart', ({ wave }) => seen.push(wave));
    hub.emit('waveStart', { wave: 1, waves: 10 });
    off();
    hub.emit('waveStart', { wave: 2, waves: 10 });
    expect(seen).toEqual([1]);
  });

  it('tells the overlay when the renderer held the run by itself', () => {
    const hub = createHub();
    const reasons: string[] = [];
    hub.on('paused', ({ reason }) => reasons.push(reason));
    hub.emit('paused', { reason: 'hidden' });
    expect(reasons).toEqual(['hidden']);
  });
});


const config: KitchenConfig = { seed: 42, chapterId: CONTENT.chapters[0].id, wave: 1,
  breads: [{ id: 'kosong', level: 3 }], dips: [{ id: 'fish-curry', level: 2, linkedBread: 'kosong' }] };
type Driver = {
  world: World | null; paused: boolean;
  start(seed: number): void; startBot(): void;
  startKitchen(config: KitchenConfig): void; tuneKitchen(tuning: KitchenTuning): void; stopKitchen(): void;
  quit(): void; handle(world: World, events: GameEvent[]): void; endRun(world: World): void;
  publishHud(world: World, dt: number): void; kitchenStats(): KitchenStats | null;
};
function scene(search = '') {
  vi.stubGlobal('window', { location: { search }, __world: null });
  const hub = createHub(), track = vi.fn<Bridge['track']>(async () => {}), save = vi.fn(async () => {});
  const load = vi.fn(async () => null as string | null);
  const renderer = new RunScene();
  Object.assign(renderer, { hub, bridge: { track, save, load },
    stall: { reset: vi.fn(), setBackground: vi.fn(), snapshot: vi.fn() },
    actors: { clear: vi.fn() }, fx: { clear: vi.fn() }, tele: { clear: vi.fn() }, danger: { clear: vi.fn() },
    drag: { release: vi.fn() }, cameras: { main: { setScroll: vi.fn() } }, game: { loop: { running: true } },
    onHit: vi.fn(), onDot: vi.fn(), sfx: vi.fn(), buzz: vi.fn(), addTrauma: vi.fn(),
  });
  return { driver: renderer as unknown as Driver, hub, track, save, load };
}
function finish(world: World, won: boolean) {
  world.phase = won ? 'won' : 'lost';
  world.result = { won, wave: world.wave, kills: world.kills, bossKills: 0, time: world.time,
    level: world.player.level, gold: 999, breads: world.player.breads, dips: world.player.dips };
}

describe('kitchen renderer lifecycle through the hub', () => {
  it.each([true, false])('keeps kitchen terminal events separate and never saves or tracks; won=%s', (won) => {
    const { driver, hub, save, track } = scene();
    const normal = vi.fn(), starts = vi.fn(), ends = vi.fn();
    hub.on('runStart', normal); hub.on('runEnd', normal); hub.on('boss', normal);
    hub.on('kitchenStart', starts); hub.on('kitchenEnd', ends);
    driver.startKitchen(config);
    expect(starts).toHaveBeenCalledWith({ seed: 42, tuning: DEFAULT_KITCHEN_TUNING });
    const w = driver.world!;
    driver.handle(w, [{ t: 'bossSpawn', bossId: 'test', name: 'Test boss' }]);
    finish(w, won); driver.endRun(w); driver.endRun(w);
    expect(ends).toHaveBeenCalledTimes(1);
    expect(ends.mock.calls[0][0].reason).toBe(won ? 'won' : 'lost');
    driver.stopKitchen();
    expect(driver.world).toBeNull();
    expect(ends).toHaveBeenCalledTimes(2);
    expect(ends.mock.calls[1][0].reason).toBe('stopped');
    driver.stopKitchen();
    expect(ends).toHaveBeenCalledTimes(2);
    expect(normal).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('stops a live kitchen without payable early result and resets mode for normal play', () => {
    const { driver, hub, track, save } = scene();
    const normal = vi.fn(), ends = vi.fn(); hub.on('runEnd', normal); hub.on('kitchenEnd', ends);
    driver.startKitchen(config);
    const abandoned = driver.world!; abandoned.gold = 900;
    driver.quit(); driver.stopKitchen();
    expect(abandoned.result).toBeNull();
    expect(driver.world).toBeNull();
    expect(ends).toHaveBeenCalledTimes(1);
    expect(ends.mock.calls[0][0].reason).toBe('stopped');
    expect(normal).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    driver.start(123);
    expect(driver.kitchenStats()).toBeNull();
    finish(driver.world!, true); driver.endRun(driver.world!);
    expect(normal).toHaveBeenCalledTimes(1);
    expect(track.mock.calls.map((c) => c[0])).toEqual(['run_start', 'run_end']);
    expect(save).not.toHaveBeenCalled();
  });

  it('publishes bounded tuning and honest damage shown metrics with the normal HUD', () => {
    const { driver, hub } = scene(); const snapshots: KitchenStats[] = [], hud = vi.fn();
    hub.on('kitchenStats', (value) => snapshots.push(value)); hub.on('hud', hud);
    driver.startKitchen(config);
    expect(snapshots[0].damageShownPerSecond).toBe(0);
    driver.tuneKitchen({ ...DEFAULT_KITCHEN_TUNING, damage: 2 });
    expect(snapshots.at(-1)?.tuning.damage).toBe(2);
    const w = driver.world!; w.time = 2;
    driver.handle(w, [{ t: 'hit', uid: 1, x: 0, y: 0, dmg: 1000, crit: false, color: null },
      { t: 'dot', uid: 1, x: 0, y: 0, dmg: 20, color: '#ffffff' }]);
    driver.publishHud(w, 1);
    expect(snapshots.at(-1)).toMatchObject({ time: 2, damageShown: 1020, damageShownPerSecond: 510 });
    expect(hud).toHaveBeenCalledTimes(1);
    driver.startKitchen(config);
    expect(snapshots.at(-1)?.damageShown).toBe(0);
  });

  it('ignores a late bot save read after the owner has entered the kitchen', async () => {
    const { driver, hub, load } = scene('?bot=1');
    let resolve: (value: string | null) => void = () => {};
    load.mockImplementationOnce(() => new Promise<string | null>((done) => { resolve = done; }));
    const starts = vi.fn(); hub.on('runStart', starts);
    driver.startBot(); driver.startKitchen(config);
    resolve(null); await Promise.resolve();
    expect(driver.world?.seed).toBe(42);
    expect(driver.kitchenStats()).not.toBeNull();
    expect(starts).not.toHaveBeenCalled();
  });

  it('queues kitchen controls through asset loading and lets a later normal start replace them', () => {
    const hub = createHub(), start = vi.fn();
    const boot = new BootScene();
    Object.assign(boot, { registry: { get: () => hub, set: vi.fn() }, load: { on: vi.fn(), once: vi.fn() }, scene: { start } });
    boot.preload();
    hub.controls!.startKitchen(config);
    hub.controls!.tuneKitchen({ ...DEFAULT_KITCHEN_TUNING, damage: 3 });
    boot.create();
    expect(start.mock.calls[0][1].pendingKitchen).toMatchObject({ seed: 42, tuning: { damage: 3 } });
    hub.controls!.stopKitchen(); boot.create();
    expect(start.mock.calls[1][1].pendingKitchen).toBeNull();
    hub.controls!.startKitchen(config); hub.controls!.start(5); boot.create();
    expect(start.mock.calls[2][1]).toMatchObject({ pending: { seed: 5 }, pendingKitchen: null });
  });
});
