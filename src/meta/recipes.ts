import type { BreadId, Content, DipId } from '../core/types';
import { stallLevel } from './stall';
import type { Material, SaveV2 } from './types';

type Recipe = { id: string; unlocks: { kind: 'bread'; id: BreadId } | { kind: 'dip'; id: DipId }; costs: Partial<Record<Material, number>> };
export const RECIPES: readonly Recipe[] = [
  { id: 'rc-roti-bomb', unlocks: { kind: 'bread', id: 'roti-bomb' }, costs: { flour: 4, egg: 2, onion: 2 } },
  { id: 'rc-egg-telur', unlocks: { kind: 'bread', id: 'egg-telur' }, costs: { flour: 3, egg: 3, milk: 1 } },
  { id: 'rc-naan', unlocks: { kind: 'bread', id: 'naan' }, costs: { flour: 5, ghee: 2, milk: 1 } },
  { id: 'rc-garlic-naan', unlocks: { kind: 'bread', id: 'garlic-naan' }, costs: { flour: 4, ghee: 2, onion: 1 } },
  { id: 'rc-murtabak', unlocks: { kind: 'bread', id: 'murtabak' }, costs: { flour: 4, egg: 2, onion: 2, spice: 1 } },
  { id: 'rc-vadai', unlocks: { kind: 'bread', id: 'vadai' }, costs: { flour: 2, onion: 2, spice: 2 } },
  { id: 'rc-sambal', unlocks: { kind: 'dip', id: 'sambal' }, costs: { onion: 2, spice: 3, sugar: 1 } },
  { id: 'rc-ghee', unlocks: { kind: 'dip', id: 'ghee' }, costs: { milk: 4, sugar: 1 } },
  { id: 'rc-mutton-curry', unlocks: { kind: 'dip', id: 'mutton-curry' }, costs: { spice: 3, onion: 2, ghee: 1 } },
  { id: 'rc-condensed-milk', unlocks: { kind: 'dip', id: 'condensed-milk' }, costs: { milk: 3, sugar: 2 } },
];
export function canCook(save: SaveV2, id: string): boolean {
  const recipe = RECIPES.find(r => r.id === id);
  if (!save.unlocks.recipeBook || !recipe) return false;
  const owned = recipe.unlocks.kind === 'bread' ? save.unlockedBreads : save.unlockedDips;
  return !owned.some(id => id === recipe.unlocks.id) &&
    Object.entries(recipe.costs).every(([material, cost]) => save.materials[material as Material] >= cost);
}
export function cook(save: SaveV2, id: string): SaveV2 {
  if (!canCook(save, id)) return save;
  const recipe = RECIPES.find(r => r.id === id)!;
  const materials = { ...save.materials };
  for (const [material, cost] of Object.entries(recipe.costs)) materials[material as Material] -= cost;
  return { ...save, materials,
    ...(recipe.unlocks.kind === 'bread' ? { unlockedBreads: [...save.unlockedBreads, recipe.unlocks.id] }
      : { unlockedDips: [...save.unlockedDips, recipe.unlocks.id] }),
  };
}
/** Recipes never remove items already marked starter by the content. */
export function runPools(save: SaveV2, content: Content): { breadPool: BreadId[]; dipPool: DipId[] } {
  const available = (kind: 'bread' | 'dip', id: BreadId | DipId, unlock: string) => {
    const owned = kind === 'bread' ? save.unlockedBreads : save.unlockedDips;
    return owned.some(value => value === id) || (unlock === 'starter' || (unlock === 'starter-s2' && stallLevel(save.stallXp) >= 2));
  };
  return {
    breadPool: Object.values(content.breads).filter(b => !b.evolvedFrom && available('bread', b.id, b.unlock)).map(b => b.id).sort(),
    dipPool: Object.values(content.dips).filter(d => available('dip', d.id, d.unlock)).map(d => d.id).sort(),
  };
}
