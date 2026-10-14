// ONE source of truth for every PlayerStats key. Training rows, formatters, build-sheet grouping and the coverage test
// (__tests__/statCoverage.test.ts) all read from here. To add a stat: add the key to PlayerStats + BASE_STATS, then ONE entry below.
// Record<keyof PlayerStats, ...> makes a missing entry a compile error.
// ponytail: training is the first ring of the future spec tree; when that lands, `training` becomes the tree's root nodes.
import type { PlayerStats } from './types';

export type StatGroup = 'Offense' | 'Defense' | 'Utility' | 'Crisp' | 'Soak' | 'Heat';
export type StatUnit = 'pct' | 'flat' | 'sec' | 'mult' | 'count';
export type StatSource = 'training' | 'gear' | 'spec' | 'perk' | 'card' | 'dip';
export type StatDef = {
  id: keyof PlayerStats;
  label: string;
  short: string;
  unit: StatUnit;
  icon: string;
  group: StatGroup;
  /** Display ceiling for bars/meters (same scale as the raw value). */
  max: number;
  /** Systems that may grant it. Gear/card/perk/training data referencing the stat must list the system here. */
  grant: readonly StatSource[];
  /** Shown on the build sheet. */
  sheet: boolean;
  /** Generates a training row: id is the saved key (never rename), perStep is added per level, unlock is the UnlockFlag that gates buying. */
  training?: { id: string; label: string; perStep: number; unlock: string };
};

const d = (s: StatDef) => s;
export const STAT_REGISTRY: Record<keyof PlayerStats, StatDef> = {
  dmgPct: d({ id: 'dmgPct', label: 'Damage', short: 'DMG', unit: 'pct', icon: '💪', group: 'Offense', max: 3, grant: ['training', 'gear', 'spec', 'perk', 'card'], sheet: true,
    training: { id: 'wrist', label: 'Wrist', perStep: .06, unlock: 'training' } }),
  throwSpeedPct: d({ id: 'throwSpeedPct', label: 'Throw speed', short: 'SPD', unit: 'pct', icon: '🌀', group: 'Offense', max: 2, grant: ['training', 'gear', 'spec', 'card'], sheet: true,
    training: { id: 'flip', label: 'Flip', perStep: .06, unlock: 'training' } }),
  extraProjectiles: d({ id: 'extraProjectiles', label: 'Extra dough', short: 'PRJ', unit: 'count', icon: '➕', group: 'Offense', max: 5, grant: ['spec', 'card'], sheet: true }),
  sizePct: d({ id: 'sizePct', label: 'Bread size', short: 'SIZE', unit: 'pct', icon: '⭕', group: 'Offense', max: 2, grant: ['gear', 'spec', 'card'], sheet: true }),
  rangePct: d({ id: 'rangePct', label: 'Range', short: 'RNG', unit: 'pct', icon: '🎯', group: 'Offense', max: 2, grant: ['gear', 'spec', 'card'], sheet: true }),
  throwWhileMoving: d({ id: 'throwWhileMoving', label: 'Throw while moving', short: 'MOVE', unit: 'pct', icon: '🏃', group: 'Offense', max: 1, grant: ['spec', 'card'], sheet: true }),
  critChance: d({ id: 'critChance', label: 'Crit chance', short: 'CRIT', unit: 'pct', icon: '✨', group: 'Crisp', max: 1, grant: ['training', 'gear', 'spec', 'card', 'dip'], sheet: true,
    training: { id: 'crisp', label: 'Crisp', perStep: .01, unlock: 'recipeBook' } }),
  critMult: d({ id: 'critMult', label: 'Crit power', short: 'CPWR', unit: 'mult', icon: '💥', group: 'Crisp', max: 4, grant: ['gear', 'spec', 'card', 'dip'], sheet: true }),
  soak: d({ id: 'soak', label: 'Soak (splash)', short: 'SOAK', unit: 'pct', icon: '🍛', group: 'Soak', max: 1, grant: ['training', 'gear', 'spec', 'card', 'dip'], sheet: true,
    training: { id: 'soak', label: 'Soak', perStep: .02, unlock: 'chefsSpecial' } }),
  critSplash: d({ id: 'critSplash', label: 'Crit splash', short: 'CSPL', unit: 'pct', icon: '🔥', group: 'Soak', max: 1, grant: ['spec', 'card'], sheet: true }),
  splashCrit: d({ id: 'splashCrit', label: 'Splash can crit', short: 'SCRT', unit: 'flat', icon: '🍳', group: 'Soak', max: 1, grant: ['spec', 'card'], sheet: true }),
  dotPct: d({ id: 'dotPct', label: 'Dip damage', short: 'DOT', unit: 'pct', icon: '🌶️', group: 'Heat', max: 2, grant: ['gear', 'spec', 'card', 'dip'], sheet: true }),
  convertPct: d({ id: 'convertPct', label: 'Heat conversion', short: 'CONV', unit: 'pct', icon: '🔥', group: 'Heat', max: .5, grant: ['spec'], sheet: false }),
  moreDmg: d({ id: 'moreDmg', label: 'More damage', short: 'MORE', unit: 'pct', icon: '⬆️', group: 'Offense', max: 1, grant: ['spec'], sheet: false }),
  pierceFalloff: d({ id: 'pierceFalloff', label: 'Pierce falloff', short: 'PFAL', unit: 'pct', icon: '📉', group: 'Offense', max: .5, grant: ['spec'], sheet: false }),
  maxHp: d({ id: 'maxHp', label: 'Max HP', short: 'HP', unit: 'flat', icon: '❤️', group: 'Defense', max: 400, grant: ['training', 'gear', 'spec', 'perk', 'card'], sheet: true,
    training: { id: 'stamina', label: 'Stamina', perStep: 10, unlock: 'training' } }),
  regen: d({ id: 'regen', label: 'HP/s', short: 'REG', unit: 'sec', icon: '🩹', group: 'Defense', max: 5, grant: ['gear', 'spec', 'card'], sheet: true }),
  dmgTakenPct: d({ id: 'dmgTakenPct', label: 'Damage taken', short: 'TAKEN', unit: 'pct', icon: '🛡️', group: 'Defense', max: 1, grant: ['gear', 'spec'], sheet: true }),
  dodge: d({ id: 'dodge', label: 'Dodge', short: 'DDG', unit: 'pct', icon: '💨', group: 'Defense', max: 1, grant: ['gear', 'spec'], sheet: true }),
  revives: d({ id: 'revives', label: 'Revives', short: 'REV', unit: 'count', icon: '🔔', group: 'Defense', max: 3, grant: ['spec', 'card'], sheet: true }),
  healOnLevelUpPct: d({ id: 'healOnLevelUpPct', label: 'Heal on level-up', short: 'HEAL', unit: 'pct', icon: '💚', group: 'Defense', max: 1, grant: ['spec', 'card'], sheet: false }),
  moveSpeed: d({ id: 'moveSpeed', label: 'Move speed', short: 'MOVE', unit: 'flat', icon: '👟', group: 'Utility', max: 1200, grant: ['gear', 'spec'], sheet: true }),
  xpPct: d({ id: 'xpPct', label: 'XP gain', short: 'XP', unit: 'pct', icon: '📈', group: 'Utility', max: 2, grant: ['spec', 'card'], sheet: true }),
  goldPct: d({ id: 'goldPct', label: 'Tips', short: 'TIPS', unit: 'pct', icon: '🪙', group: 'Utility', max: 2, grant: ['gear', 'spec'], sheet: true }),
};

export const STAT_IDS = Object.keys(STAT_REGISTRY) as (keyof PlayerStats)[];
export const statLabel = (id: keyof PlayerStats): string => STAT_REGISTRY[id].label;
export const statsByGroup = (g: StatGroup): StatDef[] => STAT_IDS.map(i => STAT_REGISTRY[i]).filter(s => s.group === g);
export const sheetStats = (): StatDef[] => STAT_IDS.map(i => STAT_REGISTRY[i]).filter(s => s.sheet);

const trim = (n: number) => String(Number(n.toFixed(2)));
/** '+6%', '+10', '+0.2/s', 'x1.5'. `signed` forces a leading + on positives (for deltas). */
export function formatStat(id: keyof PlayerStats, value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : '';
  switch (STAT_REGISTRY[id].unit) {
    case 'pct': return `${sign}${trim(value * 100)}%`;
    case 'sec': return `${sign}${trim(value)}/s`;
    case 'mult': return `x${trim(value)}`;
    default: return `${sign}${trim(value)}`;
  }
}

/** Training rows generated from the registry. Order = registry order; ids are save keys. */
export const TRAINING_DEFS = STAT_IDS.flatMap(i => { const t = STAT_REGISTRY[i].training; return t ? [{ ...t, stat: i }] : []; });
