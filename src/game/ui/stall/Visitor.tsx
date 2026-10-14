// The milestone visitor: a regular at the stall after a run, with one line, a tap for the second, then the perk and the gift.
// Thanks marks the milestone seen and records its beat. Only one visitor per return; any other due milestone waits for the next.
import { useState } from 'react';

import { markVisitorSeen } from '@/meta/milestones';
import type { Milestone } from '@/content/milestones';

import type { Commit } from './sheets';
import type { Art } from './StallProgress';

export type Due = { level: number; visitor: Milestone; perk: string };

export function Visitor({ due, commit, art, onDone }: { due: Due; commit: Commit; art: Art; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const { level, visitor: v, perk } = due;
  const portrait = v.portrait ? art(v.portrait) : undefined;
  return (
    <div className="sh-dim">
      <section className="gu-sheet sh-sheet sh-visitor" role="dialog" aria-modal="true" aria-label={`Visitor: ${v.who}`} data-testid="stall-visitor">
        <p className="sh-visitor-who">{v.who}</p>
        {portrait ? <img className="sh-visitor-art" src={portrait} alt="" /> : <span className="sh-visitor-art" aria-hidden="true">{v.emoji ?? '🙂'}</span>}
        {step === 0 ? (
          <button type="button" className="gu-btn sh-visitor-line" data-testid="visitor-line" autoFocus onClick={() => setStep(1)}>
            {v.lines[0]}
            <span className="sh-visitor-tap">tap</span>
          </button>
        ) : (
          <>
            <p className="sh-visitor-line" data-testid="visitor-line2">{v.lines[1]}</p>
            <p className="sh-visitor-perk" data-testid="visitor-perk">Perk: {perk}</p>
            <p className="sh-visitor-gift" data-testid="visitor-gift">Gift: {v.gift}</p>
            <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="visitor-thanks" autoFocus onClick={() => { commit((s) => markVisitorSeen(s, level)); onDone(); }}>
              Thanks!
            </button>
          </>
        )}
      </section>
    </div>
  );
}
