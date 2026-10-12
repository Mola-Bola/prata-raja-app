import type { PlayerStats } from '@/core/types';
import type { Rng } from '@/core/rng';
import { merge3 } from '@/meta/gear';
import { LEVEL_THRESHOLDS, nextUnlock, stallLevel, UNLOCK_TABLE } from '@/meta/stall';
import { SLOTS, type GearItem, type SaveV2, type UnlockFlag } from '@/meta/types';

export const HOTSPOTS = {
  calendar: { label: 'Calendar', x: 10, y: 22 },
  gear: { label: 'Gear', x: 6, y: 40, flag: 'gear' },
  idle: { label: 'Tip jar', x: 9, y: 53 },
  special: { label: "Chef’s Special", x: 50, y: 13, flag: 'chefsSpecial' },
  training: { label: 'Training', x: 92, y: 21, flag: 'training' },
  recipes: { label: 'Recipe book', x: 93, y: 33, flag: 'recipeBook' },
  chests: { label: 'Chests', x: 89, y: 72 },
} as const;
export type Panel = keyof typeof HOTSPOTS;
export const UNLOCK_NAMES: Record<UnlockFlag, string> = {
  gear: 'Gear', training: 'Training', secondReroll: 'Extra reroll', recipeBook: 'Recipe book',
  chefsSpecial: 'Chef’s Special', towel: 'Towel', headband: 'Headband', apron: 'Apron', gloves: 'Gloves', slippers: 'Slippers',
};
export const titleCase = (name: string) => name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
export const unlockLevel = (flag: UnlockFlag) => UNLOCK_TABLE.find(row => row.flags.includes(flag))!.level;
export function progress(xp: number) {
  const level = stallLevel(xp);
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceiling = LEVEL_THRESHOLDS[level];
  const next = nextUnlock(xp);
  return {
    level, fraction: ceiling === undefined ? 1 : Math.max(0, Math.min(1, (xp - floor) / (ceiling - floor))),
    label: next ? `Next: ${UNLOCK_NAMES[next.flags[0]]} in ${next.xpRemaining} XP` : 'Stall growing strong',
  };
}
const STAT_NAMES: Partial<Record<keyof PlayerStats, string>> = {
  dmgPct: 'Damage', maxHp: 'HP', throwSpeedPct: 'Throw speed', moveSpeed: 'Move speed',
  critChance: 'Crit chance', critMult: 'Crit power', goldPct: 'Tips', rangePct: 'Range',
  dotPct: 'Dip damage', dmgTakenPct: 'Damage taken', regen: 'HP/s', dodge: 'Dodge', sizePct: 'Bread size',
};
export function statLines(stats: Partial<PlayerStats>): string[] {
  return Object.entries(stats).map(([key, value]) => {
    const percent = !['maxHp', 'moveSpeed', 'regen'].includes(key);
    const amount = Number((value * (percent ? 100 : 1)).toFixed(1));
    return `${STAT_NAMES[key as keyof PlayerStats] ?? titleCase(key)} ${amount >= 0 ? '+' : ''}${amount}${percent ? '%' : ''}`;
  });
}
export function mergeCandidates(save: SaveV2, item: GearItem): GearItem[] {
  if (!save.inventory.some(i => i.uid === item.uid) || !['common', 'uncommon'].includes(item.rarity)) return [];
  const others = save.inventory.filter(i => i.uid !== item.uid && i.baseId === item.baseId && i.rarity === item.rarity);
  return others.length >= 2 ? [item, ...others.slice(0, 2)] : [];
}
export function mergeGear(save: SaveV2, item: GearItem, rng: Rng): SaveV2 {
  if (!save.unlocks.gear) return save;
  const candidates = mergeCandidates(save, item);
  const merged = merge3(candidates, rng);
  if (!merged) return save;
  const ids = new Set(candidates.map(i => i.uid));
  const equipped = { ...save.equipped };
  for (const slot of SLOTS) if (equipped[slot] && ids.has(equipped[slot]!)) equipped[slot] = merged.uid;
  return { ...save, inventory: [...save.inventory.filter(i => !ids.has(i.uid)), merged], equipped };
}
export function newUnlocks(before: SaveV2, after: SaveV2): string[] {
  return UNLOCK_TABLE.flatMap(row => row.flags.filter(flag => !before.unlocks[flag] && after.unlocks[flag]).map(flag => UNLOCK_NAMES[flag]));
}
export function giftLabel(gift: { gold?: number; reroll?: number; training?: number; materialCount?: number; chest?: string }): string {
  if (gift.gold) return `${gift.gold} coins`;
  if (gift.reroll) return 'Reroll token';
  if (gift.training) return 'Training token';
  if (gift.materialCount) return `${gift.materialCount} ${gift.materialCount === 1 ? 'ingredient' : 'ingredients'}`;
  return 'Rare+ chest';
}
