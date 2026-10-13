import { describe, expect, it } from 'vitest';
import { makeRng, type Rng } from '../rng';
import { ENEMY_COST, spawnTick, startWave, waveDone, type SpawnRequest } from '../waves';
import type { Enemy, EnemyKind, World, WaveDef } from '../types';

const DT = 1 / 30;
const KINDS: Record<string, EnemyKind> = { walker: 'walker', runner: 'runner', flyer: 'flyer', tank: 'tank', swarm: 'swarm' };

/** Only what waves.ts reads: chapter.waves, content.enemies (kind, cloud), the clocks, budget and enemies. */
function fakeWorld(waves: WaveDef[], seed = 1): World {
  const enemies = Object.fromEntries(Object.entries(KINDS).map(([id, kind]) => [id, { id, kind }]));
  return {
    seed, rngState: seed,
    content: { enemies },
    chapter: { id: 'test', name: 'test', background: '', hpPerWave: 0, waves },
    time: 0, phase: 'wave', wave: 0, waveTime: 0, budgetLeft: 0, spawnClock: 0,
    enemies: [], projectiles: [], zones: [], nextUid: 1, kills: 0, bossKills: 0, gold: 0,
    pendingLevelUps: 0, offer: [], rerolls: 0, events: [], result: null,
  } as unknown as World;
}

const wave = (over: Partial<WaveDef> = {}): WaveDef => ({ budget: 40, duration: 30, mix: { walker: 1 }, eliteChance: 0, ...over });
const enemy = (over: Partial<Enemy> = {}): Enemy => ({ boss: false, state: 'walk', ...over }) as unknown as Enemy;

/** Start wave n and tick it at DT until waveDone (the fake world has no enemies, so the budget decides). Returns every spawn. */
function playWave(world: World, rng: Rng, n = 1): SpawnRequest[] {
  const out = [...startWave(world, n).spawns];
  for (let ticks = 0; !waveDone(world); ticks++) {
    if (ticks > 5000) throw new Error('wave never ended');
    out.push(...spawnTick(world, DT, rng));
  }
  return out;
}

describe('startWave', () => {
  it('resets the wave clock and budget and announces the wave', () => {
    const w = fakeWorld([wave({ budget: 10 }), wave({ budget: 25, duration: 40 })]);
    w.waveTime = 9; w.spawnClock = 4; w.budgetLeft = 0;
    const { events, spawns } = startWave(w, 2);
    expect(w).toMatchObject({ wave: 2, waveTime: 0, budgetLeft: 25, spawnClock: 0 });
    expect(events).toEqual([{ t: 'waveStart', wave: 2, total: 2 }]);
    expect(spawns).toEqual([]);
  });

  it('spawns the boss at x 0 only for boss waves', () => {
    const w = fakeWorld([wave(), wave({ boss: 'warden' })]);
    expect(startWave(w, 1).spawns).toEqual([]);
    expect(startWave(w, 2).spawns).toEqual([{ enemyId: 'warden', elite: false, x: 0, boss: true }]);
  });
});

describe('spawnTick', () => {
  it('advances wave time and resets the gap clock only on a spawn', () => {
    const w = fakeWorld([wave()]);
    startWave(w, 1);
    const rng = makeRng(1);
    expect(spawnTick(w, 0.25, rng)).toHaveLength(1);
    expect(w.waveTime).toBeCloseTo(0.25);
    expect(w.spawnClock).toBe(0);
    expect(spawnTick(w, 0.001, rng)).toHaveLength(0);
    expect(w.waveTime).toBeCloseTo(0.251);
    expect(w.spawnClock).toBeCloseTo(0.001);
  });

  it('never overspends and stops within one cheapest cost of the budget', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const w = fakeWorld([wave({ budget: 37.5, mix: { walker: 1, runner: 1, flyer: 1, tank: 1 } })]);
      const rng = makeRng(seed);
      startWave(w, 1);
      let spent = 0;
      for (let ticks = 0; !waveDone(w); ticks++) {
        if (ticks > 5000) throw new Error('wave never ended');
        for (const r of spawnTick(w, DT, rng)) spent += ENEMY_COST[KINDS[r.enemyId]];
        expect(spent).toBeLessThanOrEqual(37.5);
      }
      expect(37.5 - spent).toBeGreaterThanOrEqual(0);
      expect(37.5 - spent).toBeLessThan(ENEMY_COST.walker);
    }
  });

  it('paces the spend along (waveTime / duration)^0.85 so pressure builds', () => {
    const w = fakeWorld([wave({ budget: 100, duration: 30 })]);
    const rng = makeRng(5);
    startWave(w, 1);
    const spentShareAfter = (ticks: number) => {
      for (let i = 0; i < ticks; i++) spawnTick(w, DT, rng);
      return (100 - w.budgetLeft) / 100;
    };
    const quarter = spentShareAfter(225); // 7.5 s
    const half = spentShareAfter(225); // 15 s, cumulative
    // Walkers cost 1 of 100, so the spend sits just above the curve (the linear 25% / 50% would miss).
    expect(quarter - 0.25 ** 0.85).toBeGreaterThanOrEqual(0);
    expect(quarter - 0.25 ** 0.85).toBeLessThan(0.01);
    expect(half - 0.5 ** 0.85).toBeGreaterThanOrEqual(0);
    expect(half - 0.5 ** 0.85).toBeLessThan(0.01);
    expect(Math.abs(half - 0.55)).toBeLessThan(0.15); // spec band: about 55% at half time
  });

  it('fills quiet streets in waves 6–9 within 2.5s, spending only their existing budget', () => {
    for (const n of [6, 7, 8, 9]) {
      const w = fakeWorld(Array.from({ length: 9 }, () => wave({ budget: 42, duration: 30, mix: { tank: 1 } })));
      startWave(w, n);
      const rng = makeRng(n);
      let gap = 0;
      let spent = 0;
      while (!waveDone(w)) {
        gap += DT;
        const requests = spawnTick(w, DT, rng);
        if (requests.length > 0) {
          expect(gap).toBeLessThanOrEqual(2.5 + DT * 2);
          gap = 0;
          spent += requests.length * ENEMY_COST.tank;
        }
      }
      expect(spent).toBe(42);
      expect(w.budgetLeft).toBe(0);
    }
  });

  it('keeps busy late waves on the normal spend curve', () => {
    const w = fakeWorld(Array.from({ length: 9 }, () => wave({ budget: 42, duration: 30, mix: { tank: 1 } })));
    startWave(w, 8);
    w.enemies = [enemy(), enemy(), enemy()];
    const requests = spawnTick(w, 3, makeRng(8));
    expect(requests).toHaveLength(1);
    expect(w.budgetLeft).toBe(36);
  });

  it('keeps x inside ±230 and at least 40 u apart between single spawns', () => {
    const w = fakeWorld([wave({ budget: 300, mix: { walker: 1, runner: 1, flyer: 1, tank: 1 } })]);
    const xs = playWave(w, makeRng(9)).map((r) => r.x);
    expect(xs.length).toBeGreaterThan(50);
    expect(xs.every((x) => Math.abs(x) <= 230)).toBe(true);
    expect(xs.slice(1).every((x, i) => Math.abs(x - xs[i]) >= 40)).toBe(true);
    expect(Math.min(...xs)).toBeLessThan(-150); // spread across the lane, not bunched
    expect(Math.max(...xs)).toBeGreaterThan(150);
  });

  it('spawns a swarm pick as a cloud of 6 within ±50 u, never elite', () => {
    const w = fakeWorld([wave({ budget: 60, mix: { swarm: 1 }, eliteChance: 1 })]);
    const reqs = playWave(w, makeRng(11));
    expect(reqs).toHaveLength(120); // cost 3 per pick, 20 picks, 6 members each
    for (let i = 0; i < reqs.length; i += 6) {
      const cloud = reqs.slice(i, i + 6);
      const xs = cloud.map((r) => r.x);
      expect(cloud.every((r) => r.enemyId === 'swarm' && !r.elite && !r.boss)).toBe(true);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(100);
      expect(xs.every((x) => Math.abs(x) <= 230)).toBe(true);
    }
  });

  it('elite share tracks eliteChance over many waves', () => {
    const w = fakeWorld([wave({ budget: 100, mix: { walker: 1, runner: 1 }, eliteChance: 0.2 })]);
    const rng = makeRng(13);
    let total = 0;
    let elite = 0;
    for (let n = 0; n < 50; n++) {
      for (const r of playWave(w, rng)) {
        total++;
        if (r.elite) elite++;
      }
    }
    expect(total).toBeGreaterThan(4000);
    expect(Math.abs(elite / total - 0.2)).toBeLessThan(0.03);
  });

  it('is deterministic for the same seed', () => {
    const run = (seed: number) =>
      playWave(fakeWorld([wave({ budget: 80, mix: { walker: 1, swarm: 1, tank: 1 }, eliteChance: 0.3 })]), makeRng(seed));
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });
});

describe('waveDone', () => {
  const setup = () => {
    const w = fakeWorld([wave({ budget: 10, mix: { walker: 1, tank: 1 } })]);
    startWave(w, 1);
    return w;
  };

  it('is not done while budget and time remain', () => {
    expect(waveDone(setup())).toBe(false);
  });

  it('is done once budget is below the cheapest cost and at most 2 non-boss enemies live', () => {
    const w = setup();
    w.budgetLeft = 1; // cheapest in the mix is walker (1): not below it yet
    expect(waveDone(w)).toBe(false);
    w.budgetLeft = 0.5;
    w.enemies = [enemy(), enemy()];
    expect(waveDone(w)).toBe(true);
    w.enemies.push(enemy());
    expect(waveDone(w)).toBe(false);
    w.enemies[2] = enemy({ state: 'dead' }); // dead ones do not count
    expect(waveDone(w)).toBe(true);
  });

  it('is done after duration + 15 s whatever the budget and enemies', () => {
    const w = setup();
    w.enemies = [enemy(), enemy(), enemy()];
    w.waveTime = 45;
    expect(waveDone(w)).toBe(false);
    w.waveTime = 45.5;
    expect(waveDone(w)).toBe(true);
  });

  it('keeps a boss wave open while its boss lives, even past the timeout', () => {
    const w = fakeWorld([wave({ budget: 10, boss: 'warden' })]);
    startWave(w, 1);
    w.budgetLeft = 0;
    w.waveTime = 100;
    w.enemies = [enemy({ boss: true })];
    expect(waveDone(w)).toBe(false);
    w.enemies = [enemy({ boss: true, state: 'dead' })];
    expect(waveDone(w)).toBe(true);
  });
});
