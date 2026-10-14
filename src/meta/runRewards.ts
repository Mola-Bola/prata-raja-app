import { CONTENT } from '../content';
import { grantDipUse, type DipReceipt } from './dipProgression';
import type { Rng } from '../core/rng';
import type { RunResult } from '../core/types';
import { rollChest } from './chests';
import { runXp, unlocksForXp } from './stall';
import { kannanLevel, kannanXpOf, runKannanXp, specPointsOf } from './kannan';
import { MATERIALS, type GearItem, type Material, type SaveV2, type SaveV3 } from './types';

/** A run pays only once it got this far: ending a run the moment it starts must not farm coins, XP and chests. */
export const MIN_PAID_WAVE = 2;

export type RunRewards = {
  /** False for a run that ended before MIN_PAID_WAVE: nothing below was paid. */
  paid: boolean;
  gold: number;
  stallXp: number;
  /** Persistent Kannan XP earned; banked only on a save that has kannanXp (v3). */
  kannanXp: number;
  chest: GearItem | null;
  materials: Partial<Record<Material, number>>;
  dipReceipts: DipReceipt[];
};

export function applyRunResult<S extends SaveV2 | SaveV3>(save: S, result: RunResult, rng: Rng, now: Date): { save: S; rewards: RunRewards } {
  // Every run goes in the records; only one that got past wave 1 pays.
  const records = {
    bossAttempts: { ...save.bossAttempts,
      ...((result.bossAttempted ?? result.wave >= 10) ? {
        [result.chapterId ?? 'kopitiam-street']: (save.bossAttempts[result.chapterId ?? 'kopitiam-street'] ?? 0) + 1,
      } : {}),
    },
    bestWave: Math.max(save.bestWave, result.wave), runs: save.runs + 1,
    wins: save.wins + Number(result.won), totalKills: save.totalKills + result.kills,
    lastPlayed: now.toISOString(),
    idle: save.idle.lastCollectedAt ? { ...save.idle } : { lastCollectedAt: now.toISOString() },
  };
  if (result.wave < MIN_PAID_WAVE) {
    return { save: { ...save, ...records }, rewards: { paid: false, gold: 0, stallXp: 0, kannanXp: 0, chest: null, materials: {}, dipReceipts: [] } };
  }
  // wave is the reached wave; on a loss that wave was not cleared.
  const waves = Math.max(0, result.wave - (result.won ? 0 : 1));
  // What Kannan picked up during the run (the Tips bonus is already in it) comes on top of the pay for the waves.
  const tips = Number.isFinite(result.gold) ? Math.max(0, Math.floor(result.gold)) : 0;
  const gold = 20 + 12 * waves + 60 * result.bossKills + tips;
  const stallXp = runXp(waves, result.bossKills);
  const kannanXp = runKannanXp(waves, result.bossKills, result.kills);
  const unlocks = { ...save.unlocks, ...unlocksForXp(kannanXpOf(save) + ('kannanXp' in save ? kannanXp : stallXp)) };
  const chest = rollChest(rng, save.chestPity, 'common', unlocks);
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
  const dipProgress = grantDipUse(save as SaveV2, result, CONTENT);
  const next = {
    ...save, ...records, ...('kannanXp' in save ? { kannanXp: (save.kannanXp as number) + kannanXp, specPoints: specPointsOf(save) + kannanLevel((save.kannanXp as number) + kannanXp) - kannanLevel(save.kannanXp as number) } : {}), dipXp: dipProgress.dipXp, gold: save.gold + gold, stallXp: save.stallXp + stallXp,
    inventory: [...save.inventory, item], materials: inventoryMaterials,
    chestPity: chest.pity, unlocks,
    pendingChests: [...save.pendingChests, item.uid],
  } as S;
  return { save: next, rewards: { paid: true, gold, stallXp, kannanXp, chest: item, materials, dipReceipts: dipProgress.receipts } };
}
