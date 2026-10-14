import { CONTENT } from '@/content';
import { dipFamilyLabel, tagLabels } from '@/core/dipLinks';
import { isSimmerDip } from '@/core/dipProgression';
import { dipCollection, SIMMER_FLAVOUR, simmerBonusLabel } from '@/meta/dipProgression';
import type { SaveV2 } from '@/meta/types';
import { cardView } from '../cardText';
import { unlockBeat } from './helpers';
import type { Art } from './StallProgress';

export function DipCollection({ save, art }: { save: SaveV2; art: Art }) {
  return (
    <div className="sh-dip-collection" data-testid="dip-collection">
      <p>Linked support dips simmer from combat use. Run tiers still grow from 1 to 5 during each daydream.</p>
      <p>{save.unlocks.signature ? 'Pick a compatible Signature roti to link up to two support dips when you find them.' : `Links begin with Signature (${unlockBeat('signature')}). Until then, dips have their ordinary global effects and earn no simmer XP.`}</p>
      {dipCollection(save, CONTENT).map(({ dip, available, progress }) => (
        <article className="sh-detail" key={dip.id} data-testid={`collection-${dip.id}`}>
          <div className="sh-dip-title"><img className="sh-item-art" src={art(dip.sprite)} alt="" /><h3>{dip.name}</h3></div>
          <p>{dipFamilyLabel(dip)}</p>
          <p>{available ? 'Available in daydreams' : dip.unlock === 'starter-s2' ? 'Available at stall level 2' : 'Cook in Recipes from stall level 6'}</p>
          <p>{cardView({ kind: 'dip', id: dip.id, level: 1 }).line}</p>
          {dip.matchingTags && <p>Fits: {tagLabels(dip.matchingTags)}</p>}
          {progress && isSimmerDip(dip.id) && <>
            <p>Simmer {progress.level} / 20 · {simmerBonusLabel(progress.level)} {SIMMER_FLAVOUR[dip.id]}</p>
            {progress.needed ? <>
              <label htmlFor={`dip-xp-${dip.id}`}>{progress.xp} / {progress.needed} to Simmer {progress.level + 1}</label>
              <progress id={`dip-xp-${dip.id}`} max={progress.needed} value={progress.xp} />
            </> : <p>Simmer 20 · fully simmered</p>}
            <p>Grows when its matching linked roti lands hits. Earned XP pays from wave 2 and powers the next daydream.</p>
          </>}
        </article>
      ))}
    </div>
  );
}
