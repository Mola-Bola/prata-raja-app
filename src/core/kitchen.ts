// In-memory experiments only. Callers must keep these worlds out of progression/save handlers.
import { MAX_BREADS, MAX_DIPS } from './cards';
import { createRun, startRunWave } from './sim';
import { BASE_STATS, computeStats } from './stats';
import type { BreadId, Content, DipId, World } from './types';

export const KITCHEN_MAX_BREADS = MAX_BREADS;
export const KITCHEN_MAX_DIPS = MAX_DIPS;
export const KITCHEN_MAX_LINKED_DIPS = 2;
export const KITCHEN_LINKABLE_DIPS: readonly DipId[] = ['fish-curry', 'condensed-milk', 'mint-chutney'];

/** Absolute knobs: damage/throwSpeed multipliers; crit/moveFire fractions. */
export type KitchenTuning = { hp: number; damage: number; throwSpeed: number; crit: number; moveFire: number };
export const DEFAULT_KITCHEN_TUNING: Readonly<KitchenTuning> = { hp: 100, damage: 1, throwSpeed: 1, crit: 0.05, moveFire: 0 };
export const KITCHEN_LIMITS: Readonly<Record<keyof KitchenTuning, readonly [number, number]>> = {
  hp: [1, 10000], damage: [0.1, 10], throwSpeed: [0.1, 5], crit: [0, 1], moveFire: [0, 1],
};
export type KitchenConfig = {
  seed: number;
  chapterId: string;
  /** Actual 1-based wave in the selected chapter, including boss waves. */
  wave: number;
  breads: { id: BreadId; level: number }[];
  /** Omitted linkedBread means all breads; only KITCHEN_LINKABLE_DIPS support a target. */
  dips: { id: DipId; level: number; linkedBread?: BreadId }[];
  tuning?: Partial<KitchenTuning>;
};

/** Evolved weapons have one playable tier even though their content repeats its stats five times. */
export function kitchenBreadLevelCap(content: Content, id: BreadId): number {
  const def = content.breads[id];
  if (!def) throw new Error(`Unknown bread: ${id}`);
  return def.evolvedFrom ? 1 : Math.min(5, def.levels.length);
}

/** Recompute from base numbers, never from previously tuned numbers. Preserve current health fraction.
 *  Pass the full knob state (merge a UI patch into its current state first). No RNG is consumed. */
export function applyKitchenTuning(world: World, tuning: KitchenTuning): KitchenTuning {
  const bounded = { ...tuning };
  for (const key of Object.keys(KITCHEN_LIMITS) as (keyof KitchenTuning)[]) {
    if (!Number.isFinite(tuning[key])) throw new Error(`Kitchen ${key} must be finite`);
    const [low, high] = KITCHEN_LIMITS[key];
    bounded[key] = Math.max(low, Math.min(high, tuning[key]));
  }
  const health = Math.max(0, Math.min(1, world.player.hp / world.player.stats.maxHp));
  world.loadout = { ...world.loadout, stats: {
    maxHp: bounded.hp - BASE_STATS.maxHp,
    dmgPct: bounded.damage - 1,
    throwSpeedPct: bounded.throwSpeed - 1,
    critChance: bounded.crit - BASE_STATS.critChance,
    throwWhileMoving: bounded.moveFire,
    xpPct: -1, // Fixed owner-selected build: kills award no XP and cannot interrupt with random card offers.
  } };
  world.player.stats = computeStats([], world.content, world.loadout);
  world.player.hp = world.player.stats.maxHp * health;
  return bounded;
}

/** Creates a fresh sandbox without importing persistence, unlocks, gear or reward APIs. */
export function createKitchenRun(config: KitchenConfig, content: Content): World {
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff) throw new Error('Kitchen seed must be an unsigned 32-bit integer');
  const chapter = content.chapters.find((ch) => ch.id === config.chapterId);
  if (!chapter) throw new Error('Unknown kitchen chapter');
  if (!Number.isInteger(config.wave) || config.wave < 1 || config.wave > chapter.waves.length) throw new Error('Invalid kitchen wave');
  if (!config.breads.length || config.breads.length > MAX_BREADS) throw new Error(`Choose 1–${MAX_BREADS} breads`);
  if (config.dips.length > MAX_DIPS) throw new Error(`Choose at most ${MAX_DIPS} dips`);
  const families = new Set<BreadId>();
  for (const b of config.breads) {
    const cap = kitchenBreadLevelCap(content, b.id);
    if (!Number.isInteger(b.level) || b.level < 1 || b.level > cap) throw new Error(`Invalid level for ${b.id}`);
    const family = content.breads[b.id].evolvedFrom?.bread ?? b.id;
    if (families.has(family)) throw new Error('A bread and its evolution share one slot');
    families.add(family);
  }
  if (new Set(config.dips.map((d) => d.id)).size !== config.dips.length) throw new Error('Duplicate kitchen dip');
  if (config.dips.filter((d) => d.linkedBread).length > KITCHEN_MAX_LINKED_DIPS) throw new Error('At most two linked dips');
  for (const dip of config.dips) {
    const def = content.dips[dip.id];
    if (!def || !Number.isInteger(dip.level) || dip.level < 1 || dip.level > Math.min(5, def.levels.length)) throw new Error(`Invalid kitchen dip or level: ${dip.id}`);
    if (dip.linkedBread && (!KITCHEN_LINKABLE_DIPS.includes(dip.id) || !config.breads.some((b) => b.id === dip.linkedBread))) throw new Error('Linked dip requires a supported dip and selected bread');
  }
  const world = createRun({ seed: config.seed, content, chapterId: config.chapterId });
  world.player.breads = config.breads.map((b) => ({ ...b, cd: 0.4, volleyLeft: 0, volleyT: 0 }));
  world.player.dips = config.dips.map((d) => ({ ...d }));
  applyKitchenTuning(world, { ...DEFAULT_KITCHEN_TUNING, ...config.tuning });
  startRunWave(world, config.wave);
  return world;
}
