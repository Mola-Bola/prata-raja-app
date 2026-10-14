import type { PlayerStats } from '../core/types';
import { TRAINING_DEFS } from '../core/statRegistry';
import { TRAINING_IDS, type SaveV2, type TrainingId } from './types';

export const TRAINING_COSTS = [60, 120, 200, 300, 400] as const;
export const TRAINING_STATS: Record<TrainingId, Partial<PlayerStats>> = Object.fromEntries(TRAINING_DEFS.map(t => [t.id, { [t.stat]: t.perStep }]));
/** Training id -> UnlockFlag that gates buying it (all also need the base 'training' unlock). */
export const TRAINING_UNLOCK: Record<TrainingId, string> = Object.fromEntries(TRAINING_DEFS.map(t => [t.id, t.unlock]));
export const trainingOpen = (save: SaveV2, id: TrainingId): boolean => !!save.unlocks.training && !!(save.unlocks as Record<string, boolean | undefined>)[TRAINING_UNLOCK[id]];
export function trainingStats(training: SaveV2['training']): Partial<PlayerStats> {
  const stats: Partial<PlayerStats> = {};
  for (const id of TRAINING_IDS) if (training[id] > 0) for (const [stat, value] of Object.entries(TRAINING_STATS[id])) {
    const key = stat as keyof PlayerStats;
    stats[key] = (stats[key] ?? 0) + value * training[id];
  }
  return stats;
}
export function buyTraining(save: SaveV2, id: TrainingId): SaveV2 {
  const cost = TRAINING_COSTS[save.training[id] ?? 0];
  if (!trainingOpen(save, id) || cost === undefined || save.gold < cost) return save;
  return { ...save, gold: save.gold - cost, training: { ...save.training, [id]: (save.training[id] ?? 0) + 1 } };
}
export function respec(save: SaveV2): SaveV2 {
  const refund = TRAINING_IDS.reduce((sum, id) => sum + TRAINING_COSTS.slice(0, save.training[id] ?? 0).reduce<number>((a, b) => a + b, 0), 0);
  return { ...save, gold: save.gold + refund, training: Object.fromEntries(TRAINING_IDS.map(id => [id, 0])) };
}
