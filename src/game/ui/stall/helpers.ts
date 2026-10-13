// Pure helpers for the stall screens (hub scene, sheets, payout panel): no React, no DOM, so Node tests cover them.
import { CONTENT } from '@/content';
import { runPools } from '@/meta/recipes';
import type { Rng } from '@/core/rng';
import type { PlayerStats } from '@/core/types';
import { merge3 } from '@/meta/gear';
import { preview } from '@/meta/idle';
import { LEVEL_THRESHOLDS, nextUnlock, stallLevel, UNLOCK_TABLE } from '@/meta/stall';
import { claim } from '@/meta/streak';
import { TRAINING_COSTS } from '@/meta/training';
import { RARITIES, SLOTS, TRAINING_IDS, type GearItem, type Rarity, type SaveV2, type UnlockFlag } from '@/meta/types';

export type Panel = 'special' | 'calendar' | 'training' | 'recipes' | 'gear' | 'idle' | 'chests';

/** A tappable prop of scene/hub.webp (1080 x 1919). `box` is the prop's rectangle as a percentage of the picture's width and
 *  height, so the tap area stays on the prop at any screen size (the picture is always drawn at its own shape). The label
 *  pill sits on the box's bottom edge (its top edge for `pill: 'top'`), against the screen edge it is nearest to (`side`).
 *  Measured off the art with a grid. */
export type Hotspot = {
  label: string;
  side: 'left' | 'center' | 'right';
  box: { x: number; y: number; w: number; h: number };
  pill?: 'top';
  flag?: UnlockFlag;
};
export const HOTSPOTS: Record<Panel, Hotspot> = {
  special: { label: 'Chef’s Special', side: 'center', box: { x: 24, y: 8.5, w: 48, h: 13 }, flag: 'chefsSpecial' },
  calendar: { label: 'Calendar', side: 'left', box: { x: 2.5, y: 17, w: 13, h: 12 } },
  training: { label: 'Training', side: 'right', box: { x: 86.5, y: 14.5, w: 13.5, h: 13 }, flag: 'training' },
  recipes: { label: 'Recipe book', side: 'right', box: { x: 88.5, y: 29.5, w: 11.5, h: 8.5 }, flag: 'recipeBook' },
  gear: { label: 'Gear', side: 'left', box: { x: 0.8, y: 31, w: 18, h: 16 }, flag: 'gear' },
  idle: { label: 'Tip jar', side: 'left', box: { x: 5, y: 47.5, w: 12, h: 11 } },
  // The chest stands low in the picture: its label goes on the lid, so the Start button never covers it on a 9:16 screen.
  chests: { label: 'Chests', side: 'right', box: { x: 81, y: 64.5, w: 19, h: 20 }, pill: 'top' },
};
export const PANELS = Object.keys(HOTSPOTS) as Panel[];

export const UNLOCK_NAMES: Record<UnlockFlag, string> = {
  gear: 'Gear', training: 'Training', secondReroll: 'Extra reroll', recipeBook: 'Recipe book',
  chefsSpecial: 'Chef’s Special', towel: 'Towel', headband: 'Headband', apron: 'Apron', gloves: 'Gloves', slippers: 'Slippers',
};
export const titleCase = (name: string) => name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
export const unlockLevel = (flag: UnlockFlag) => UNLOCK_TABLE.find(row => row.flags.includes(flag))!.level;

/** Where the stall level bar stands: level, how full the bar is (0..1) and the "Next: <unlock> in N XP" line. */
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

/** Items the player can see and use: one still in a closed chest is owned, but stays out of the rack until it is opened. */
export const rackItems = (save: SaveV2): GearItem[] => save.inventory.filter(i => !save.pendingChests.includes(i.uid));

/** The item plus two identical others (same base and rarity) that a merge would eat; none when there are fewer, the item is
 *  past Uncommon, or it is not on the rack. */
export function mergeCandidates(save: SaveV2, item: GearItem): GearItem[] {
  const rack = rackItems(save);
  if (!rack.some(i => i.uid === item.uid) || !['common', 'uncommon'].includes(item.rarity)) return [];
  const others = rack.filter(i => i.uid !== item.uid && i.baseId === item.baseId && i.rarity === item.rarity);
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

/** Names of what a payout unlocked, in table order ("Gear", "Towel", ...). */
export function newUnlocks(before: SaveV2, after: SaveV2): string[] {
  return UNLOCK_TABLE.flatMap(row => row.flags.filter(flag => !before.unlocks[flag] && after.unlocks[flag]).map(flag => UNLOCK_NAMES[flag]));
}

export function giftLabel(gift: { gold?: number; materialCount?: number; chest?: string }): string {
  if (gift.gold) return `${gift.gold} coins`;
  if (gift.materialCount) return `${gift.materialCount} ${gift.materialCount === 1 ? 'ingredient' : 'ingredients'}`;
  return 'Rare+ chest';
}

/** A closed chest looks like the best thing in it: the art shows the tier, never the item. */
export function chestArt(rarity: Rarity): string {
  const tier = RARITIES.indexOf(rarity); // common, uncommon | rare | epic and above
  return tier >= 3 ? 'chests/chest-epic' : tier === 2 ? 'chests/chest-rare' : 'chests/chest-common';
}

/** How many chests until the next guaranteed Rare+ and Epic+ (the pity counters count up from the last guarantee). */
export function pityLines(save: SaveV2): string[] {
  const rare = 5 - save.chestPity.rare;
  const epic = 20 - save.chestPity.epic;
  const chests = (n: number) => (n === 1 ? 'the next chest' : `${n} chests`);
  return [`Rare guaranteed in ${chests(rare)}`, `Epic guaranteed in ${chests(epic)}`];
}

/** What is waiting at each prop, for the badge on its label: a count or amount (string) or just "something" (true). */
export function readyBadges(save: SaveV2, now: Date): Partial<Record<Panel, string | true>> {
  const badges: Partial<Record<Panel, string | true>> = {};
  const jar = preview(save, now).gold;
  if (jar > 0) badges.idle = `+${jar}`;
  if (claim(save, now, -now.getTimezoneOffset()).rewards.day > 0) badges.calendar = true;
  if (save.pendingChests.length) badges.chests = String(save.pendingChests.length);
  if (save.unlocks.training && TRAINING_IDS.some(id => save.training[id] < TRAINING_COSTS.length && save.gold >= TRAINING_COSTS[save.training[id]])) badges.training = true;
  if (save.unlocks.gear) {
    const rack = rackItems(save);
    if (SLOTS.some(slot => save.unlocks[slot] && !save.equipped[slot] && rack.some(i => i.slot === slot))) badges.gear = true;
  }
  return badges;
}

/** A recipe is known once both foods can enter this player's run pool; passives are always available. */
export function evolutionRecipes(save: SaveV2) {
  const { breadPool, dipPool } = runPools(save, CONTENT);
  return Object.values(CONTENT.breads).filter(b => b.evolvedFrom).map(b => {
    const from = b.evolvedFrom!;
    const partner = from.partner.kind === 'dip'
      ? CONTENT.dips[from.partner.id as keyof typeof CONTENT.dips]
      : CONTENT.passives[from.partner.id as keyof typeof CONTENT.passives];
    return {
      id: b.id, name: b.name, sprite: b.sprite,
      known: breadPool.includes(from.bread) && (from.partner.kind === 'passive' || dipPool.some(id => id === from.partner.id)),
      needs: `${CONTENT.breads[from.bread].name} Lv 5 + ${partner.name} Lv ${from.partner.kind === 'dip' ? 5 : CONTENT.passives[from.partner.id as keyof typeof CONTENT.passives].maxLevel}`,
    };
  });
}
