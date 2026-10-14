import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyKitchenTuning, createKitchenRun, DEFAULT_KITCHEN_TUNING, kitchenBreadLevelCap, type KitchenConfig } from '../kitchen';
import { createRun, startRunWave, step } from '../sim';
import { BASE_STATS, waveHpScale } from '../stats';

const config = (patch: Partial<KitchenConfig> = {}): KitchenConfig => ({
  seed: 123, chapterId: CONTENT.chapters[0].id, wave: 1,
  breads: [{ id: 'kosong', level: 5 }], dips: [], ...patch,
});
const input = { targetX: null, moving: false };

describe('Test Kitchen', () => {
  it('starts the real chapter boss wave with its original HP scaling and spawn RNG', () => {
    for (const chapter of CONTENT.chapters) {
      const bossIndex = chapter.waves.findIndex((wave) => wave.boss);
      expect(bossIndex).toBeGreaterThanOrEqual(0);
      const wave = bossIndex + 1;
      const world = createKitchenRun(config({ chapterId: chapter.id, wave }), CONTENT);
      expect(world.chapter).toMatchObject({ id: chapter.id, mode: 'waves' });
      expect(world.chapter.waves).toBe(chapter.waves);
      expect(world.wave).toBe(wave);
      expect(world.chapter.waves).toHaveLength(chapter.waves.length);
      expect(world.budgetLeft).toBe(chapter.waves[bossIndex].budget);
      const boss = world.enemies.find((enemy) => enemy.boss)!;
      expect(boss.def.id).toBe(chapter.waves[bossIndex].boss);
      expect(boss.hp).toBe(boss.def.hp * waveHpScale(chapter, wave));
      expect(world.events).toContainEqual({ t: 'waveStart', wave, total: chapter.waves.length });
      expect(world.rngState).not.toBe(world.seed);
      expect(world).toEqual(createKitchenRun(config({ chapterId: chapter.id, wave }), CONTENT));
    }
  });

  it('uses the actual late-wave budget and scaling for normal spawns', () => {
    const world = createKitchenRun(config({ wave: 8 }), CONTENT);
    step(world, 1, input);
    expect(world.wave).toBe(8);
    expect(world.enemies.length).toBeGreaterThan(0);
    for (const enemy of world.enemies) expect(enemy.maxHp).toBe(enemy.def.hp * waveHpScale(world.chapter, 8) * (enemy.elite ? 3 : 1));
  });

  it('replays a selected evolved build without changing its cards or source content', () => {
    const setup = config({ breads: [{ id: 'inferno-bomb', level: 1 }, { id: 'vadai', level: 5 }],
      dips: [{ id: 'fish-curry', level: 5, linkedBread: 'inferno-bomb' }, { id: 'ghee', level: 5 }], tuning: { hp: 10000, damage: 10 } });
    const original = JSON.stringify({ setup, content: CONTENT });
    const a = createKitchenRun(setup, CONTENT), b = createKitchenRun(setup, CONTENT);
    for (let i = 0; i < 300; i++) {
      const move = { targetX: i % 60 < 30 ? -100 : 100, moving: false };
      step(a, 0.1, move); step(b, 0.1, move);
      expect(a.phase).not.toBe('levelup');
    }
    expect(a.kills).toBeGreaterThan(0);
    expect(a.player.xp).toBe(0);
    expect(a.pendingLevelUps).toBe(0);
    expect(a.offer).toEqual([]);
    expect(a.player.breads.map(({ id, level }) => ({ id, level }))).toEqual(setup.breads);
    expect(a.player.dips).toEqual(setup.dips);
    expect(a).toEqual(b);
    expect(JSON.stringify({ setup, content: CONTENT })).toBe(original);
  });

  it('recalculates absolute live knobs without compounding or free healing', () => {
    const world = createKitchenRun(config(), CONTENT);
    world.player.hp = 25;
    const rng = world.rngState;
    const tuning = { hp: 400, damage: 3, throwSpeed: 2, crit: 0.7, moveFire: 0.5 };
    applyKitchenTuning(world, tuning);
    const stats = { ...world.player.stats };
    expect(world.player.hp).toBe(100);
    expect(stats).toMatchObject({ maxHp: 400, dmgPct: 2, throwSpeedPct: 1, critChance: 0.7, throwWhileMoving: 0.5, xpPct: -1 });
    applyKitchenTuning(world, tuning);
    expect(world.player.stats).toEqual(stats);
    expect(world.player.hp).toBe(100);
    applyKitchenTuning(world, { ...DEFAULT_KITCHEN_TUNING });
    expect(world.player.stats).toEqual({ ...BASE_STATS, xpPct: -1 });
    expect(world.player.hp).toBe(25);
    expect(world.rngState).toBe(rng);
    world.player.hp = 0;
    applyKitchenTuning(world, tuning);
    expect(world.player.hp).toBe(0);
  });

  it('bounds finite controls and rejects NaN without partially mutating the run', () => {
    const world = createKitchenRun(config(), CONTENT);
    expect(applyKitchenTuning(world, { hp: -1, damage: 100, throwSpeed: 0, crit: 2, moveFire: -1 }))
      .toEqual({ hp: 1, damage: 10, throwSpeed: 0.1, crit: 1, moveFire: 0 });
    const before = JSON.stringify(world);
    expect(() => applyKitchenTuning(world, { ...DEFAULT_KITCHEN_TUNING, crit: NaN })).toThrow('finite');
    expect(JSON.stringify(world)).toBe(before);
  });

  it('supports all existing weapons at their real playable caps and detached dip selections', () => {
    for (const bread of Object.values(CONTENT.breads)) {
      const level = kitchenBreadLevelCap(CONTENT, bread.id);
      const world = createKitchenRun(config({ breads: [{ id: bread.id, level }], dips: [{ id: 'mint-chutney', level: 5, linkedBread: bread.id }] }), CONTENT);
      expect(world.player.breads[0]).toMatchObject({ id: bread.id, level });
      expect(level).toBe(bread.evolvedFrom ? 1 : 5);
    }
    const setup = config({ dips: [{ id: 'ghee', level: 4 }] });
    const world = createKitchenRun(setup, CONTENT);
    world.player.dips[0].level = 1;
    expect(setup.dips[0].level).toBe(4);
  });

  it.each<Partial<KitchenConfig>>([
    { seed: -1 }, { seed: 0x100000000 }, { seed: 1.5 }, { chapterId: 'missing' }, { wave: 0 }, { wave: 99 },
    { breads: [] }, { breads: [{ id: 'inferno-bomb', level: 2 }] }, { breads: [{ id: 'kosong', level: 6 }] },
    { breads: [{ id: 'kosong', level: 1 }, { id: 'golden-ghee-chakra', level: 1 }] },
    { dips: [{ id: 'ghee', level: 0 }] }, { dips: [{ id: 'ghee', level: 1 }, { id: 'ghee', level: 2 }] },
    { dips: [{ id: 'fish-curry', level: 2, linkedBread: 'appam' }] },
    { dips: [{ id: 'ghee', level: 2, linkedBread: 'kosong' }] },
    { dips: [{ id: 'fish-curry', level: 1, linkedBread: 'kosong' }, { id: 'mint-chutney', level: 1, linkedBread: 'kosong' }, { id: 'condensed-milk', level: 1, linkedBread: 'kosong' }] },
    { breads: ['kosong', 'tissue', 'roti-bomb', 'vadai', 'appam'].map(id => ({ id, level: 1 })) as KitchenConfig['breads'] },
    { dips: ['fish-curry', 'mint-chutney', 'condensed-milk', 'ghee', 'dhal'].map(id => ({ id, level: 1 })) as KitchenConfig['dips'] },
  ])('rejects invalid build configuration %j', patch => {
    expect(() => createKitchenRun(config(patch), CONTENT)).toThrow();
  });

  it('keeps ordinary starts unchanged and refuses to reset an active run', () => {
    const world = createRun({ seed: 1, content: CONTENT });
    expect(world.phase).toBe('intro');
    expect(world.wave).toBe(0);
    expect(world.player.stats).toEqual(BASE_STATS);
    expect(() => startRunWave(world, 0)).toThrow();
    startRunWave(world, 2);
    expect(() => startRunWave(world, 3)).toThrow('fresh run');
    const ordinary = createRun({ seed: 1, content: CONTENT });
    step(ordinary, 1.6, input);
    expect(ordinary.wave).toBe(1);
    expect(ordinary.player.stats.xpPct).toBe(0);
  });
});
