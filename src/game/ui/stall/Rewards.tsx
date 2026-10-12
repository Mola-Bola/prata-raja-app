import type { applyRunResult } from '@/meta/runRewards';
import type { SaveV2 } from '@/meta/types';
import { newUnlocks, titleCase } from './helpers';
import { StallProgress, type Art } from './StallHub';

export type Payout = ReturnType<typeof applyRunResult>;
export function Rewards({ before, payout, art }: { before: SaveV2; payout: Payout; art: Art }) {
  const unlocks = newUnlocks(before, payout.save);
  return <div className="sh-rewards">
    <span>Stall XP +{payout.rewards.stallXp}</span>
    <div className="sh-xp-fill"><StallProgress xp={payout.save.stallXp} art={art} /></div>
    {unlocks.map(name => <span className="gu-newbest" role="status" key={name}>{name} unlocked!</span>)}
    <span>Chest earned · {titleCase(payout.rewards.chest.rarity)}</span>
    <div className="sh-materials">{Object.entries(payout.rewards.materials).map(([name, count]) => <span key={name}><img src={art(`materials/${name}`)} alt="" />{titleCase(name)} +{count}</span>)}</div>
  </div>;
}
