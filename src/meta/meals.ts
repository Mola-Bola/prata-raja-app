// Pre-run meal (round 8, milestone 7): Kopi uncle cooks one meal from pantry materials; it buffs the NEXT run only
// (Monster Hunter canteen, docs/research/hub-design.md). Buffs are plain registry stats, applied through computeLoadout.
import { formatStat } from '../core/statRegistry';
import type { PlayerStats } from '../core/types';
import type { Material, SaveV2, SaveV3 } from './types';

export type MealDef = { id: string; name: string; line: string; cost: Partial<Record<Material, number>>; stats: Partial<PlayerStats> };
export const MEALS: readonly MealDef[] = [
  { id: 'kopi-o-kosong', name: 'Kopi-O kosong', line: 'Strong, no sugar, no stopping.', cost: { sugar: 1, milk: 1 }, stats: { moveSpeed: 70 } },
  { id: 'teh-halia', name: 'Teh halia', line: 'Ginger tea. Warms you back up.', cost: { milk: 2, masala: 1 }, stats: { regen: 0.5 } },
  { id: 'mee-goreng', name: 'Mee goreng', line: 'Wok hei and a full belly.', cost: { egg: 2, onion: 2, chilli: 1 }, stats: { maxHp: 30 } },
  { id: 'roti-telur', name: 'Roti telur', line: 'Egg in the dough, fire in the arm.', cost: { egg: 1, ghee: 2, onion: 1 }, stats: { dmgPct: 0.08 } },
  { id: 'cendol', name: 'Cendol', line: 'Cold, sweet, and you learn faster.', cost: { sugar: 2, milk: 1, curryLeaves: 1 }, stats: { xpPct: 0.1 } },
];
export const mealDef = (id: string | null | undefined): MealDef | undefined => MEALS.find(m => m.id === id);
export const mealOf = (save: SaveV2): MealDef | undefined => mealDef((save as Partial<SaveV3>).meal?.id);
export const mealEffect = (m: MealDef): string =>
  Object.entries(m.stats).map(([k, v]) => `${formatStat(k as keyof PlayerStats, v, true)} ${({ moveSpeed: 'move speed', regen: 'regen', maxHp: 'max HP', dmgPct: 'damage', xpPct: 'XP' } as Record<string, string>)[k] ?? k}`).join(', ');
/** GO pill / HUD chip text, e.g. "Mee goreng +30 max HP"; null when nothing is cooked. */
export const mealLabel = (save: SaveV2): string | null => { const m = mealOf(save); return m ? `${m.name} ${mealEffect(m)}` : null; };

export function canCookMeal(save: SaveV2, id: string): boolean {
  const m = mealDef(id);
  return !!m && !mealOf(save) && Object.entries(m.cost).every(([k, n]) => save.materials[k as Material] >= n!);
}
/** One meal waits at a time (eat it in a run first). Pays the materials. */
export function cookMeal<S extends SaveV2>(save: S, id: string): S {
  if (!canCookMeal(save, id)) return save;
  const materials = { ...save.materials };
  for (const [k, n] of Object.entries(mealDef(id)!.cost)) materials[k as Material] -= n!;
  return { ...save, materials, meal: { id } };
}
