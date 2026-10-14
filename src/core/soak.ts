// Crisp & Soak (docs/BUILDS.md): where a hit's base crit and splash come from beyond PlayerStats.
import type { BreadId, Content, DipFamily, OwnedDip, PlayerStats } from './types';

export const SOAK_RADIUS = 90;
/** Base soak of a 'soggy' roti, base crit chance of a 'crisp' roti. */
export const TAG_SOAK = 0.15;
export const TAG_CRISP = 0.05;
const DIP_SOAK: Record<DipFamily, number> = { curry: 0.04, dhal: 0.03, sambar: 0.06, chutney: 0, special: 0 };

/** Base crisp (crit chance) the roti brings: crisp-tagged rotis get +5%. */
export const rotiCrisp = (content: Content, breadId?: BreadId): number => (breadId && content.breads[breadId].tags.includes('crisp') ? TAG_CRISP : 0);

const baseOf = (content: Content, id: BreadId): BreadId => content.breads[id].evolvedFrom?.bread ?? id;

/** Soak share for a hit by `breadId`: stats.soak + soggy tag + each owned curry/dhal/sambar dip (+1% per level above 1;
 *  a dip linked to another roti does not count). */
export function soakFor(content: Content, stats: PlayerStats, dips: readonly OwnedDip[], breadId?: BreadId): number {
  let s = stats.soak + (breadId && content.breads[breadId].tags.includes('soggy') ? TAG_SOAK : 0);
  for (const d of dips) {
    if (d.linkedBread && baseOf(content, d.linkedBread) !== (breadId && baseOf(content, breadId))) continue;
    const base = DIP_SOAK[content.dips[d.id].family];
    if (base > 0) s += base + 0.01 * (d.level - 1);
  }
  return s;
}
