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
      <p>A dip linked to a roti gets stronger the more you use it.</p>
      <p>{save.unlocks.signature ? 'Pick a Signature roti to link up to two dips to it.' : `Linking opens later: ${unlockBeat('signature')}.`}</p>
      {dipCollection(save, CONTENT).map(({ dip, available, progress }) => (
        <article className="sh-detail" key={dip.id} data-testid={`collection-${dip.id}`}>
          <div className="sh-dip-title"><img className="sh-item-art" src={art(dip.sprite)} alt="" /><h3>{dip.name}</h3></div>
          <p>{dipFamilyLabel(dip)}</p>
          <p>{available ? 'Available in daydreams' : dip.unlock === 'starter-s2' ? 'Available at stall level 2' : 'Cook in Recipes from stall level 6'}</p>
          <p>{cardView({ kind: 'dip', id: dip.id, level: 1 }).line}</p>
          {dip.matchingTags && <p>Fits: {tagLabels(dip.matchingTags)}</p>}
          {progress && isSimmerDip(dip.id) && <>
            <p>Level {progress.level} / 20 · {simmerBonusLabel(progress.level)} {SIMMER_FLAVOUR[dip.id]}</p>
            {progress.needed ? <>
              <label htmlFor={`dip-xp-${dip.id}`}>{progress.xp} / {progress.needed} to level {progress.level + 1}</label>
              <progress id={`dip-xp-${dip.id}`} max={progress.needed} value={progress.xp} />
            </> : <p>Level 20 · fully simmered</p>}
            <p>Grows when its linked roti hits enemies. Counts from your next daydream.</p>
          </>}
        </article>
      ))}
    </div>
  );
}
