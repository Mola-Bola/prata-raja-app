// Spec tree (round 8, milestone 6): spend banked specPoints on small nodes, notables and keystones.
// Layout: an inner ring (Body, Hands) and three branches (Crisp, Soak, Heat) radiating from it. A node needs ALL of `needs`.
// Rules: ONE keystone in total (archetype lock: pick Crisp, Soak or Heat as your build); a notable needs two small nodes
// of its branch, a keystone needs its notable plus another small. Respec is free. Every stat is a registry stat.
// Training stays as it is (gold, 5 steps each); the ring is extra, points-based, and uses the same stats (wrist/flip/stamina overlap on purpose).
import type { PlayerStats } from '../core/types';
import { specPointsOf } from './kannan';
import type { SaveV2, SaveV3 } from './types';

export type SpecBranch = 'body' | 'hands' | 'crisp' | 'soak' | 'heat';
export type SpecNode = { id: string; branch: SpecBranch; kind: 'small' | 'notable' | 'keystone'; name: string; line: string; cost: number; needs: string[]; stats: Partial<PlayerStats>;
  /** Map position, percent of the board (centre 50/50). */ x: number; y: number };
const COST = { small: 1, notable: 2, keystone: 3 } as const;
const n = (id: string, branch: SpecBranch, kind: SpecNode['kind'], name: string, line: string, needs: string[], stats: Partial<PlayerStats>, x: number, y: number): SpecNode =>
  ({ id, branch, kind, name, line, cost: COST[kind], needs, stats, x, y });

export const SPEC_NODES: readonly SpecNode[] = [
  // inner ring
  n('body-1', 'body', 'small', 'Hearty', '+10 max HP', [], { maxHp: 10 }, 40, 56),
  n('body-2', 'body', 'small', 'Second wind', '+0.5 HP/s', ['body-1'], { regen: 0.5 }, 36, 66),
  n('body-3', 'body', 'small', 'Thick apron', '-5% damage taken', ['body-2'], { dmgTakenPct: -0.05 }, 42, 74),
  n('hands-1', 'hands', 'small', 'Strong wrist', '+5% damage', [], { dmgPct: 0.05 }, 60, 56),
  n('hands-2', 'hands', 'small', 'Quick flip', '+5% throw speed', ['hands-1'], { throwSpeedPct: 0.05 }, 64, 66),
  n('hands-3', 'hands', 'small', 'Light feet', '+40 move speed', ['hands-2'], { moveSpeed: 40 }, 58, 74),
  // Crisp (upper left): crit
  n('crisp-1', 'crisp', 'small', 'Sharp edge', '+2% crit chance', ['hands-1'], { critChance: 0.02 }, 34, 38),
  n('crisp-2', 'crisp', 'small', 'Thin dough', '+2% crit chance', ['crisp-1'], { critChance: 0.02 }, 24, 30),
  n('crisp-3', 'crisp', 'small', 'Crackle', '+0.1 crit power', ['crisp-1'], { critMult: 0.1 }, 36, 26),
  n('crisp-4', 'crisp', 'small', 'Flaky layers', '+2% crit chance', ['crisp-2'], { critChance: 0.02 }, 14, 24),
  n('crisp-n', 'crisp', 'notable', 'Shatter', '+3% crit chance, +0.25 crit power', ['crisp-2', 'crisp-3'], { critChance: 0.03, critMult: 0.25 }, 26, 16),
  n('crisp-k', 'crisp', 'keystone', 'Golden Edge', '+10% crit chance, +0.5 crit power', ['crisp-n', 'crisp-4'], { critChance: 0.1, critMult: 0.5 }, 14, 10),
  // Soak (lower left): splash
  n('soak-1', 'soak', 'small', 'Dunk', '+3% soak', ['body-1'], { soak: 0.03 }, 26, 58),
  n('soak-2', 'soak', 'small', 'Gravy lover', '+3% soak', ['soak-1'], { soak: 0.03 }, 16, 66),
  n('soak-3', 'soak', 'small', 'Hot splash', '+5% crit splash', ['soak-1'], { critSplash: 0.05 }, 22, 76),
  n('soak-4', 'soak', 'small', 'Extra sauce', '+3% soak', ['soak-2'], { soak: 0.03 }, 8, 76),
  n('soak-n', 'soak', 'notable', 'Deep dunk', '+8% soak, +5% crit splash', ['soak-2', 'soak-3'], { soak: 0.08, critSplash: 0.05 }, 14, 88),
  n('soak-k', 'soak', 'keystone', 'Monsoon', '+20% soak, splash can crit', ['soak-n', 'soak-4'], { soak: 0.2, splashCrit: 1 }, 28, 92),
  // Heat (right): dips
  n('heat-1', 'heat', 'small', 'Spice up', '+8% dip damage', ['hands-1'], { dotPct: 0.08 }, 76, 50),
  n('heat-2', 'heat', 'small', 'Chilli kick', '+8% dip damage', ['heat-1'], { dotPct: 0.08 }, 88, 42),
  n('heat-3', 'heat', 'small', 'Long reach', '+5% range', ['heat-1'], { rangePct: 0.05 }, 88, 58),
  n('heat-4', 'heat', 'small', 'Big batch', '+4% bread size', ['heat-3'], { sizePct: 0.04 }, 94, 70),
  n('heat-n', 'heat', 'notable', 'Slow burn', '+20% dip damage, +5% range', ['heat-2', 'heat-3'], { dotPct: 0.2, rangePct: 0.05 }, 94, 50),
  n('heat-k', 'heat', 'keystone', 'Tandoor blaze', '+40% dip damage, +10% bread size', ['heat-n', 'heat-4'], { dotPct: 0.4, sizePct: 0.1 }, 82, 82),
];
const BY_ID = new Map(SPEC_NODES.map(x => [x.id, x]));
export const specNode = (id: string): SpecNode | undefined => BY_ID.get(id);

export const specOf = (save: SaveV2): string[] => (save as Partial<SaveV3>).spec?.nodes ?? [];
export const specPointsLeft = specPointsOf;
export const specSpent = (nodes: readonly string[]): number => nodes.reduce((a, id) => a + (BY_ID.get(id)?.cost ?? 0), 0);

export type Blocked = 'owned' | 'points' | 'needs' | 'keystone' | 'unknown';
/** null = can learn now; otherwise why not. */
export function allocateBlock(save: SaveV2, id: string): Blocked | null {
  const node = BY_ID.get(id), have = specOf(save);
  if (!node) return 'unknown';
  if (have.includes(id)) return 'owned';
  if (node.kind === 'keystone' && have.some(h => BY_ID.get(h)?.kind === 'keystone')) return 'keystone';
  if (!node.needs.every(r => have.includes(r))) return 'needs';
  return specPointsLeft(save) < node.cost ? 'points' : null;
}
export const canAllocate = (save: SaveV2, id: string): boolean => allocateBlock(save, id) === null;
export function allocate<S extends SaveV2>(save: S, id: string): S {
  if (!canAllocate(save, id)) return save;
  return { ...save, specPoints: specPointsLeft(save) - BY_ID.get(id)!.cost, spec: { nodes: [...specOf(save), id] } };
}
/** Free respec: every point comes back. */
export function respec<S extends SaveV2>(save: S): S {
  const have = specOf(save);
  return have.length ? { ...save, specPoints: specPointsLeft(save) + specSpent(have), spec: { nodes: [] } } : save;
}
/** Sum of the learned nodes' stats, added to the Loadout. */
export function specStats(save: SaveV2): Partial<PlayerStats> {
  const out: Partial<PlayerStats> = {};
  for (const id of specOf(save)) for (const [k, v] of Object.entries(BY_ID.get(id)?.stats ?? {})) out[k as keyof PlayerStats] = (out[k as keyof PlayerStats] ?? 0) + v;
  return out;
}
