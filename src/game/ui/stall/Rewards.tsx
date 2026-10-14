import { CONTENT } from '@/content';
import { SIMMER_FLAVOUR, simmerBonusLabel } from '@/meta/dipProgression';
import { simmerProgress } from '@/core/dipProgression';
import type { applyRunResult } from '@/meta/runRewards';
import type { SaveV2 } from '@/meta/types';

import { chestArt, newUnlocks, titleCase } from './helpers';
import { StallProgress, type Art } from './StallProgress';

export type Payout = ReturnType<typeof applyRunResult<SaveV2>>;

/** What a run paid, shown on the wake-up screen under the numbers (coins and XP sit in the stats row): the stall bar filling,
 *  any new unlocks, the chest and the ingredients. It only draws the payout it is given; it never applies one. */
export function Rewards({ before, payout, art }: { before: SaveV2; payout: Payout; art: Art }) {
  const { rewards } = payout;
  const unlocks = newUnlocks(before, payout.save);
  const materials = Object.entries(rewards.materials).filter(([, count]) => count > 0);
  return (
    <div className="sh-rewards" data-testid="results-rewards">
      <StallProgress xp={payout.save.stallXp} from={before.stallXp} art={art} />
      {unlocks.length > 0 && (
        <p className="sh-unlocks" role="status" data-testid="results-unlocks">
          {unlocks.map((name) => (
            <span className="gu-newbest" key={name}>
              Unlocked: {name}
            </span>
          ))}
        </p>
      )}
      {rewards.dipReceipts.map(receipt => {
        const progress = simmerProgress(receipt.afterXp);
        return <div className="sh-detail sh-dip-receipt" key={receipt.id} data-testid={`results-dip-${receipt.id}`}>
          <p>{CONTENT.dips[receipt.id].name} · +{receipt.gained} simmer XP</p>
          <p>Simmer {receipt.beforeLevel}{receipt.afterLevel !== receipt.beforeLevel ? ` → ${receipt.afterLevel}` : ''} · {simmerBonusLabel(receipt.afterLevel)} {SIMMER_FLAVOUR[receipt.id]}</p>
          <p>{progress.needed ? `${progress.xp} / ${progress.needed} to Simmer ${progress.level + 1}` : 'Fully simmered'} · Applies next daydream</p>
        </div>;
      })}
      <p className="sh-gains">
        {rewards.chest && (
          <span className="sh-gain" data-testid="results-chest">
            <img src={art(chestArt(rewards.chest.rarity))} alt="" />
            Chest earned · {titleCase(rewards.chest.rarity)}
          </span>
        )}
        {materials.map(([name, count]) => (
          <span className="sh-gain" key={name} role="img" aria-label={`${titleCase(name)} +${count}`} data-testid={`results-material-${name}`}>
            <img src={art(`materials/${name}`)} alt="" />+{count}
          </span>
        ))}
      </p>
    </div>
  );
}
