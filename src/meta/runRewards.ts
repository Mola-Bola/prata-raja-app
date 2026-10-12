import type { Rng } from '../core/rng';
import type { RunResult } from '../core/types';
import { rollChest } from './chests';
import { runXp, unlocksForXp } from './stall';
import { MATERIALS, type Material, type SaveV2 } from './types';

export function applyRunResult(save: SaveV2, result: RunResult, rng: Rng, now: Date) {
  // wave is the reached wave; on a loss that wave was not cleared.
  const waves = Math.max(0, result.wave - (result.won ? 0 : 1));
  const gold = 20 + 12 * waves + 60 * result.bossKills;
  const stallXp = runXp(waves, result.bossKills);
  const chest = rollChest(rng, save.chestPity);
  const item = { ...chest.item, uid: `run-${save.runs + 1}-chest-${chest.pity.opened}-${chest.item.uid}` };
  const materials: Partial<Record<Material, number>> = {};
  for (let i = 0; i < Math.floor(waves / 5); i++) {
    const pool = [...MATERIALS];
    for (let j = 0; j < 2; j++) {
      const type = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      materials[type] = (materials[type] ?? 0) + 1;
    }
  }
  const inventoryMaterials = { ...save.materials };
  for (const type of MATERIALS) inventoryMaterials[type] += materials[type] ?? 0;
  const next: SaveV2 = {
    ...save, gold: save.gold + gold, stallXp: save.stallXp + stallXp,
    bestWave: Math.max(save.bestWave, result.wave), runs: save.runs + 1,
    wins: save.wins + Number(result.won), totalKills: save.totalKills + result.kills,
    lastPlayed: now.toISOString(), inventory: [...save.inventory, item], materials: inventoryMaterials,
    chestPity: chest.pity, unlocks: { ...save.unlocks, ...unlocksForXp(save.stallXp + stallXp) },
    idle: save.idle.lastCollectedAt ? { ...save.idle } : { lastCollectedAt: now.toISOString() },
  };
  return { save: next, rewards: { gold, stallXp, chest: item, materials } };
}
