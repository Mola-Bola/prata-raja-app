// Gear rack x forge: drag a piece of gear onto the hot tawa to enhance it (cost shown first, unaffordable shakes and refuses).
// Reroll stays a button. Pure rules: src/meta/gear.ts. Every drop is undoable for 5 s (useUndo).
import { useState } from 'react';

import { formatStat, statLabel } from '@/core/statRegistry';
import { enhance, enhanceCost, MAX_ENHANCE, RARITY_INFO, rerollAffix, rerollCost } from '@/meta/gear';
import { UNIQUES } from '@/meta/uniques';
import { SLOTS, type GearItem, type SaveV2 } from '@/meta/types';
import { playSfx } from '../../../audio/sfx';
import { titleCase } from '../../stall/helpers';
import type { Commit } from '../../stall/sheets';
import type { Art } from '../../stall/StallProgress';
import { useDnD, useUndo } from './drag';
import { CostRow, short, useNudge } from './shared';

const nameOf = (i: GearItem) => (i.uniqueId && UNIQUES[i.uniqueId]?.name) || titleCase(i.baseId);

export function GearBench({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const [uid, setUid] = useState<string | null>(null);
  const { msg, shake, nudge } = useNudge();
  const undo = useUndo(commit);
  const owned = save.inventory.filter(i => !save.pendingChests.includes(i.uid));

  const doEnhance = (id: string): boolean => {
    const item = owned.find(i => i.uid === id);
    if (!item) return false;
    const n = item.enhance ?? 0;
    if (n >= MAX_ENHANCE) { nudge(`${nameOf(item)} is fully forged.`, 'tawa'); return false; }
    if (!undo.run(`${nameOf(item)} enhanced to +${n + 1}`, s => enhance(s, id))) { nudge('Not enough coins or ingredients.', 'tawa'); return false; }
    setUid(id);
    playSfx('enhance');
    nudge(`${nameOf(item)} +${n + 1}`);
    return true;
  };
  const dnd = useDnD<string>((id, target) => (target === 'tawa' ? doEnhance(id) : false));
  const item = owned.find(i => i.uid === (dnd.dragging ?? uid));
  const n = item?.enhance ?? 0;
  const eCost = enhanceCost(n);
  const picked = owned.find(i => i.uid === uid);
  const rCost = picked ? rerollCost(picked) : null;

  return (
    <div className="wb" data-testid="gear-bench">
      <div className="wb-tawa" {...dnd.target('tawa')} data-testid="wb-tawa" data-shake={shake === 'tawa' || undefined}>
        <img src={art('roomui/icon-anvil-tawa')} alt="" />
        <div>
          <b>Hot tawa</b>
          <span>{item ? (n >= MAX_ENHANCE ? 'Fully forged' : `Drop to enhance ${nameOf(item)} to +${n + 1}`) : 'Drag a piece of gear here to enhance it'}</span>
          {item && n < MAX_ENHANCE && <CostRow save={save} cost={eCost} art={art} />}
        </div>
      </div>
      <p className="wb-msg" role="status" data-testid="wb-msg">{msg}</p>
      {SLOTS.map(slot => {
        const items = owned.filter(i => i.slot === slot);
        return items.length > 0 && (
          <div key={slot}>
            <h3 className="sh-section">{titleCase(slot)}</h3>
            <div className="sh-inventory">
              {items.map(i => {
                const src = dnd.source(i.uid, art(`gear/${i.baseId}`));
                return (
                <button type="button" key={i.uid} className="sh-tile" data-testid="wb-item" data-uid={i.uid} aria-pressed={i.uid === uid}
                  data-lifted={dnd.dragging === i.uid || undefined}
                  style={{ borderColor: i.uniqueId ? 'var(--gold)' : RARITY_INFO[i.rarity].color, ...src.style }}
                  onPointerDown={src.onPointerDown} onClick={() => setUid(i.uid)}>
                  <img className="sh-item-art" src={art(`gear/${i.baseId}`)} alt="" draggable={false} />
                  <b>{nameOf(i)}</b>
                  <span>{titleCase(i.rarity)} · il{i.ilvl ?? 1}{i.enhance ? ` · +${i.enhance}` : ''}</span>
                </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {!owned.length && <p>No gear yet. Open a chest first.</p>}
      {picked && (
        <section className="sh-detail fg-detail" data-testid="wb-detail">
          <b>{nameOf(picked)} <span data-testid="wb-plus">+{picked.enhance ?? 0}</span></b>
          {picked.affixes.map((a, k) => (
            <div className="fg-affix" key={k}>
              <span>{statLabel(a.stat)} <b>{formatStat(a.stat, a.value, true)}</b></span>
              {picked.ilvl !== undefined && (
                <button type="button" className="gu-btn" data-testid="wb-reroll" disabled={!rCost || short(save, rCost)}
                  onClick={() => { undo.run(`Rerolled ${statLabel(a.stat)}`, s => rerollAffix(s, picked.uid, k)); playSfx('uiTap'); }}>Reroll</button>
              )}
            </div>
          ))}
          {rCost && picked.affixes.length > 0 && picked.ilvl !== undefined && <><span>Reroll one affix: the rest stay.</span><CostRow save={save} cost={rCost} art={art} /></>}
          <button type="button" className="gu-btn gu-btn--primary" data-testid="wb-enhance" onClick={() => doEnhance(picked.uid)}>Enhance +{(picked.enhance ?? 0) + 1}</button>
        </section>
      )}
      {undo.toast}
      {dnd.ghost}
    </div>
  );
}
