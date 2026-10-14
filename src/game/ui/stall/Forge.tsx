// The forge bench: pick an owned piece of gear, enhance it (+5% a step, never destroys) or reroll one affix.
// All changes go through commit() with the pure src/meta/gear.ts functions.
import { useState } from 'react';

import { formatStat, statLabel } from '@/core/statRegistry';
import { enhance, enhanceCost, ENHANCE_PCT, itemStats, MAX_ENHANCE, RARITY_INFO, rerollAffix, rerollCost } from '@/meta/gear';
import { UNIQUES } from '@/meta/uniques';
import { MATERIALS, SLOTS, type GearItem, type Material, type SaveV2 } from '@/meta/types';
import { playSfx } from '../../audio/sfx';
import { fmt } from '../format';
import { titleCase } from './helpers';
import type { Commit } from './sheets';
import type { Art } from './StallProgress';

type Cost = { gold: number; materials: Partial<Record<Material, number>> };
const short = (save: SaveV2, cost: Cost) => save.gold < cost.gold || MATERIALS.some(m => save.materials[m] < (cost.materials[m] ?? 0));
const nameOf = (i: GearItem) => (i.uniqueId && UNIQUES[i.uniqueId]?.name) || titleCase(i.baseId);

function CostRow({ save, cost, art }: { save: SaveV2; cost: Cost; art: Art }) {
  return (
    <div className="fg-cost" data-testid="forge-cost">
      <span className="fg-need" data-short={save.gold < cost.gold || undefined}><img src={art('ui/coins')} alt="Coins" />{fmt(save.gold)}/{fmt(cost.gold)}</span>
      {MATERIALS.filter(m => cost.materials[m]).map(m => (
        <span key={m} className="fg-need" data-short={save.materials[m] < cost.materials[m]! || undefined}>
          <img src={art(`materials/${m}`)} alt={titleCase(m)} />{save.materials[m]}/{cost.materials[m]}
        </span>
      ))}
    </div>
  );
}

export function ForgeSheet({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const [uid, setUid] = useState<string | null>(null);
  const [strike, setStrike] = useState(0);
  const owned = save.inventory.filter(i => !save.pendingChests.includes(i.uid));
  const item = owned.find(i => i.uid === uid);
  const n = item?.enhance ?? 0;
  const eCost = enhanceCost(n);
  const rCost = item ? rerollCost(item) : null;
  const now = item ? itemStats(item) : {};
  const next = item && n < MAX_ENHANCE ? itemStats({ ...item, enhance: n + 1 }) : null;
  const doEnhance = () => {
    if (!item) return;
    commit(s => enhance(s, item.uid));
    setStrike(k => k + 1);
    playSfx('crit');
    window.setTimeout(() => playSfx('coin'), 120);
  };
  const unique = item?.uniqueId ? UNIQUES[item.uniqueId] : undefined;
  return (
    <>
      {SLOTS.map(slot => {
        const items = owned.filter(i => i.slot === slot);
        return items.length > 0 && (
          <div key={slot}>
            <h3 className="sh-section">{titleCase(slot)}</h3>
            <div className="sh-inventory">
              {items.map(i => (
                <button type="button" key={i.uid} className="sh-tile" data-testid="forge-item" data-unique={i.uniqueId ? '' : undefined} aria-pressed={i.uid === uid}
                  style={{ borderColor: i.uniqueId ? 'var(--gold)' : RARITY_INFO[i.rarity].color }} onClick={() => setUid(i.uid)}>
                  <img className="sh-item-art" src={art(`gear/${i.baseId}`)} alt="" />
                  <b>{nameOf(i)}</b>
                  <span>{titleCase(i.rarity)} · il{i.ilvl ?? 1}{i.enhance ? ` · +${i.enhance}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {!owned.length && <p>No gear yet. Open a chest first.</p>}
      {item && (
        <section className="sh-detail fg-detail" data-testid="forge-detail" data-unique={unique ? '' : undefined}>
          <div className="fg-head">
            <span key={strike} className="fg-anvil" data-strike={strike || undefined}>
              <img className="sh-item-art" src={art(`gear/${item.baseId}`)} alt="" />
              {strike > 0 && <i className="fg-spark" aria-hidden="true" />}
            </span>
            <div>
              <b>{nameOf(item)}</b>
              <span>{titleCase(item.rarity)} · ilvl {item.ilvl ?? 1} · <b data-testid="forge-plus">+{n}</b></span>
            </div>
          </div>
          {unique && <p className="fg-rule" data-testid="forge-rule">{unique.blurb}</p>}
          {item.affixes.map((a, k) => (
            <div className="fg-affix" key={k} data-testid="forge-affix">
              <span>{statLabel(a.stat)} <b>{formatStat(a.stat, a.value, true)}</b></span>
              {a.tier && <em className={`fg-chip fg-chip--${a.tier}`}>{a.tier}</em>}
              {item.ilvl !== undefined && (
                <button type="button" className="gu-btn" data-testid="forge-reroll" disabled={!rCost || short(save, rCost)} onClick={() => { commit(s => rerollAffix(s, item.uid, k)); playSfx('uiTap'); }}>Reroll</button>
              )}
            </div>
          ))}
          {rCost && item.affixes.length > 0 && item.ilvl !== undefined && <><span>Reroll one affix: the rest stay.</span><CostRow save={save} cost={rCost} art={art} /></>}
          <h3 className="sh-section">Enhance (+{Math.round(ENHANCE_PCT * 100)}% a step)</h3>
          {next ? (
            <>
              {(Object.keys(next) as (keyof typeof next)[]).map(k => (
                <span key={k} className="fg-delta">{statLabel(k)}: {formatStat(k, now[k] ?? 0)} → <b>{formatStat(k, next[k]!)}</b></span>
              ))}
              <CostRow save={save} cost={eCost} art={art} />
              <button type="button" className="gu-btn gu-btn--primary" data-testid="forge-enhance" disabled={short(save, eCost)} onClick={doEnhance}>Enhance +{n + 1}</button>
              <span>Never breaks. A miss costs nothing.</span>
            </>
          ) : <p>Fully forged at +{MAX_ENHANCE}.</p>}
        </section>
      )}
    </>
  );
}
