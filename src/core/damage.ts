// The one damage pipeline. Order (docs/research/adjacent-mechanics.md, patterns 1-3, 5):
//   base -> conversion (capped) -> additive "increased" -> separate "more" multipliers -> crit -> pierce falloff -> target's taken-multiplier.
// Pure: no rng. The crit roll stays in rollHit (stats.ts) so draw order is unchanged.
import type { BuffMods } from './stats';
import type { PlayerStats } from './types';

/** At most this share of base damage can be converted to Heat (cap the output, not the input). */
export const CONVERT_CAP = 0.5;
/** Pierce falloff never drops a hit below this share of its damage. */
export const PIERCE_FLOOR = 0.4;

/** Separate "more" multipliers, applied one by one. Dips/uniques/keystones add a named stat here. */
export const moreMuls = (s: PlayerStats): number[] => [1 + s.moreDmg];

/** Damage multiplier for a shot that already pierced `pierced` enemies: (1 - falloff)^pierced, floored. */
export const pierceMul = (s: PlayerStats, pierced: number): number => (pierced > 0 ? Math.max(PIERCE_FLOOR, (1 - s.pierceFalloff) ** pierced) : 1);

export function damageOf(base: number, stats: PlayerStats, mods: BuffMods, takenMul: number, crit: boolean, pierced = 0): number {
  const conv = base * Math.min(CONVERT_CAP, Math.max(0, stats.convertPct));
  const inc = 1 + stats.dmgPct + mods.dmgPct;
  let d = (base - conv) * inc + conv * (inc + stats.dotPct); // converted share keeps the increases and gains Heat's (dotPct)
  for (const m of moreMuls(stats)) d *= m;
  if (crit) d *= stats.critMult + mods.critMultAdd;
  return Math.max(0, d * pierceMul(stats, pierced) * takenMul);
}
