// Dip shelf: drag a dip from the shelf into a katori socket on the start roti (src/meta/sockets.ts), drag it out onto the shelf to
// empty it, or buy one more socket at the forge. Tap fallback: tap a dip, then a socket.
import { CONTENT } from '@/content';
import { runPools } from '@/meta/recipes';
import { addSocket, canAddSocket, MAX_SOCKETS, SOCKET_FORGE_COST, socketCount, socketDip, socketsOf } from '@/meta/sockets';
import type { DipId } from '@/core/types';
import type { SaveV2 } from '@/meta/types';
import { playSfx } from '../../../audio/sfx';
import type { Commit } from '../../stall/sheets';
import type { Art } from '../../stall/StallProgress';
import { useDnD, useUndo } from './drag';
import { CostRow, useNudge } from './shared';
import { useState } from 'react';

type Drag = { dip: DipId; from?: number };
/** Same rule as computeLoadout: the Signature roti once it is unlocked, else Kosong. */
export const startBreadOf = (save: SaveV2) => (save.unlocks.signature ? save.signatureBread : 'kosong');

export function DipBench({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const bread = startBreadOf(save);
  const sockets = socketsOf(save, bread);
  const shelf = runPools(save, CONTENT).dipPool;
  const { msg, shake, nudge } = useNudge();
  const undo = useUndo(commit);
  const [held, setHeld] = useState<DipId | null>(null);
  const name = (d: DipId) => CONTENT.dips[d].name;

  const place = (p: Drag, target: string): boolean => {
    if (target === 'shelf') {
      if (p.from === undefined) return false;
      const ok = undo.run(`${name(p.dip)} out of the katori`, s => socketDip(s, bread, p.from!, null, CONTENT));
      if (ok) playSfx('uiTap');
      return ok;
    }
    const i = Number(target.replace('sock-', ''));
    if (p.from === i) return false;
    const ok = undo.run(`${name(p.dip)} in katori ${i + 1}`, s => socketDip(p.from === undefined ? s : socketDip(s, bread, p.from, null, CONTENT), bread, i, p.dip, CONTENT));
    if (ok) { playSfx('socket'); nudge(`${name(p.dip)} socketed.`); } else nudge(`${name(p.dip)} is already in a katori.`, target);
    return ok;
  };
  const dnd = useDnD<Drag>((p, t) => place(p, t));

  return (
    <div className="wb" data-testid="dip-bench">
      <p className="wb-line">Start roti: <b data-testid="wb-bread">{CONTENT.breads[bread].name}</b>. Katori dips join the run at once.</p>
      <div className="wb-roti" data-testid="wb-sockets">
        <img className="wb-roti-art" src={art(CONTENT.breads[bread].sprite)} alt="" />
        {sockets.map((d, i) => {
          const src = d ? dnd.source({ dip: d, from: i }, art(CONTENT.dips[d].sprite)) : null;
          return (
            <div key={i} className="wb-katori" {...dnd.target(`sock-${i}`)} data-testid={`socket-${i}`} data-dip={d ?? undefined} data-shake={shake === `sock-${i}` || undefined}
              onClick={() => held && place({ dip: held }, `sock-${i}`) && setHeld(null)}>
              {d ? <button type="button" className="wb-dip" aria-label={`${name(d)}, drag out`} style={src!.style} onPointerDown={src!.onPointerDown} data-lifted={dnd.dragging?.dip === d && dnd.dragging.from === i || undefined}>
                <img src={art(CONTENT.dips[d].sprite)} alt="" draggable={false} /><span>{name(d)}</span></button> : <span className="wb-empty">Empty katori</span>}
            </div>
          );
        })}
      </div>
      <p className="wb-msg" role="status" data-testid="wb-msg">{msg}</p>
      <div className="wb-shelf" {...dnd.target('shelf')} data-testid="wb-shelf">
        {shelf.map(d => {
          const src = dnd.source({ dip: d }, art(CONTENT.dips[d].sprite));
          return (
            <button type="button" key={d} className="sh-tile" data-testid={`shelf-${d}`} aria-pressed={held === d} style={src.style} onPointerDown={src.onPointerDown}
              data-lifted={dnd.dragging?.dip === d && dnd.dragging.from === undefined || undefined} onClick={() => setHeld(held === d ? null : d)}>
              <img className="sh-item-art" src={art(CONTENT.dips[d].sprite)} alt="" draggable={false} />
              <b>{name(d)}</b>
              <span>{sockets.includes(d) ? 'In a katori' : 'On the shelf'}</span>
            </button>
          );
        })}
      </div>
      <div className="wb-row">
      <button type="button" className="gu-btn" data-testid="wb-add-socket" disabled={!canAddSocket(save, bread)}
        onClick={() => { if (undo.run('Katori added', s => addSocket(s, bread))) playSfx('socket'); }}>
        {socketCount(save, bread) >= MAX_SOCKETS ? 'All katori open' : '+1 katori'}
      </button>
      {socketCount(save, bread) < MAX_SOCKETS && <CostRow save={save} cost={SOCKET_FORGE_COST} art={art} />}
      </div>
      {undo.toast}
      {dnd.ghost}
    </div>
  );
}
