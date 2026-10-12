import type { Rng } from '../core/rng';
import { rollItem } from './gear';
import { RARITIES, type ChestPity, type GearItem, type Rarity } from './types';

/** Cadence counters do not reset on a lucky natural drop. Every twentieth also satisfies fifth-chest pity. */
export function rollChest(rng: Rng, pity: ChestPity, minRarity: Rarity = 'common'): { item: GearItem; pity: ChestPity } {
  const rare = pity.rare + 1;
  const epic = pity.epic + 1;
  const minimum = RARITIES[Math.max(RARITIES.indexOf(minRarity), epic >= 20 ? 3 : rare >= 5 ? 2 : 0)];
  return {
    item: rollItem(rng, { source: 'chest', minRarity: minimum }),
    pity: { rare: rare % 5, epic: epic % 20, opened: pity.opened + 1 },
  };
}
