import { LEVEL_THRESHOLDS } from './stall';

/** Same curve as the old stall level up to 10 (so a migrated level never drops), then +1000 XP a level. */
export function xpForLevel(level: number): number {
  const top = LEVEL_THRESHOLDS.length;
  return level <= 1 ? 0 : level <= top ? LEVEL_THRESHOLDS[level - 1] : LEVEL_THRESHOLDS[top - 1] + 1000 * (level - top);
}
export function kannanLevel(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}
/** Kannan XP for one paid run: waves and boss as the stall pays, plus a little per kill. */
export function runKannanXp(wavesCleared: number, bossKills: number, kills: number): number {
  return 40 + 10 * wavesCleared + 50 * bossKills + Math.floor(Math.max(0, kills) / 4);
}
