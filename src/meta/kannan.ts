import type { PlayerStats } from '../core/types';
import { LEVEL_THRESHOLDS } from './stall';
import type { SaveV2, SaveV3 } from './types';

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

/** The one level: v3 saves carry kannanXp; an older save's stall XP is the same number (the migration copies it). */
export const kannanXpOf = (save: SaveV2): number => (save as Partial<SaveV3>).kannanXp ?? save.stallXp;
export const specPointsOf = (save: SaveV2): number => (save as Partial<SaveV3>).specPoints ?? Math.max(0, kannanLevel(kannanXpOf(save)) - 1);
/** Level, XP into this level, XP this level spans, bar fraction 0..1. */
export function kannanBar(xp: number) {
  const level = kannanLevel(xp), floor = xpForLevel(level), span = xpForLevel(level + 1) - floor;
  return { level, into: Math.floor(xp - floor), span, fraction: Math.max(0, Math.min(1, (xp - floor) / span)) };
}
/** Milestone perks every 5 Kannan levels, applied through computeLoadout. (No link-slot system yet, so L15 is +3% damage.) */
export const PERKS: readonly { level: number; label: string; stats?: Partial<PlayerStats>; rerolls?: number }[] = [
  { level: 5, label: '+1 reroll per run', rerolls: 1 },
  { level: 10, label: '+5% max HP', stats: { maxHp: 5 } },
  { level: 15, label: '+3% damage', stats: { dmgPct: 0.03 } },
  { level: 20, label: '+5% max HP', stats: { maxHp: 5 } },
  { level: 25, label: '+3% damage', stats: { dmgPct: 0.03 } },
];
export const perksFor = (level: number) => PERKS.filter(p => p.level <= level);
export const nextPerk = (level: number) => PERKS.find(p => p.level > level) ?? null;
