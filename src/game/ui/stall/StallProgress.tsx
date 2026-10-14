import { useEffect, useState } from 'react';

import { progress } from './helpers';

export type Art = (key: string) => string;

/** Kannan's level badge and bar with its "Next: <unlock> in N XP" line. Give `from` (the XP before a payout) and the bar
 *  fills from there to `xp`; when the payout crossed a level it fills to the top, then starts the new level from empty. */
export function StallProgress({ xp, from, art }: { xp: number; from?: number; art: Art }) {
  const end = progress(xp);
  const start = from === undefined ? end : progress(from);
  const [shown, setShown] = useState({ level: start.level, fraction: start.fraction, snap: false });
  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (start.level === end.level) at(350, () => setShown({ level: end.level, fraction: end.fraction, snap: false }));
    else {
      at(350, () => setShown({ level: start.level, fraction: 1, snap: false }));
      at(1150, () => setShown({ level: end.level, fraction: 0, snap: true }));
      at(1200, () => setShown({ level: end.level, fraction: end.fraction, snap: false }));
    }
    return () => timers.forEach(window.clearTimeout);
  }, [start.level, start.fraction, end.level, end.fraction]);
  return (
    <div className="sh-progress" data-testid="stall-progress">
      <div className="sh-level">
        <img src={art('hub/stall-badge')} alt="" />
        <b data-testid="stall-level">{shown.level}</b>
      </div>
      <div>
        <span data-testid="kannan-xp">{end.xpLabel}</span>
        <span data-testid="stall-next">{end.label}</span>
        <div className="gu-bar" role="progressbar" aria-label="Kannan level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(end.fraction * 100)}>
          <i data-snap={shown.snap || undefined} style={{ width: `${shown.fraction * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
