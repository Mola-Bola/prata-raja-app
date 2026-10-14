// Tawa panel, tiffin: three slots. Slot 1 is the start roti (the Signature, what a run actually starts with); slots 2 and 3 pack
// extra rotis (`tiffin` on the save). Runs start with ONE roti today, so packed rotis are a saved wish-list until the sim can
// start with several. Drag a roti onto a slot; drag a packed roti back to the pool to unpack it.
import { CONTENT } from '@/content';
import type { BreadId } from '@/core/types';
import { runPools } from '@/meta/recipes';
import { chooseSignature } from '@/meta/signature';
import type { SaveV2, SaveV3 } from '@/meta/types';
import { playSfx } from '../../../audio/sfx';
import { unlockBeat } from '../../stall/helpers';
import type { Commit } from '../../stall/sheets';
import type { Art } from '../../stall/StallProgress';
import { useDnD, useUndo } from './drag';
import { useNudge } from './shared';

type Drag = { bread: BreadId; from?: number };
export const MAX_TIFFIN = 3;
export const tiffinOf = (save: SaveV2): string[] => (save as Partial<SaveV3>).tiffin ?? [];
/** Pure: put `bread` in slot `to` (0 = start roti). A start roti moved out swaps into the packed list. */
export function packTiffin(save: SaveV2, bread: BreadId, to: number): SaveV2 {
  const start = save.signatureBread;
  const extras = tiffinOf(save).filter(b => b !== bread);
  if (to === 0) {
    const next = chooseSignature(save, bread, CONTENT);
    return next === save ? save : { ...next, tiffin: bread === start ? extras : [start, ...extras].slice(0, MAX_TIFFIN - 1) } as SaveV2;
  }
  if (bread === start) return save;
  extras.splice(Math.min(to - 1, extras.length), 0, bread);
  return { ...save, tiffin: extras.slice(0, MAX_TIFFIN - 1) } as SaveV2;
}
export const unpackTiffin = (save: SaveV2, bread: BreadId): SaveV2 => ({ ...save, tiffin: tiffinOf(save).filter(b => b !== bread) } as SaveV2);

export function TiffinBench({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const { msg, shake, nudge } = useNudge();
  const undo = useUndo(commit);
  const pool = runPools(save, CONTENT).breadPool;
  const slots: (BreadId | null)[] = [save.signatureBread, ...tiffinOf(save).slice(0, MAX_TIFFIN - 1) as BreadId[]];
  while (slots.length < MAX_TIFFIN) slots.push(null);
  const name = (b: BreadId) => CONTENT.breads[b].name;

  const drop = (p: Drag, target: string): boolean => {
    if (target === 'pool') {
      if (!p.from) return false;
      const ok = undo.run(`${name(p.bread)} unpacked`, s => unpackTiffin(s, p.bread));
      if (ok) playSfx('uiTap');
      return ok;
    }
    const to = Number(target.replace('tiff-', ''));
    if (p.from === to) return false;
    const ok = undo.run(to === 0 ? `${name(p.bread)} is the start roti` : `${name(p.bread)} packed`, s => packTiffin(s, p.bread, to));
    if (ok) { playSfx('socket'); nudge(to === 0 ? `${name(p.bread)} starts the run.` : `${name(p.bread)} packed.`); } else nudge('That roti is already there.', target);
    return ok;
  };
  const dnd = useDnD<Drag>(drop);
  if (!save.unlocks.signature) return <p>Unlocks: {unlockBeat('signature')}.</p>;
  return (
    <div className="wb" data-testid="tiffin-bench">
      <p>Slot 1 is the roti you start with. Slots 2 and 3 are packed for later: a run starts with one roti for now.</p>
      <div className="wb-tiffin">
        {slots.map((b, i) => {
          const src = b && i > 0 ? dnd.source({ bread: b, from: i }, art(CONTENT.breads[b].sprite)) : null;
          return (
            <div key={i} className="wb-slot" {...dnd.target(`tiff-${i}`)} data-testid={`tiffin-${i}`} data-bread={b ?? undefined} data-shake={shake === `tiff-${i}` || undefined}>
              <i>{i === 0 ? 'Start' : `Slot ${i + 1}`}</i>
              {b ? <button type="button" className="wb-dip" style={src?.style} onPointerDown={src?.onPointerDown} data-lifted={dnd.dragging?.from === i || undefined}>
                <img src={art(CONTENT.breads[b].sprite)} alt="" draggable={false} /><span>{name(b)}</span></button> : <span className="wb-empty">Empty</span>}
            </div>
          );
        })}
      </div>
      <p className="wb-msg" role="status" data-testid="wb-msg">{msg}</p>
      <div className="sh-inventory" {...dnd.target('pool')} data-testid="tiffin-pool">
        {pool.map(id => {
          const src = dnd.source({ bread: id }, art(CONTENT.breads[id].sprite));
          return (
            <button type="button" key={id} className="sh-tile" data-testid={`tiffin-pick-${id}`} style={src.style} onPointerDown={src.onPointerDown}
              data-lifted={dnd.dragging?.bread === id && dnd.dragging.from === undefined || undefined}
              onClick={() => drop({ bread: id }, `tiff-${Math.max(1, slots.indexOf(null))}`)}>
              <img className="sh-item-art" src={art(CONTENT.breads[id].sprite)} alt="" draggable={false} />
              <b>{name(id)}</b>
            </button>
          );
        })}
      </div>
      {undo.toast}
      {dnd.ghost}
    </div>
  );
}
