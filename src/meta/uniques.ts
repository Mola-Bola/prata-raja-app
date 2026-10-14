import type { GearBaseId, GearItem, SaveV2 } from './types';

/** Rule hooks a unique can grant. Data only; the sim queries them through activeHooks(). */
export type UniqueHook =
  | { kind: 'critSplash'; /** share of the crit's damage splashed to nearby foes */ pct: number; radius: number }
  | { kind: 'firstHitFreeze'; /** first hit on each foe per stop freezes it */ seconds: number };
export type UniqueDef = { id: string; name: string; baseId: GearBaseId; blurb: string; hooks: readonly UniqueHook[] };

export const UNIQUES: Record<string, UniqueDef> = {
  'ah-seng-golden-tawa-towel': { id: 'ah-seng-golden-tawa-towel', name: "Ah Seng's Golden Tawa Towel", baseId: 'lucky-red-towel', blurb: 'Crits splash.', hooks: [{ kind: 'critSplash', pct: .5, radius: 90 }] },
  'auntie-steel-thali': { id: 'auntie-steel-thali', name: "Auntie's Steel Thali", baseId: 'chefs-gloves', blurb: 'First hit each stop freezes.', hooks: [{ kind: 'firstHitFreeze', seconds: 1.5 }] },
  'uncle-kopi-clogs': { id: 'uncle-kopi-clogs', name: "Uncle's Kopi Clogs", baseId: 'kitchen-clogs', blurb: 'Crits splash wider, softer.', hooks: [{ kind: 'critSplash', pct: .3, radius: 140 }] },
};

/** Hooks active for a set of worn items. */
export function hooksOf(items: readonly GearItem[]): UniqueHook[] {
  return items.flatMap(i => i.uniqueId ? UNIQUES[i.uniqueId]?.hooks ?? [] : []);
}
export const activeHooks = (save: SaveV2): UniqueHook[] =>
  hooksOf(Object.values(save.equipped).flatMap(uid => save.inventory.filter(i => i.uid === uid)));
/** Pure helper the sim can call on a crit: damage to splash onto each neighbour (0 when no hook). */
export function critSplashDamage(hooks: readonly UniqueHook[], critDamage: number): { damage: number; radius: number } {
  const h = hooks.filter((x): x is Extract<UniqueHook, { kind: 'critSplash' }> => x.kind === 'critSplash').sort((a, b) => b.pct - a.pct)[0];
  return h ? { damage: critDamage * h.pct, radius: h.radius } : { damage: 0, radius: 0 };
}
/** Pure helper: freeze seconds to apply on a hit, given whether this foe was already hit this stop. */
export function firstHitFreeze(hooks: readonly UniqueHook[], alreadyHitThisStop: boolean): number {
  return alreadyHitThisStop ? 0 : Math.max(0, ...hooks.flatMap(h => h.kind === 'firstHitFreeze' ? [h.seconds] : []));
}
// TODO(lead): wire into src/core/sim.ts: pass activeHooks(save) via the loadout, call critSplashDamage on crit hits and firstHitFreeze on first contact per stop.
