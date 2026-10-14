import { DIP_RUN_XP_CAP, DIP_XP_CAP, matchingDipLink, SIMMER_DIPS, simmerBonusPct, simmerProgress, validDipXp } from '../core/dipProgression';
import type { Content, RunResult } from '../core/types';
import { runPools } from './recipes';
import type { SaveV2 } from './types';

export const SIMMER_FLAVOUR = {
  'fish-curry': 'burn DPS', 'mint-chutney': 'chill duration', 'condensed-milk': 'sticky slow duration',
} as const;
export const simmerBonusLabel = (level: number): string => `+${simmerBonusPct(level)}%`;
export type DipReceipt = { id: typeof SIMMER_DIPS[number]; gained: number; beforeXp: number; afterXp: number; beforeLevel: number; afterLevel: number };

export function grantDipUse(save: SaveV2, result: RunResult, content: Content): { dipXp: SaveV2['dipXp']; receipts: DipReceipt[] } {
  const dipXp = { ...save.dipXp };
  const receipts: DipReceipt[] = [];
  for (const id of SIMMER_DIPS) {
    const dip = result.dips.find(d => d.id === id);
    if (!dip || !result.breads.some(b => matchingDipLink(content, dip, b.id))) continue;
    const beforeXp = validDipXp(dipXp[id]);
    const gained = Math.min(DIP_XP_CAP - beforeXp, validDipXp(result.dipUseXp?.[id], DIP_RUN_XP_CAP));
    if (!gained) continue;
    const afterXp = beforeXp + gained;
    dipXp[id] = afterXp;
    receipts.push({ id, gained, beforeXp, afterXp, beforeLevel: simmerProgress(beforeXp).level, afterLevel: simmerProgress(afterXp).level });
  }
  return { dipXp, receipts };
}

export function dipCollection(save: SaveV2, content: Content) {
  const available = runPools(save, content).dipPool;
  return Object.values(content.dips).map(dip => ({ dip, available: available.includes(dip.id),
    progress: SIMMER_DIPS.some(id => id === dip.id) ? simmerProgress(save.dipXp?.[dip.id]) : null,
  }));
}
