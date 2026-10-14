// Curry pot: drop two dips in. A known pair is discovered (src/meta/fusion.ts), an unknown pair fizzles and nothing is spent.
// Tap fallback: tapping a dip tile drops it in the pot too.
import { useRef, useState } from 'react';

import { CONTENT } from '@/content';
import type { DipId } from '@/core/types';
import { fuse, FUSIONS, FUSION_XP, fusionsOf } from '@/meta/fusion';
import { runPools } from '@/meta/recipes';
import type { SaveV2 } from '@/meta/types';
import { playSfx } from '../../../audio/sfx';
import type { Commit } from '../../stall/sheets';
import type { Art } from '../../stall/StallProgress';
import { useDnD, useUndo } from './drag';
import { useNudge } from './shared';

export function PotBench({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const shelf = runPools(save, CONTENT).dipPool;
  const found = fusionsOf(save);
  const [pot, setPot] = useState<DipId[]>([]);
  const { msg, shake, nudge } = useNudge();
  const undo = useUndo(commit);
  const clear = useRef(0);
  const name = (d: DipId) => CONTENT.dips[d].name;

  const add = (dip: DipId): boolean => {
    if (pot.length >= 2 || pot.includes(dip)) return false;
    const next = [...pot, dip];
    setPot(next);
    if (next.length < 2) { nudge(`${name(dip)} in the pot. Add one more dip.`); return true; }
    const r = fuse(save, next[0], next[1], CONTENT);
    if (r.result === 'new') {
      undo.run(`Discovered ${r.fusion!.name}`, s => fuse(s, next[0], next[1], CONTENT).save);
      playSfx('fuse');
      nudge(`Discovered ${r.fusion!.name}! +${FUSION_XP} simmer XP.`);
    } else if (r.result === 'known') nudge(`${r.fusion!.name}: already discovered.`);
    else nudge('Not a match. Your dips are untouched.', 'pot');
    window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setPot([]), 900);
    return true;
  };
  const dnd = useDnD<DipId>((d, t) => t === 'pot' && add(d));

  return (
    <div className="wb" data-testid="pot-bench">
      <div className="wb-pot" {...dnd.target('pot', pot.length >= 2)} data-testid="wb-pot" data-shake={shake === 'pot' || undefined}>
        <b>Curry pot</b>
        <span>{pot.length ? pot.map(name).join(' + ') : 'Drag two dips in to try a fusion'}</span>
      </div>
      <p className="wb-msg" role="status" data-testid="wb-msg">{msg}</p>
      <div className="sh-inventory">
        {shelf.map(d => {
          const src = dnd.source(d, art(CONTENT.dips[d].sprite));
          return (
            <button type="button" key={d} className="sh-tile" data-testid={`pot-dip-${d}`} data-lifted={dnd.dragging === d || undefined} style={src.style}
              onPointerDown={src.onPointerDown} onClick={() => add(d)}>
              <img className="sh-item-art" src={art(CONTENT.dips[d].sprite)} alt="" draggable={false} />
              <b>{name(d)}</b>
            </button>
          );
        })}
      </div>
      <h3 className="sh-section">Discoveries {found.length}/{FUSIONS.length}</h3>
      <div className="wb-grid" data-testid="fusion-grid">
        {FUSIONS.map(f => found.includes(f.id) ? (
          <article key={f.id} className="sh-detail" data-testid={`fusion-${f.id}`} data-known="">
            <b>{f.name}</b>
            <span>{f.dips.map(name).join(' + ')}</span>
            <span>{f.blurb}</span>
          </article>
        ) : (
          <article key={f.id} className="sh-detail" data-testid={`fusion-${f.id}`}><b>???</b><span>Undiscovered</span></article>
        ))}
      </div>
      {undo.toast}
      {dnd.ghost}
    </div>
  );
}
