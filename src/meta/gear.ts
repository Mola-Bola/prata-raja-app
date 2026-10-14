import { makeRng, type Rng } from '../core/rng';
import { BASE_STATS } from '../core/stats';
import type { PlayerStats } from '../core/types';
import { RARITIES, SLOTS, type Affix, type AffixBand, type GearBaseId, type GearItem, type Material, type Rarity, type SaveV2, type Slot } from './types';

export const GEAR_BASES: Record<GearBaseId, Slot> = {
  'faded-kopitiam-towel': 'towel', 'sweat-stained-towel': 'towel', 'lucky-red-towel': 'towel',
  'plain-headband': 'headband', 'stall-bandana': 'headband', 'cooks-hairnet': 'headband',
  'cotton-apron': 'apron', 'oil-splashed-apron': 'apron', 'denim-apron': 'apron',
  'oven-gloves': 'gloves', 'silicone-gloves': 'gloves', 'chefs-gloves': 'gloves',
  'rubber-flip-flops': 'slippers', 'kitchen-clogs': 'slippers', 'old-house-slippers': 'slippers',
};
export const RARITY_INFO: Record<Rarity, { color: string; multiplier: number; affixes: number; weight: number }> = {
  common: { color: '#9CA3AF', multiplier: 1, affixes: 0, weight: 600 },
  uncommon: { color: '#4ADE80', multiplier: 1.3, affixes: 0, weight: 250 },
  rare: { color: '#60A5FA', multiplier: 1.7, affixes: 1, weight: 100 },
  epic: { color: '#C084FC', multiplier: 2.2, affixes: 2, weight: 40 },
  legendary: { color: '#FB923C', multiplier: 3, affixes: 3, weight: 9 },
  raja: { color: '#FACC15', multiplier: 4.5, affixes: 4, weight: 1 },
};
const affix = (id: string, stat: keyof PlayerStats, value: number): Affix => ({ id, stat, value });
// shortcut: only unconditional PlayerStats affixes; add combat triggers when the simulation supports them.
export const AFFIX_POOLS: Record<Slot, readonly Affix[]> = {
  towel: [affix('gold-tips', 'goldPct', .1), affix('crit-power', 'critMult', .1), affix('lucky', 'critChance', .01), affix('keen-eye', 'rangePct', .05)],
  headband: [affix('strong-wrist', 'dmgPct', .05), affix('sharp-eye', 'critChance', .01), affix('hot-tawa', 'dotPct', .05), affix('long-throw', 'rangePct', .05), affix('crispy', 'critMult', .1)],
  apron: [affix('padded', 'dmgTakenPct', -.03), affix('mending', 'regen', .2), affix('sturdy', 'maxHp', 5), affix('soaked', 'soak', .03), affix('nimble', 'dodge', .02)],
  gloves: [affix('fast-flip', 'throwSpeedPct', .03), affix('firm-grip', 'dmgPct', .03), affix('big-dough', 'sizePct', .05), affix('precise', 'critChance', .01), affix('curry-splashed', 'soak', .03)],
  slippers: [affix('dodge', 'dodge', .05), affix('quick-feet', 'moveSpeed', BASE_STATS.moveSpeed * .03), affix('steady', 'dmgTakenPct', -.02), affix('restful', 'regen', .1)],
};
export const MAIN_STATS: Record<Slot, Partial<PlayerStats>> = {
  towel: { critChance: .02 }, headband: { dmgPct: .03 }, apron: { maxHp: 5 },
  gloves: { throwSpeedPct: .03 }, slippers: { moveSpeed: BASE_STATS.moveSpeed * .03 },
};

export const GEAR_VERSION = 2;
/** Affix tier ladder: an affix tier is eligible when its minLvl lies in [ilvl/2, ilvl] (the window). Steps of <=2x guarantee every ilvl has one. */
export const AFFIX_TIER_LVLS = [1, 2, 4, 7, 12, 20, 32, 50] as const;
export const AFFIX_BANDS: readonly AffixBand[] = ['Fine', 'Good', 'Great'];
/** Value range of a pool affix at a tier: the pool value is the Fine-tier midpoint; higher tiers scale up. */
export function affixRange(def: Affix, tierIdx: number): [number, number] {
  const s = 1 + .35 * tierIdx;
  return [def.value * .6 * s, def.value * 1.4 * s];
}
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
/** Pure + deterministic: the same (baseId, ilvl, rarity, seed, version) always gives the same affixes. */
export function deriveAffixes(baseId: GearBaseId, ilvl: number, rarity: Rarity, seed: number, version = GEAR_VERSION): Affix[] {
  const rng = makeRng(hashStr(`${baseId}|${ilvl}|${rarity}|${seed}|${version}`));
  const pool = [...AFFIX_POOLS[GEAR_BASES[baseId]]];
  const tiers = AFFIX_TIER_LVLS.flatMap((lvl, i) => lvl <= ilvl && lvl >= ilvl / 2 ? [i] : []);
  const out: Affix[] = [];
  for (let i = 0; i < RARITY_INFO[rarity].affixes; i++) {
    const def = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const [lo, hi] = affixRange(def, tiers.length ? rng.pick(tiers) : 0);
    const u = rng.next();
    out.push({ id: def.id, stat: def.stat, value: Number((lo + (hi - lo) * u).toFixed(4)), tier: AFFIX_BANDS[Math.min(2, Math.floor(u * 3))] });
  }
  return out;
}

/** Slots the player can wear at drop time. Stall level 1 has none open: the gear rack opens at level 2 with the towel, so that is the cap. */
export function dropSlots(unlocks: SaveV2['unlocks']): readonly Slot[] {
  const open = SLOTS.filter(slot => unlocks[slot]);
  return open.length ? open : SLOTS.slice(0, 1);
}

export type RollOptions = { baseId?: GearBaseId; slot?: Slot; slots?: readonly Slot[]; rarity?: Rarity; minRarity?: Rarity; source?: 'drop' | 'chest' | 'boss'; uid?: string; ilvl?: number };
export function rollItem(rng: Rng, opts: RollOptions = {}): GearItem {
  const max = opts.source === 'chest' || opts.source === 'boss' ? 5 : 2;
  const min = RARITIES.indexOf(opts.minRarity ?? 'common');
  if (min > max || (opts.rarity && RARITIES.indexOf(opts.rarity) > max)) throw new Error('Epic+ requires a chest or boss');
  if (opts.rarity && RARITIES.indexOf(opts.rarity) < min) throw new Error('Rarity is below minimum');
  if (opts.baseId && opts.slot && GEAR_BASES[opts.baseId] !== opts.slot) throw new Error('Base does not match slot');
  const rarity = opts.rarity ?? rng.weighted(RARITIES.slice(min, max + 1), r => RARITY_INFO[r].weight);
  const allowed = opts.slots ?? SLOTS;
  const bases = (Object.keys(GEAR_BASES) as GearBaseId[]).filter(id => (!opts.slot || GEAR_BASES[id] === opts.slot) && allowed.includes(GEAR_BASES[id]));
  if (!bases.length) throw new Error('No gear base fits the allowed slots');
  const baseId = opts.baseId ?? rng.pick(bases);
  const slot = GEAR_BASES[baseId];
  const ilvl = Math.max(1, Math.floor(opts.ilvl ?? 1));
  const seed = rng.int(0, 0xffffffff);
  return {
    uid: opts.uid ?? `${rng.int(0, 0xffffffff).toString(16)}-${rng.int(0, 0xffffffff).toString(16)}`, baseId, slot, rarity, level: 1,
    ilvl, seed, version: GEAR_VERSION, enhance: 0, affixes: deriveAffixes(baseId, ilvl, rarity, seed),
  };
}

/** Three distinct items; research caps merge output at Rare. Keeps the lowest input level. */
export function merge3(items: readonly GearItem[], rng: Rng): GearItem | null {
  const first = items[0];
  if (items.length !== 3 || new Set(items.map(i => i.uid)).size !== 3 || !first ||
      !['common', 'uncommon'].includes(first.rarity) ||
      items.some(i => i.baseId !== first.baseId || i.rarity !== first.rarity || i.slot !== GEAR_BASES[i.baseId])) return null;
  const merged = rollItem(rng, { baseId: first.baseId, rarity: RARITIES[RARITIES.indexOf(first.rarity) + 1], ilvl: Math.min(...items.map(i => i.ilvl ?? 1)) });
  return { ...merged, level: Math.min(...items.map(i => i.level)) };
}

/** Cost to go from the current level to the next: 40, 60, 90, … coins. */
export function upgradeCost(item: Pick<GearItem, 'level'>): number {
  return Math.ceil(40 * 1.5 ** (item.level - 1));
}
export function upgradeItem(save: SaveV2, uid: string): SaveV2 {
  const item = save.inventory.find(i => i.uid === uid);
  if (!save.unlocks.gear || !item || save.pendingChests.includes(uid) || save.gold < upgradeCost(item) || !Number.isFinite(upgradeCost(item))) return save;
  return { ...save, gold: save.gold - upgradeCost(item), inventory: save.inventory.map(i => i.uid === uid ? { ...i, level: i.level + 1 } : i) };
}
/** Puts an owned item in its slot, replacing the old one. Locked gear and items still in a closed chest are refused.
 *  A slot's stall-level gate is not checked: an item above the player's level can always be worn (its level only scales stats). */
export function equipItem(save: SaveV2, uid: string): SaveV2 {
  const item = save.inventory.find(i => i.uid === uid);
  if (!item || !save.unlocks.gear || save.pendingChests.includes(uid) || save.equipped[item.slot] === uid) return save;
  return { ...save, equipped: { ...save.equipped, [item.slot]: uid } };
}
/** Re-derives a v2 item's affixes; null for legacy items (their stored affixes are the truth). */
export function regenAffixes(item: GearItem): Affix[] | null {
  return item.version === GEAR_VERSION && item.seed !== undefined && item.ilvl !== undefined ? deriveAffixes(item.baseId, item.ilvl, item.rarity, item.seed, item.version) : null;
}
export function itemStats(item: GearItem): Partial<PlayerStats> {
  const stats: Partial<PlayerStats> = {};
  const enh = 1 + ENHANCE_PCT * (item.enhance ?? 0);
  const multiplier = RARITY_INFO[item.rarity].multiplier * (1 + .1 * (item.level - 1)) * enh;
  for (const [key, value] of Object.entries(MAIN_STATS[item.slot])) stats[key as keyof PlayerStats] = value * multiplier;
  for (const a of item.affixes) stats[a.stat] = (stats[a.stat] ?? 0) + a.value * enh;
  return stats;
}

export const MAX_ENHANCE = 15;
/** Each forge step adds this share of the base affix / main-stat values. */
export const ENHANCE_PCT = .05;
/** Cost of the step from +n to +n+1 (n = 0..14): coins and hawker ingredients that widen as the curve climbs. */
export function enhanceCost(n: number): { gold: number; materials: Partial<Record<Material, number>> } {
  const materials: Partial<Record<Material, number>> = { flour: 2 + n, ghee: 1 + Math.floor(n / 2) };
  if (n >= 4) materials.masala = 1 + Math.floor((n - 4) / 2);
  if (n >= 8) materials.chilli = 1 + Math.floor((n - 8) / 2);
  if (n >= 11) materials.curryLeaves = 1 + (n - 11);
  return { gold: Math.round(30 * 1.4 ** n), materials };
}
/** Forge bench: one step up. Always succeeds when affordable; the item is never destroyed or downgraded. Unchanged save when it can't. */
export function enhance<S extends SaveV2>(save: S, uid: string): S {
  const item = save.inventory.find(i => i.uid === uid);
  const n = item?.enhance ?? 0;
  if (!item || n >= MAX_ENHANCE || save.pendingChests.includes(uid)) return save;
  const cost = enhanceCost(n);
  if (save.gold < cost.gold || Object.entries(cost.materials).some(([m, c]) => save.materials[m as Material] < c!)) return save;
  const materials = { ...save.materials };
  for (const [m, c] of Object.entries(cost.materials)) materials[m as Material] -= c!;
  return { ...save, gold: save.gold - cost.gold, materials, inventory: save.inventory.map(i => i.uid === uid ? { ...i, enhance: n + 1 } : i) };
}

/** Forge bench: cost to reroll one affix. Scales with the item's ilvl; masala is the spice that re-seasons it. */
export function rerollCost(item: Pick<GearItem, 'ilvl'>): { gold: number; materials: Partial<Record<Material, number>> } {
  const ilvl = item.ilvl ?? 1;
  return { gold: 20 + 10 * ilvl, materials: { masala: 1 + Math.floor(ilvl / 8) } };
}
/** Rerolls affix `index` of a v2 item inside the same ilvl window with a new seed salt (uid + reroll count); the other affixes
 *  stay. The same save + uid + count always gives the same result. Unchanged save when it can't (legacy item, bad index, short on cost). */
export function rerollAffix<S extends SaveV2>(save: S, uid: string, index: number): S {
  const item = save.inventory.find(i => i.uid === uid);
  if (!item || item.ilvl === undefined || !item.affixes[index] || save.pendingChests.includes(uid)) return save;
  const cost = rerollCost(item);
  if (save.gold < cost.gold || Object.entries(cost.materials).some(([m, c]) => save.materials[m as Material] < c!)) return save;
  const n = item.rerolls ?? 0;
  const rng = makeRng(hashStr(`${item.baseId}|${item.ilvl}|${item.seed}|${item.uid}|reroll|${n}|${index}`));
  const kept = new Set(item.affixes.filter((_, i) => i !== index).map(a => a.id));
  const def = rng.pick(AFFIX_POOLS[item.slot].filter(d => !kept.has(d.id)));
  const tiers = AFFIX_TIER_LVLS.flatMap((lvl, i) => lvl <= item.ilvl! && lvl >= item.ilvl! / 2 ? [i] : []);
  const [lo, hi] = affixRange(def, tiers.length ? rng.pick(tiers) : 0);
  const u = rng.next();
  const rolled: Affix = { id: def.id, stat: def.stat, value: Number((lo + (hi - lo) * u).toFixed(4)), tier: AFFIX_BANDS[Math.min(2, Math.floor(u * 3))] };
  const materials = { ...save.materials };
  for (const [m, c] of Object.entries(cost.materials)) materials[m as Material] -= c!;
  return { ...save, gold: save.gold - cost.gold, materials, inventory: save.inventory.map(i => i.uid === uid ? { ...i, rerolls: n + 1, affixes: i.affixes.map((a, k) => k === index ? rolled : a) } : i) };
}
