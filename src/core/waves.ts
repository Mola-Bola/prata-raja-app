// Wave director: spends each wave's threat budget over its duration and says when a wave is done.
// OWNER: swarm builder "waves". Creates no enemies itself: it returns SpawnRequests that sim.ts turns into enemies.
import type { Rng } from './rng';
import type { Enemy, EnemyKind, GameEvent, World } from './types';

export const ENEMY_COST: Record<EnemyKind, number> = {
  walker: 1, runner: 1, flyer: 1.5, swarm: 3, splitter: 2.5, shooter: 3, shielded: 3, tank: 6, healer: 3, summoner: 5, exploder: 2,
};

export type SpawnRequest = { enemyId: string; elite: boolean; x: number; boss: boolean };

const SPAWN_X = 230;
const SPACING = 40;
const CLOUD_SPREAD = 50;
/** The spent share of the budget follows (waveTime / duration)^PACE. */
const PACE = 0.85;

const waveDef = (world: World) => world.chapter.waves[world.wave - 1];
const kindOf = (world: World, id: string): EnemyKind => world.content.enemies[id].kind;
const costOf = (world: World, id: string): number => ENEMY_COST[kindOf(world, id)];
const isLiving = (e: Enemy) => e.state !== 'dead';

/** Start 1-based `wave` of world.chapter: set world.wave, waveTime 0, budgetLeft = def.budget, spawnClock 0.
 *  Returns a 'waveStart' event (total = chapter.waves.length) and, when def.boss is set, one boss SpawnRequest at x 0. */
export function startWave(world: World, wave: number): { events: GameEvent[]; spawns: SpawnRequest[] } {
  const def = world.chapter.waves[wave - 1];
  world.wave = wave;
  world.waveTime = 0;
  world.budgetLeft = def.budget;
  world.spawnClock = 0;
  const spawns: SpawnRequest[] = [];
  if (def.boss) {
    spawns.push({ enemyId: def.boss, elite: false, x: 0, boss: true });
    world.lastSpawnX = 0;
  }
  return { events: [{ t: 'waveStart', wave, total: world.chapter.waves.length }], spawns };
}

/** Turn one picked enemy id into spawn requests (a swarm pick is a whole cloud), keeping spacing from the last spawn. Shared with the flow director. */
export function spawnPick(world: World, rng: Rng, id: string, eliteChance: number, out: SpawnRequest[]): void {
  if (kindOf(world, id) === 'swarm') {
    // One pick = one cloud. Centres sit ±CLOUD_SPREAD inside the field, so members never need clamping.
    const spread = world.content.enemies[id].drain ? 25 : CLOUD_SPREAD;
    const width = world.content.enemies[id].drain?.halfWidth ?? (SPAWN_X - CLOUD_SPREAD);
    const cx = rng.range(-width, width);
    const n = world.content.enemies[id].cloud ?? 6;
    for (let i = 0; i < n; i++) out.push({ enemyId: id, elite: false, x: cx + rng.range(-spread, spread), boss: false });
    world.lastSpawnX = cx;
  } else {
    let x = rng.range(-SPAWN_X, SPAWN_X);
    const prev = world.lastSpawnX;
    while (prev !== undefined && Math.abs(x - prev) < SPACING) x = rng.range(-SPAWN_X, SPAWN_X);
    world.lastSpawnX = x;
    out.push({ enemyId: id, elite: rng.chance(eliteChance), x, boss: false });
  }
}

/** Advance world.waveTime/spawnClock by dt and return enemies to spawn now. Pacing: the spent share of the
 *  budget should track (waveTime / duration)^0.85, so pressure builds through the wave; spawn while behind.
 *  Pick enemy ids by def.mix weights; cost = ENEMY_COST[kind]; subtract from budgetLeft (stop when budget < cheapest).
 *  x uniform in [-230, 230] but at least 40 u from the previous spawn's x. elite with def.eliteChance.
 *  A swarm-kind pick returns `cloud` (default 6) requests clustered within ±50 u, never elite. Deterministic per rng. */
export function spawnTick(world: World, dt: number, rng: Rng): SpawnRequest[] {
  world.waveTime += dt;
  world.spawnClock += dt;
  const def = waveDef(world);
  const due = def.budget * (Math.min(1, world.waveTime / def.duration) ** PACE);
  const out: SpawnRequest[] = [];
  let living = 0;
  if (world.wave >= 6 && world.wave <= 9 && !def.boss) {
    for (const e of world.enemies) if (isLiving(e)) living++;
  }
  // Pull one affordable spawn forward when the late-wave street has gone quiet; never add threat.
  const fillGap = world.wave >= 6 && world.wave <= 9 && !def.boss && living <= 2 && world.spawnClock >= 2.5;
  // Spawn while the spent share is behind the curve. Only picks that fit the budget left, so nothing overshoots.
  while (def.budget - world.budgetLeft < due || (fillGap && out.length === 0)) {
    const fits = Object.keys(def.mix).filter((id) => def.mix[id] > 0 && costOf(world, id) <= world.budgetLeft).sort();
    if (fits.length === 0) break;
    const id = rng.weighted(fits, (k) => def.mix[k]);
    world.budgetLeft -= costOf(world, id);
    spawnPick(world, rng, id, def.eliteChance, out);
  }
  if (out.length > 0) world.spawnClock = 0;
  return out;
}

/** True when the current wave is over: (budgetLeft below the cheapest cost in its mix AND at most 2 living
 *  non-boss enemies) OR waveTime > duration + 15. A wave with a boss is only over when no boss is alive. */
export function waveDone(world: World): boolean {
  if (world.enemies.some((e) => e.boss && isLiving(e))) return false;
  const def = waveDef(world);
  if (world.waveTime > def.duration + 15) return true;
  const cheapest = Math.min(...Object.keys(def.mix).filter((id) => def.mix[id] > 0).map((id) => costOf(world, id)));
  const living = world.enemies.filter((e) => !e.boss && isLiving(e)).length;
  return world.budgetLeft < cheapest && living <= 2;
}
