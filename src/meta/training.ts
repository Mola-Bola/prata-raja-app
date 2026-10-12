import type { PlayerStats } from '../core/types';
import { TRAINING_IDS, type SaveV2, type TrainingId } from './types';

export const TRAINING_COSTS = [60, 120, 200, 300, 400] as const;
export const TRAINING_STATS: Record<TrainingId, Partial<PlayerStats>> = {
  wrist: { dmgPct: .06 }, stamina: { maxHp: 10 }, flip: { throwSpeedPct: .06 },
};
export function trainingStats(training: SaveV2['training']): Partial<PlayerStats> {
  const stats: Partial<PlayerStats> = {};
  for (const id of TRAINING_IDS) for (const [stat, value] of Object.entries(TRAINING_STATS[id])) {
    const key = stat as keyof PlayerStats;
    stats[key] = (stats[key] ?? 0) + value * training[id];
  }
  return stats;
}
export function buyTraining(save: SaveV2, id: TrainingId): SaveV2 {
  const cost = TRAINING_COSTS[save.training[id]];
  if (!save.unlocks.training || cost === undefined || save.gold < cost) return save;
  return { ...save, gold: save.gold - cost, training: { ...save.training, [id]: save.training[id] + 1 } };
}
export function respec(save: SaveV2): SaveV2 {
  const refund = TRAINING_IDS.reduce((sum, id) => sum + TRAINING_COSTS.slice(0, save.training[id]).reduce<number>((a, b) => a + b, 0), 0);
  return { ...save, gold: save.gold + refund, training: { wrist: 0, stamina: 0, flip: 0 } };
}
