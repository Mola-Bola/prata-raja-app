// Curry-pot fusion (round 8, milestone 4). Two dips from the shelf go in the pot; a known pair is DISCOVERED (once) and fills a
// slot in the discovery collection (`fusions` on the save). Unknown pair: nothing happens, nothing is spent. Dips are never consumed.
// Reward, chosen to never be pay-to-win: a one-time modest dip-simmer XP gift (FUSION_XP) to one of the three simmer dips, i.e. it
// only speeds up progress already earned by playing, there is no new stat, no purchase and no repeat farming (re-fusing a known pair gives nothing).
import { DIP_XP_CAP, validDipXp, type SimmerDipId } from '../core/dipProgression';
import type { Content, DipId } from '../core/types';
import { runPools } from './recipes';
import type { SaveV2, SaveV3 } from './types';

export type Fusion = { id: string; name: string; dips: readonly [DipId, DipId]; blurb: string; simmer: SimmerDipId };
export const FUSION_XP = 60;
export const FUSIONS: readonly Fusion[] = [
  { id: 'cooling-dhal', name: 'Cooling dhal', dips: ['mint-chutney', 'dhal'], blurb: 'Mint tames the lentils.', simmer: 'mint-chutney' },
  { id: 'fire-sambal-curry', name: 'Fire sambal curry', dips: ['fish-curry', 'sambal'], blurb: 'Fish curry with a red kick.', simmer: 'fish-curry' },
  { id: 'sweet-pull', name: 'Sweet pull', dips: ['condensed-milk', 'teh-tarik'], blurb: 'Teh tarik, thickened and sticky.', simmer: 'condensed-milk' },
  { id: 'golden-masala', name: 'Golden masala', dips: ['masala', 'ghee'], blurb: 'Spice bloomed in ghee.', simmer: 'fish-curry' },
  { id: 'double-curry', name: 'Double curry', dips: ['mutton-curry', 'chicken-curry'], blurb: 'Two pots, one ladle.', simmer: 'fish-curry' },
  { id: 'cool-cream', name: 'Cool cream', dips: ['mint-chutney', 'condensed-milk'], blurb: 'Mint and milk, chilled.', simmer: 'mint-chutney' },
];

export const fusionOf = (id: string): Fusion | undefined => FUSIONS.find(f => f.id === id);
export const findFusion = (a: DipId, b: DipId): Fusion | undefined => FUSIONS.find(f => a !== b && f.dips.includes(a) && f.dips.includes(b));
export const fusionsOf = (save: SaveV2): string[] => (save as Partial<SaveV3>).fusions ?? [];

export type Fused = { save: SaveV2; result: 'new' | 'known' | 'fizzle'; fusion?: Fusion };
/** Pure. 'fizzle' = not a recipe (or a dip you cannot use yet): the same save comes back. 'known' = discovered before: no reward. */
export function fuse(save: SaveV2, a: DipId, b: DipId, content: Content): Fused {
  const pool = runPools(save, content).dipPool;
  const fusion = pool.includes(a) && pool.includes(b) ? findFusion(a, b) : undefined;
  if (!fusion) return { save, result: 'fizzle' };
  if (fusionsOf(save).includes(fusion.id)) return { save, result: 'known', fusion };
  const dipXp = { ...save.dipXp, [fusion.simmer]: Math.min(DIP_XP_CAP, validDipXp(save.dipXp?.[fusion.simmer]) + FUSION_XP) };
  return { save: { ...save, dipXp, fusions: [...fusionsOf(save), fusion.id] } as SaveV2, result: 'new', fusion };
}
