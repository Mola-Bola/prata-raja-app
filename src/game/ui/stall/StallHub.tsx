import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { makeRng } from '@/core/rng';
import { equipItem, itemStats, RARITY_INFO, upgradeCost, upgradeItem } from '@/meta/gear';
import { collect, preview } from '@/meta/idle';
import { claim, STREAK_REWARDS } from '@/meta/streak';
import { buyTraining, respec, TRAINING_COSTS, TRAINING_STATS } from '@/meta/training';
import { SLOTS, TRAINING_IDS, type GearItem, type SaveV2 } from '@/meta/types';
import { pipText } from '../cardText';
import { giftLabel, HOTSPOTS, mergeCandidates, mergeGear, progress, statLines, titleCase, unlockLevel, type Panel } from './helpers';
import './Stall.css';

export type Art = (key: string) => string;
export function StallProgress({ xp, art }: { xp: number; art: Art }) {
  const p = progress(xp);
  return <div className="sh-progress">
    <div className="sh-level"><img src={art('hub/stall-badge')} alt="" /><b>{p.level}</b></div>
    <div><span>{p.label}</span><div className="gu-bar" role="progressbar" aria-label="Stall XP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.fraction * 100)}><i style={{ width: `${p.fraction * 100}%` }} /></div></div>
  </div>;
}

export function StallHub({ save, onChange, onStart, art, pending, onReveal }: {
  save: SaveV2; onChange: (save: SaveV2) => void; onStart: () => void; art: Art;
  pending: GearItem[]; onReveal: (uid: string) => void;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const spot = panel ? HOTSPOTS[panel] : null;
  const flag = spot && 'flag' in spot ? spot.flag : null;
  const locked = flag && !save.unlocks[flag];
  return <div className="sh-hub" data-testid="stall-hub">
    <img className="sh-backdrop" src={art('scene/hub')} alt="" />
    <header className="sh-top"><StallProgress xp={save.stallXp} art={art} /><span className="sh-coins"><img src={art('ui/coins')} alt="" />{save.gold}</span></header>
    <div className="sh-props"><img className="sh-scene" src={art('scene/hub')} alt="Kannan’s morning stall" />
    {Object.entries(HOTSPOTS).map(([id, s]) => <button key={id} type="button" className={`sh-hotspot sh-hotspot--${id}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} onClick={() => { setNow(new Date()); setPanel(id as Panel); }} data-testid={`stall-${id}`} aria-label={s.label}>
      <span>{'flag' in s && !save.unlocks[s.flag] && <img src={art('ui/lock')} alt="Locked" />}{s.label}{id === 'chests' && pending.length > 0 && ` · ${pending.length}`}</span>
    </button>)}</div>
    <footer className="sh-footer"><button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="ui-start" onClick={onStart}>Start daydream</button></footer>
    {panel && <Sheet title={HOTSPOTS[panel].label} onClose={() => setPanel(null)}>
      <span className="sh-balance">{save.gold} coins in the jar</span>
      {locked ? <div className="sh-locked"><img src={art('ui/lock')} alt="" /><p>Unlocks at stall level {unlockLevel(flag)}</p></div> : <>
        {panel === 'gear' && <Gear save={save} onChange={onChange} art={art} />}
        {panel === 'training' && <Training save={save} onChange={onChange} />}
        {panel === 'idle' && <Idle save={save} now={now} onChange={onChange} art={art} />}
        {panel === 'calendar' && <Calendar save={save} now={now} onChange={onChange} art={art} onChest={onReveal} />}
        {panel === 'chests' && <Chests save={save} pending={pending} onReveal={onReveal} art={art} />}
        {panel === 'recipes' && <><img className="sh-feature-art" src={art('hub/recipe-book')} alt="" /><p>Coming soon</p><p>Keep your ingredients for new recipes.</p></>}
        {panel === 'special' && <><img className="sh-feature-art sh-preview" src={art('hub/chef-special')} alt="" /><p>Coming soon</p><p>A fresh daydream, shared by everyone.</p></>}
      </>}
    </Sheet>}
  </div>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="sh-dim" onClick={onClose}>
    <section ref={ref} tabIndex={-1} className="gu-sheet sh-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }}>
      <header className="sh-sheet-head"><h2 className="gu-heading">{title}</h2><button type="button" className="gu-btn" onClick={onClose} aria-label="Close panel">×</button></header>
      {children}
    </section>
  </div>;
}

function Item({ item, art }: { item: GearItem; art: Art }) {
  return <><img className="sh-item-art" src={art(`gear/${item.baseId}`)} alt="" /><b>{titleCase(item.baseId)}</b><span>{titleCase(item.rarity)} · Lv {item.level}</span></>;
}
function Gear({ save, onChange, art }: { save: SaveV2; onChange: (save: SaveV2) => void; art: Art }) {
  const [uid, setUid] = useState<string | null>(null);
  const item = save.inventory.find(i => i.uid === uid);
  const candidates = item ? mergeCandidates(save, item) : [];
  const merge = (seed: number) => {
    if (!item) return;
    const next = mergeGear(save, item, makeRng(seed));
    if (next === save) return;
    onChange(next);
    setUid(next.inventory[next.inventory.length - 1].uid);
  };
  return <>
    <div className="sh-slots">{SLOTS.map(slot => {
      const worn = save.inventory.find(i => i.uid === save.equipped[slot]);
      return <button type="button" className="sh-tile" key={slot} onClick={() => setUid(worn?.uid ?? null)} aria-label={`${titleCase(slot)}${worn ? `: ${titleCase(worn.baseId)}` : ''}`}>
        <b>{titleCase(slot)}</b>{!save.unlocks[slot] ? <><img className="sh-item-art" src={art('ui/lock')} alt="" /><span>Level {unlockLevel(slot)}</span></> : worn ? <><img className="sh-item-art" src={art(`gear/${worn.baseId}`)} alt="" /><span>Lv {worn.level}</span></> : <span>Empty</span>}
      </button>;
    })}</div>
    <p>Tap gear to wear it.</p>
    <div className="sh-inventory">{save.inventory.map(i => <button type="button" key={i.uid} className="sh-tile" style={{ borderColor: RARITY_INFO[i.rarity].color }} aria-pressed={i.uid === uid} onClick={() => { setUid(i.uid); onChange(equipItem(save, i.uid)); }}><Item item={i} art={art} />{save.equipped[i.slot] === i.uid && <span>Wearing</span>}</button>)}</div>
    {!save.inventory.length && <p>Your next daydream brings a chest.</p>}
    {item && <section className="sh-detail"><b>{titleCase(item.baseId)}</b><p>{save.unlocks[item.slot] ? 'Ready for your next daydream.' : `Unlocks at stall level ${unlockLevel(item.slot)}`}</p>{statLines(itemStats(item)).map(line => <span key={line}>{line}</span>)}
      <button type="button" className="gu-btn" disabled={save.gold < upgradeCost(item) || !Number.isFinite(upgradeCost(item))} onClick={() => onChange(upgradeItem(save, item.uid))}>Upgrade · {upgradeCost(item)} coins</button>
      <button type="button" className="gu-btn" disabled={!candidates.length} onClick={() => merge(Date.now())}>Merge three · next rarity</button>
    </section>}
  </>;
}
function Training({ save, onChange }: { save: SaveV2; onChange: (save: SaveV2) => void }) {
  return <>{TRAINING_IDS.map(id => {
    const step = save.training[id], cost = TRAINING_COSTS[step];
    return <section className="sh-detail" key={id}><b>{titleCase(id)}</b><span aria-label={`${step} of ${TRAINING_COSTS.length} steps`}>{pipText(step, TRAINING_COSTS.length)}</span><span>{statLines(TRAINING_STATS[id]).join(' · ')} each step</span>
      <button type="button" className="gu-btn" disabled={cost === undefined || save.gold < cost} onClick={() => onChange(buyTraining(save, id))}>{cost === undefined ? 'Fully trained' : `Train · ${cost} coins`}</button>
    </section>;
  })}<button type="button" className="gu-btn" onClick={() => onChange(respec(save))}>Respec free · coins returned</button></>;
}
function Idle({ save, now, onChange, art }: { save: SaveV2; now: Date; onChange: (save: SaveV2) => void; art: Art }) {
  const p = preview(save, now);
  return <><img className="sh-feature-art" src={art('hub/tip-jar')} alt="" /><h3>{p.gold} coins waiting</h3><p>Counted {Number(p.hours.toFixed(1))} h of {p.capHours} h</p><p>{p.rate} coins each hour, while you’re away.</p><button type="button" className="gu-btn gu-btn--primary" disabled={!p.gold} onClick={() => onChange(collect(save, new Date()).save)}>Collect</button></>;
}
function Calendar({ save, now, onChange, art, onChest }: { save: SaveV2; now: Date; onChange: (save: SaveV2) => void; art: Art; onChest: (uid: string) => void }) {
  const gift = claim(save, now, -now.getTimezoneOffset());
  const [message, setMessage] = useState('');
  return <><p>Two rest days weekly; never start over.</p><div className="sh-calendar">{STREAK_REWARDS.map((reward, i) => <div className={`sh-day ${gift.rewards.day === i + 1 ? 'sh-day--today' : ''}`} key={i}><b>Day {i + 1}</b><span>{giftLabel(reward)}</span>{save.streak.day === i + 1 && <span>Last claimed</span>}</div>)}</div>
    <button type="button" className="gu-btn gu-btn--primary" disabled={!gift.rewards.day} onClick={() => {
      const fresh = claim(save, new Date(), -new Date().getTimezoneOffset());
      onChange(fresh.save);
      if (fresh.rewards.chest) { onChest(fresh.rewards.chest.uid); setMessage(`${titleCase(fresh.rewards.chest.rarity)} ${titleCase(fresh.rewards.chest.baseId)}`); }
      else setMessage(fresh.rewards.day ? `Day ${fresh.rewards.day} gift collected` : 'Already collected today');
    }}>{gift.rewards.day ? `Claim day ${gift.rewards.day}` : 'Today’s gift collected'}</button>
    {message && <p role="status">{message}</p>}{gift.rewards.chest && <img className="sh-feature-art" src={art('chests/chest-rare')} alt="" />}
  </>;
}
function Chests({ save, pending, onReveal, art }: { save: SaveV2; pending: GearItem[]; onReveal: (uid: string) => void; art: Art }) {
  const [revealed, setRevealed] = useState<GearItem | null>(null);
  return <><p>Rare pity: {save.chestPity.rare} · Epic pity: {save.chestPity.epic}</p><p>{save.chestPity.opened} chests awarded</p>
    {pending.map(item => <button type="button" className="gu-btn sh-chest" key={item.uid} onClick={() => { setRevealed(item); onReveal(item.uid); }}><img src={art('chests/chest-common')} alt="" />Open chest</button>)}
    {!pending.length && <p>Every daydream brings another chest.</p>}
    {revealed && <div key={revealed.uid} className="sh-reveal" role="status"><Item item={revealed} art={art} />{statLines(itemStats(revealed)).map(line => <span key={line}>{line}</span>)}<p>Already tucked into your gear rack.</p></div>}
  </>;
}
