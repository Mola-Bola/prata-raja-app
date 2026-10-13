import type { UnlockFlag } from './types';

export const LEVEL_THRESHOLDS = [0, 150, 350, 600, 900, 1300, 1800, 2400, 3100, 3900] as const;
export const UNLOCK_TABLE: readonly { level: number; flags: readonly UnlockFlag[] }[] = [
  { level: 2, flags: ['gear', 'towel'] }, { level: 3, flags: ['training', 'headband'] },
  { level: 4, flags: ['secondReroll'] }, { level: 5, flags: ['apron'] },
  { level: 6, flags: ['gloves', 'recipeBook'] }, { level: 7, flags: ['slippers'] },
  { level: 8, flags: ['chefsSpecial'] }, { level: 9, flags: ['signature'] },
];
export function stallLevel(xp: number): number {
  return 1 + LEVEL_THRESHOLDS.slice(1).filter(t => xp >= t).length;
}
export function nextUnlock(xp: number): { level: number; xpRequired: number; xpRemaining: number; flags: readonly UnlockFlag[] } | null {
  const next = UNLOCK_TABLE.find(u => u.level > stallLevel(xp));
  return next ? { ...next, xpRequired: LEVEL_THRESHOLDS[next.level - 1], xpRemaining: LEVEL_THRESHOLDS[next.level - 1] - Math.max(0, xp) } : null;
}
export function unlocksForXp(xp: number): Partial<Record<UnlockFlag, boolean>> {
  const flags: Partial<Record<UnlockFlag, boolean>> = {};
  for (const u of UNLOCK_TABLE) if (u.level <= stallLevel(xp)) for (const flag of u.flags) flags[flag] = true;
  return flags;
}
export function runXp(wavesCleared: number, bossKills: number): number {
  return 40 + 10 * wavesCleared + 50 * bossKills;
}
