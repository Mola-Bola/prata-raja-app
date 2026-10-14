// Flow director (chapter.mode 'flow'): no waves. The stall travels at a cruise speed; world.dist (metres) is the clock.
// Pressure is a curve over distance, built from the chapter's own wave rows: each non-boss wave is a keyframe (threat/second =
// budget / duration, its mix, its elite chance) and the director blends smoothly between neighbours, so the street never resets.
// At chapter.bossAt the stall slows to a stop and the boss steps out; once it dies the run is won. Creates no enemies itself: it
// returns SpawnRequests that sim.ts turns into enemies (same rng stream, same spawn functions as waves).
import type { Rng } from './rng';
import { ENEMY_COST, spawnPick, type SpawnRequest } from './waves';
import type { ChapterDef, Enemy, SpawnLane, World } from './types';

/** Cruise speed in metres per second (the stall slows to a halt over the last BRAKE metres before the boss). */
export const CRUISE = 5;
const BRAKE = 60;
/** Default distance to the boss when a chapter does not set bossAt. */
export const DEFAULT_BOSS_AT = 1200;
/** Flow runs hold level-up picks until a calm stop: every PICK_EVERY metres (and the boss mark). */
export const PICK_EVERY = 250;
/** Seconds the stall takes to ease to a stop before queued picks show. */
export const CALM_TIME = 1.5;
/** Threat points that may be unspent at once (a tank costs 6), so a throttled street never bursts when it clears. */
const CREDIT_CAP = 8;
/** Living threat above which the street stops asking for more: the director never buries a bot that is behind. */
export const LIVE_CAP = 12;

export const isFlow = (chapter: ChapterDef): boolean => chapter.mode === 'flow';
export const bossAtOf = (chapter: ChapterDef): number => chapter.bossAt ?? DEFAULT_BOSS_AT;
const fightWave = (chapter: ChapterDef) => chapter.waves[chapter.waves.length - 1];
const rows = (chapter: ChapterDef) => chapter.waves.filter((wv) => !wv.boss);
const smooth = (t: number): number => t * t * (3 - 2 * t);

export type Pressure = { rate: number; mix: Record<string, number>; eliteChance: number };

/** The pressure at `dist` metres: threat per second, enemy weights and elite chance, blended between wave rows. */
export function pressureAt(chapter: ChapterDef, dist: number): Pressure {
  const ks = rows(chapter);
  const p = Math.min(ks.length - 1, Math.max(0, (dist / bossAtOf(chapter)) * ks.length - 0.5));
  const i = Math.min(ks.length - 1, Math.floor(p));
  const a = ks[i];
  const b = ks[Math.min(ks.length - 1, i + 1)];
  const t = smooth(p - i);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const mix: Record<string, number> = {};
  for (const id of [...new Set([...Object.keys(a.mix), ...Object.keys(b.mix)])].sort()) mix[id] = lerp(a.mix[id] ?? 0, b.mix[id] ?? 0);
  return { rate: lerp(a.budget / a.duration, b.budget / b.duration), mix, eliteChance: lerp(a.eliteChance, b.eliteChance) };
}

/** 1-based wave-equivalent for hp scaling and reports: 1 at the start, rising to the last pre-boss row, boss row at the boss. */
export function waveEquivalent(chapter: ChapterDef, dist: number): number {
  const k = rows(chapter).length;
  return 1 + Math.min(1, dist / bossAtOf(chapter)) * (k - 1);
}

export type FlowOut = { spawns: SpawnRequest[]; won: boolean };

/** Share of spawns that come in from the sides: 20% at the start of the street, 40% by the boss (about 30% on average). */
const SIDE_CHANCE = { from: 0.2, to: 0.4 };

/** Pick a lane for one enemy pick. Swarm clouds always come ahead. Draws from rng, so it is deterministic per seed. */
function pickLane(world: World, rng: Rng, id: string): SpawnLane {
  const frac = Math.min(1, world.dist / bossAtOf(world.chapter));
  const side = rng.chance(SIDE_CHANCE.from + (SIDE_CHANCE.to - SIDE_CHANCE.from) * frac);
  const right = rng.chance(0.5);
  if (!side || world.content.enemies[id].kind === 'swarm') return 'ahead';
  return right ? 'right' : 'left';
}

const living = (e: Enemy) => e.state !== 'dead';

/** The next calm stop strictly after `dist`: the next multiple of PICK_EVERY, capped at the boss mark. Infinity once past it. */
export function nextPickStop(dist: number, bossAt: number): number {
  if (dist >= bossAt) return Infinity;
  return Math.min(bossAt, (Math.floor(dist / PICK_EVERY) + 1) * PICK_EVERY);
}

/** Flow only. When queued picks are due (a checkpoint passed, or the boss mark reached before the boss steps out), start the
 *  stall's ease to a stop (world.calmT counts down from CALM_TIME; flowTick reads it). Returns true once, when the stop is
 *  complete and the offers should show. Never during the boss fight: picks queued then wait for the next run. */
export function pickDue(world: World, dt: number): boolean {
  const bossAt = bossAtOf(world.chapter);
  if (world.pendingLevelUps <= 0 || world.flowBoss) {
    world.calmT = 0;
    // A checkpoint passed with nothing queued is not owed later: the next pick waits for the one after it.
    if (!world.flowBoss && world.dist >= (world.pickAt ?? nextPickStop(0, bossAt))) world.pickAt = nextPickStop(world.dist, bossAt);
    return false;
  }
  let calmT = world.calmT ?? 0;
  if (!(calmT > 0)) {
    const pickAt = world.pickAt ?? nextPickStop(0, bossAt);
    if (world.dist < pickAt && world.dist < bossAt) return false;
    calmT = CALM_TIME;
  }
  calmT = Math.max(0, calmT - dt);
  world.calmT = calmT;
  if (calmT > 0) return false;
  world.pickAt = nextPickStop(world.dist, bossAt);
  return true;
}

/** Advance the flow by dt. Call once per sim step while the run is live. */
export function flowTick(world: World, dt: number, rng: Rng): FlowOut {
  const chapter = world.chapter;
  const out: SpawnRequest[] = [];
  let pr: Pressure;
  if (world.flowBoss) {
    if (!world.enemies.some((e) => e.boss && living(e))) return { spawns: out, won: true };
    const bw = fightWave(chapter);
    pr = { rate: bw.budget / bw.duration, mix: bw.mix, eliteChance: bw.eliteChance };
  } else {
    const bossAt = bossAtOf(chapter);
    const left = bossAt - world.dist;
    // Picks due: the stall eases out of cruise over CALM_TIME (smooth, reaching 0 when the offers open).
    const calm = (world.calmT ?? 0) > 0 ? smooth((world.calmT ?? 0) / CALM_TIME) : 1;
    world.dist = Math.min(bossAt, world.dist + (world.content.tune?.cruise ?? CRUISE) * calm * Math.min(1, Math.max(0.1, left / BRAKE)) * dt);
    world.waveF = waveEquivalent(chapter, world.dist);
    world.wave = Math.floor(world.waveF);
    // Queued picks come before the boss steps out (pickDue opens them at the boss mark).
    if (world.dist >= bossAt && world.pendingLevelUps === 0) {
      world.flowBoss = true;
      world.wave = chapter.waves.length;
      world.waveF = world.wave;
      world.lastSpawnX = 0;
      return { spawns: [{ enemyId: fightWave(chapter).boss!, elite: false, x: 0, boss: true }], won: false };
    }
    pr = pressureAt(chapter, world.dist);
  }
  let heat = 0;
  for (const e of world.enemies) if (living(e) && !e.boss) heat += ENEMY_COST[e.def.kind];
  if (heat < (world.content.tune?.liveCap ?? LIVE_CAP)) world.credit = Math.min(CREDIT_CAP, world.credit + pr.rate * (world.content.tune?.pressure ?? 1) * dt);
  for (;;) {
    const fits = Object.keys(pr.mix).filter((id) => pr.mix[id] > 0 && ENEMY_COST[world.content.enemies[id].kind] <= world.credit).sort();
    if (fits.length === 0) break;
    const id = rng.weighted(fits, (k) => pr.mix[k]);
    world.credit -= ENEMY_COST[world.content.enemies[id].kind];
    const lane = pickLane(world, rng, id);
    const from = out.length;
    spawnPick(world, rng, id, pr.eliteChance, out);
    for (let i = from; i < out.length; i++) out[i].lane = lane;
  }
  return { spawns: out, won: false };
}
