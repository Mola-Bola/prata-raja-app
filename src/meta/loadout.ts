import { SIMMER_DIPS, simmerProgress } from '../core/dipProgression';
import type { Content, Loadout, PlayerStats } from '../core/types';
import { runPools } from './recipes';
import { itemStats } from './gear';
import { trainingStats } from './training';
import { mealOf } from './meals';
import { startDips } from './sockets';
import { specStats } from './specTree';
import { kannanLevel, kannanXpOf, perksFor } from './kannan';
import { activeHooks } from './uniques';
import { SLOTS, type SaveV2 } from './types';

/** Returns additive bonuses, not BASE_STATS (the simulation adds those). */
export function computeLoadout(save: SaveV2, content: Content): Loadout {
  const stats = save.unlocks.training ? trainingStats(save.training) : {};
  for (const slot of SLOTS) {
    if (!save.unlocks.gear) continue;
    const item = save.inventory.find(i => i.uid === save.equipped[slot] && i.slot === slot);
    if (item) for (const [stat, value] of Object.entries(itemStats(item))) {
      const key = stat as keyof PlayerStats;
      stats[key] = (stats[key] ?? 0) + value;
    }
  }
  // Spec tree and the cooked meal: plain registry stats, added like gear.
  for (const src of [specStats(save), mealOf(save)?.stats ?? {}]) for (const [stat, value] of Object.entries(src)) {
    const key = stat as keyof PlayerStats;
    stats[key] = (stats[key] ?? 0) + value;
  }
  const level = kannanLevel(kannanXpOf(save));
  const perks = perksFor(level);
  for (const perk of perks) for (const [stat, value] of Object.entries(perk.stats ?? {})) {
    const key = stat as keyof PlayerStats;
    stats[key] = (stats[key] ?? 0) + value;
  }
  const rerolls = (save.unlocks.secondReroll ? 2 : 1) + perks.reduce((n, perk) => n + (perk.rerolls ?? 0), 0);
  const pools = runPools(save, content);
  const signature = save.unlocks.signature && pools.breadPool.includes(save.signatureBread) ? save.signatureBread : undefined;
  const startBread = signature ?? content.breads.kosong?.id;
  const dips = startBread ? startDips(save, startBread, content) : [];
  const meal = mealOf(save);
  const hooks = save.unlocks.gear ? activeHooks(save) : [];
  return { stats, ...(hooks.length ? { hooks } : {}), kannanLevel: level, dipSimmer: Object.fromEntries(SIMMER_DIPS.map(id => [id, simmerProgress(save.dipXp?.[id]).level])), ...(signature ? { signatureBread: signature } : {}), ...(rerolls > 1 ? { rerolls } : {}), ...pools, ...(dips.length ? { startDips: dips } : {}), ...(meal ? { mealId: meal.id } : {}), ...(content.breads.kosong ? { startBread: signature ?? content.breads.kosong.id } : {}) };
}
