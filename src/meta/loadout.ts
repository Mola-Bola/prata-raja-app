import type { Content, Loadout, PlayerStats } from '../core/types';
import { itemStats } from './gear';
import { trainingStats } from './training';
import { SLOTS, type SaveV2 } from './types';

/** Returns additive bonuses, not BASE_STATS (the simulation adds those). */
export function computeLoadout(save: SaveV2, content: Content): Loadout {
  const stats = save.unlocks.training ? trainingStats(save.training) : {};
  for (const slot of SLOTS) {
    if (!save.unlocks.gear || !save.unlocks[slot]) continue;
    const item = save.inventory.find(i => i.uid === save.equipped[slot] && i.slot === slot);
    if (item) for (const [stat, value] of Object.entries(itemStats(item))) {
      const key = stat as keyof PlayerStats;
      stats[key] = (stats[key] ?? 0) + value;
    }
  }
  return { stats, ...(save.unlocks.secondReroll ? { rerolls: 2 } : {}), ...(content.breads.kosong ? { startBread: content.breads.kosong.id } : {}) };
}
