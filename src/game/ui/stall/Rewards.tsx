import { CONTENT } from '@/content';
import { SIMMER_FLAVOUR, simmerBonusLabel } from '@/meta/dipProgression';
import { simmerProgress } from '@/core/dipProgression';
import type { applyRunResult } from '@/meta/runRewards';
import type { SaveV2 } from '@/meta/types';

import { kannanLevel, kannanXpOf } from '@/meta/kannan';
import { fmt, useCountUp } from '../format';
import { chestArt, newUnlocks, progress, titleCase } from './helpers';
import { StallProgress, type Art } from './StallProgress';

export type Payout = ReturnType<typeof applyRunResult<SaveV2>>;

const materialsOf = (payout: Payout) => Object.entries(payout.rewards.materials).filter(([, count]) => count > 0);

/** What a run paid, on the results screen: at most three things (coins, Kannan's XP bar, one loot chip). It only draws the
 *  payout it is given; it never applies one. The rest is in RewardDetails. */
export function Rewards({ before, payout, art }: { before: SaveV2; payout: Payout; art: Art }) {
  const { rewards } = payout;
  const coins = useCountUp(rewards.gold);
  const gain = rewards.kannanXp || rewards.stallXp;
  const count = materialsOf(payout).reduce((n, [, c]) => n + c, 0);
  const loot = [rewards.chest ? `${titleCase(rewards.chest.rarity)} chest` : '', count ? `${count} ${count === 1 ? 'item' : 'items'}` : ''].filter(Boolean).join(' + ');
  return (
    <div className="rs-rewards" data-testid="results-rewards">
      <ul className="rs-chips">
        <li className="rs-chip"><img src={art('ui/coins')} alt="" /><b data-testid="results-coins">+{fmt(coins)}</b> coins</li>
        {loot && (
          <li className="rs-chip" data-testid={rewards.chest ? 'results-chest' : 'results-loot'}>
            <img src={art(rewards.chest ? chestArt(rewards.chest.rarity) : `materials/${materialsOf(payout)[0][0]}`)} alt="" />{loot}
          </li>
        )}
      </ul>
      <StallProgress xp={kannanXpOf(payout.save)} from={kannanXpOf(before)} art={art} gain={gain} />
    </div>
  );
}

/** The single "Next:" line under the rewards: what changed at the stall, else the next unlock. */
export function nextLine(before: SaveV2, payout: Payout, paid: boolean): string {
  if (!paid) return 'Next: daydream a little longer to earn tips.';
  const unlocks = newUnlocks(before, payout.save);
  if (unlocks.length) return `Next: you unlocked ${unlocks.join(', ')}. Visit the stall.`;
  const level = kannanLevel(kannanXpOf(payout.save));
  if (level > kannanLevel(kannanXpOf(before))) return `Next: Kannan is level ${level}. Spend your new points at the stall.`;
  if (payout.rewards.chest) return 'Next: open your chest at the pantry.';
  const label = progress(kannanXpOf(payout.save)).label;
  return label.startsWith('Next') ? label : 'Next: go again and beat your best.';
}

/** The results expander: unlocks, level-up, every ingredient and the dip receipts. */
export function RewardDetails({ payout, art }: { payout: Payout; art: Art }) {
  const { rewards } = payout;
  return (
    <div className="rs-details" data-testid="results-extra">
      {rewards.dipReceipts.map(receipt => {
        const progressNow = simmerProgress(receipt.afterXp);
        const name = CONTENT.dips[receipt.id].name;
        return <div className="sh-detail sh-dip-receipt" key={receipt.id} data-testid={`results-dip-${receipt.id}`}>
          <p>{name} simmered +{receipt.gained} XP</p>
          <p>Level {receipt.beforeLevel}{receipt.afterLevel !== receipt.beforeLevel ? ` → ${receipt.afterLevel}` : ''} · {simmerBonusLabel(receipt.afterLevel)} {SIMMER_FLAVOUR[receipt.id]}</p>
          <p>{progressNow.needed ? `${progressNow.xp} / ${progressNow.needed} to level ${progressNow.level + 1}` : 'Fully simmered'}. Counts from your next daydream.</p>
        </div>;
      })}
      <p className="sh-gains">
        {materialsOf(payout).map(([name, count]) => (
          <span className="sh-gain" key={name} role="img" aria-label={`${titleCase(name)} +${count}`} data-testid={`results-material-${name}`}>
            <img src={art(`materials/${name}`)} alt="" />+{count}
          </span>
        ))}
      </p>
    </div>
  );
}
