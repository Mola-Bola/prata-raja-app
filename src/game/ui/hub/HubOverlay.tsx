// The walkable stall's React side (the scene is src/game/phaser/HubScene.ts). It listens to the hub's `hubStation` event: Kannan
// walks into a station's range and that station's panel opens as a bottom sheet over the room; he walks out and it closes. The
// panels reuse the old stall's sheets (src/game/ui/stall/*), at most two levels deep (station, then a tab). The GO pill is always
// there and starts a run exactly as the old stall's Start button did. The overlay ignores touches except on its own controls,
// so the joystick and tap-to-walk go to the canvas.
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { brandWords } from '@/brand';
import { CONTENT } from '@/content';
import { chapterUnlocked } from '@/meta/chapters';
import { kannanXpOf, specPointsOf } from '@/meta/kannan';
import { dueMilestone } from '@/meta/milestones';
import { nextStep, stationState } from '@/meta/onboarding';
import { MATERIALS, type SaveV2, type UnlockFlag } from '@/meta/types';

import type { Hub, StationId } from '../../hub';
import { fmt } from '../format';
import { SettingsSheet, SignatureSheet, CalendarSheet, ChestsSheet, GearSheet, IdleSheet, RecipeSheet, TrainingSheet, type Commit } from '../stall/sheets';
import { DipCollection } from '../stall/DipCollection';
import { DipBench } from './workbench/DipBench';
import { GearBench } from './workbench/GearBench';
import { PotBench } from './workbench/PotBench';
import { TiffinBench } from './workbench/TiffinBench';
import { lockLine, progress, titleCase } from '../stall/helpers';
import type { Art } from '../stall/StallProgress';
import { Visitor } from '../stall/Visitor';
import { playSfx } from '../../audio/sfx';
import { KopiMeal, mealLabel } from '../meal/KopiMeal';
import { SpecTree } from '../spec/SpecTree';
import { openFeedback } from '../FeedbackSheet'; // [feedback hook]
import '../system';
import '../stall/Stall.css';
import { markTipSeen, seenTips, TIPS } from './tips';
import './HubOverlay.css';

type Props = { hub: Hub; save: SaveV2; commit: Commit; art: Art; afterRun: boolean; onStart: (chapterId: string) => void; onStory: () => void; onKitchen: () => void; onTune?: () => void };
type Open = StationId | 'settings';

const TITLES: Record<Open, string> = { tawa: 'Tawa', dips: 'Dip shelf', gear: 'Gear rack and forge', pantry: 'Pantry', spec: 'Spec board', orders: 'Orders', kopi: 'Kopi uncle', exit: 'Out to the street', settings: 'Settings' };
const ICONS: Partial<Record<Open, string>> = { tawa: 'roomui/icon-tawa', dips: 'roomui/icon-katori', gear: 'roomui/icon-anvil-tawa', pantry: 'roomui/icon-pantry-sack', orders: 'roomui/icon-chalkboard', kopi: 'roomui/icon-kopi-cup', spec: 'hub/star', settings: 'hub/settings', exit: 'hub/stall-badge' };

export function HubOverlay({ hub, save, commit, art, afterRun, onStart, onStory, onKitchen, onTune }: Props) {
  const [station, setStation] = useState<StationId | null>(null);
  /** A panel opened by hand (the GO pill, the cog), not by walking: it stays until closed. */
  const [held, setHeld] = useState<Open | null>(null);
  const [visitor, setVisitor] = useState(() => (afterRun ? dueMilestone(save) : null));
  useEffect(() => hub.on('hubStation', ({ id }) => { setStation(id); if (id) setHeld(null); }), [hub]);
  const shown: Open | null = held ?? station;
  const wasShown = useRef<Open | null>(null);
  useEffect(() => {
    if (shown && !wasShown.current) playSfx('stationOpen');
    else if (!shown && wasShown.current) playSfx('stationClose');
    wasShown.current = shown;
  }, [shown]);
  const close = () => {
    setHeld(null);
    hub.controls?.hubDismiss?.();
  };
  const chests = save.pendingChests.length;
  useEffect(() => hub.emit('hubBadges', { chests }), [hub, chests]);
  // Onboarding: locked stations (dimmed in the scene, a reason line in their panel) and the one station that pulses.
  const guide = nextStep(save);
  const locked = Object.fromEntries((Object.keys(TITLES) as Open[]).flatMap((id) => {
    const state = id === 'settings' ? 'open' : stationState(save, id);
    return state === 'open' ? [] : [[id, state.locked]];
  })) as Partial<Record<StationId, string>>;
  const lockKey = JSON.stringify(locked), nextId = guide?.station ?? null;
  useEffect(() => hub.emit('hubGuide', { locked: JSON.parse(lockKey) as typeof locked, next: nextId }), [hub, lockKey, nextId]);
  const go = () => (chapterUnlocked(save, 'hawker-night') ? setHeld('exit') : onStart(CONTENT.chapters[0].id));
  const { level, fraction } = progress(kannanXpOf(save));
  // Exactly one thing pulses: the station nextStep names (GO when that is the street). Everything else waits quietly.
  const next = guide?.station === 'exit';
  // GO floats over the room; with a panel open it docks in the panel's footer so it never covers content.
  const goBtn = (
    <button type="button" className="hb-go" data-testid="hub-go" data-next={next || undefined} aria-label="Go" onClick={go}>
      <img src={art('roomui/go-pill')} alt="" />
    </button>
  );
  return (
    <div className="hb-root" data-testid="hub-overlay">
      <header className="hb-top">
        <div className="hb-level" data-testid="hub-level">
          <img src={art('roomui/level-ring-frame')} alt="" />
          <b>{level}</b>
          <i style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
        <span className="hb-spec" data-testid="hub-spec"><img src={art('hub/star')} alt="" />{specPointsOf(save)}</span>
        <span className="hb-coins" data-testid="hub-coins">
          <img src={art('roomui/coin-pill')} alt="" />
          <b>{fmt(save.gold)}</b>
        </span>
        <button type="button" className="u-plain u-round hb-cog" data-testid="hub-settings" aria-label="Settings" onClick={() => setHeld('settings')}>
          <img src={art('hub/settings')} alt="" />
        </button>
      </header>
      {!shown && goBtn}
      {!shown && guide && <span className="hb-next" data-testid="hub-next">{guide.line}</span>}
      {mealLabel(save) && <span className="hb-meal" data-testid="hub-meal">{mealLabel(save)}</span>}
      <button type="button" className="u-plain hb-tell" data-testid="hub-tell" onClick={openFeedback}>Tell Kannan</button>
      {shown && (
        <Panel key={shown} id={shown} close={close} art={art} footer={goBtn} locked={shown !== 'settings' && locked[shown] ? locked[shown] : undefined}>
          <Content id={shown} save={save} commit={commit} art={art} onStart={onStart} onStory={onStory} onKitchen={onKitchen} onTune={onTune} close={close} walkTo={(s) => { setHeld(null); hub.controls?.hubWalkTo?.(s); }} />
        </Panel>
      )}
      {visitor && <Visitor due={visitor} commit={commit} art={art} onDone={() => setVisitor(null)} />}
    </div>
  );
}

function Panel({ id, close, art, footer, locked, children }: { id: Open; close: () => void; art: Art; footer: ReactNode; locked?: string; children: ReactNode }) {
  const icon = ICONS[id];
  // The first time this station's panel opens, a one-line tip at the top; remembered in UI prefs (tips.ts), not the save.
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void seenTips().then((seen) => {
      if (live && !locked && TIPS[id] && !seen.has(id)) { setTip(TIPS[id]); markTipSeen(id); }
    });
    return () => { live = false; };
  }, [id, locked]);
  return (
    <section className="gu-sheet hb-sheet u-sheet-in" role="dialog" aria-label={TITLES[id]} data-testid="hub-panel" data-station={id} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <header className="hb-sheet-head">
        {icon && <img src={art(icon)} alt="" />}
        <h2 className="gu-heading">{TITLES[id]}</h2>
        <button type="button" className="u-plain u-round" data-testid="hub-close" aria-label="Close panel" onClick={close}><i className="ic ic-x" aria-hidden="true" /></button>
      </header>
      {tip && <p className="hb-tip" data-testid="hub-tip">{tip}</p>}
      {locked ? <div className="sh-locked" data-testid="stall-locked"><img src={art('ui/lock')} alt="" /><p>{locked}</p></div> : children}
      <footer className="hb-sheet-foot">{footer}</footer>
    </section>
  );
}

/** A station's panel is one view, or a row of tabs (one more level, never more). */
function Tabs({ tabs: all }: { tabs: { name: string; flag?: UnlockFlag; /** Hidden until the player has played this many runs. */ runs?: number; save: SaveV2; art: Art; body: ReactNode }[] }) {
  const [i, setI] = useState(0);
  // A tab the player has not met (a closed flag, too few runs) is not shown at all.
  const tabs = all.filter((x) => (x.runs ?? 0) <= x.save.runs && !(x.flag && !x.save.unlocks[x.flag]));
  const t = tabs[i] ?? tabs[0];
  // A station with nothing open yet shows one plain line.
  if (!t) return <div className="sh-locked" data-testid="stall-locked"><img src={all[0].art('ui/lock')} alt="" /><p>{all[0].flag ? lockLine(all[0].flag) : ''}</p></div>;
  return (
    <>
      {tabs.length > 1 && (
        <div className="hb-tabs" role="tablist">
          {tabs.map((x, n) => <button key={x.name} type="button" role="tab" aria-selected={n === i} className="u-chip" data-testid={`hub-tab-${x.name.toLowerCase().replace(/\W+/g, '-')}`} onClick={() => setI(n)}>{x.name}</button>)}
        </div>
      )}
      {t.body}
    </>
  );
}

/** Gear rack: wear and forge, with the chests that fill the rack opened right here (when any are waiting). */
function GearStation({ save, commit, art }: { save: SaveV2; commit: Commit; art: Art }) {
  const [chests, setChests] = useState(false);
  const n = save.pendingChests.length;
  if (chests) return (
    <>
      <button type="button" className="u-plain" data-testid="gear-back" onClick={() => setChests(false)}><i className="ic ic-back" aria-hidden="true" />Back to gear</button>
      <ChestsSheet save={save} commit={commit} art={art} />
    </>
  );
  const t = { save, art };
  return (
    <>
      {n > 0 && <button type="button" className="u-go hb-chests" data-testid="gear-open-chests" onClick={() => setChests(true)}>Open chests ({n})</button>}
      <Tabs tabs={[{ name: 'Wear', flag: 'gear', ...t, body: <GearSheet save={save} commit={commit} art={art} /> }, { name: 'Forge', flag: 'gear', ...t, body: <GearBench save={save} commit={commit} art={art} /> }]} />
    </>
  );
}

type ContentProps = { id: Open; save: SaveV2; commit: Commit; art: Art; onStart: (c: string) => void; onStory: () => void; onKitchen: () => void; onTune?: () => void; walkTo: (s: StationId) => void; close: () => void };

function Content({ id, save, commit, art, onStart, onStory, onKitchen, onTune, walkTo, close }: ContentProps) {
  const now = new Date();
  const chapters = (
    <div data-testid="hub-chapters">
      {CONTENT.chapters.filter((ch) => chapterUnlocked(save, ch.id)).map((ch) => (
        <button key={ch.id} type="button" className="u-plain sh-chapter" data-testid={`chapter-${ch.id}`} onClick={() => onStart(ch.id)}>
          <img src={art(ch.background)} alt="" />
          {ch.name}
        </button>
      ))}
    </div>
  );
  const t = { save, art };
  switch (id) {
    case 'tawa':
      return <Tabs tabs={[{ name: 'Roti', ...t, body: <SignatureSheet save={save} commit={commit} art={art} /> }, { name: 'Tiffin', flag: 'signature', ...t, body: <TiffinBench save={save} commit={commit} art={art} /> }, { name: 'Recipes', flag: 'recipeBook', ...t, body: <RecipeSheet save={save} commit={commit} art={art} /> }]} />;
    case 'dips':
      return <Tabs tabs={[{ name: 'Katori', ...t, body: <DipBench save={save} commit={commit} art={art} /> }, { name: 'Curry pot', runs: 3, ...t, body: <PotBench save={save} commit={commit} art={art} /> }, { name: 'All dips', runs: 3, ...t, body: <DipCollection save={save} art={art} /> }]} />;
    case 'gear':
      return <GearStation save={save} commit={commit} art={art} />;
    case 'pantry':
      return (
        <Tabs tabs={[
          { name: 'Materials', ...t, body: (
            <div className="hb-materials" data-testid="hub-materials">
              {MATERIALS.map((m) => <span key={m} className="sh-balance"><img src={art(`materials/${m}`)} alt="" />{titleCase(m)} {save.materials[m]}</span>)}
            </div>
          ) },
          { name: 'Chests', ...t, body: <ChestsSheet save={save} commit={commit} art={art} /> },
          { name: 'Tip jar', runs: 3, ...t, body: <IdleSheet save={save} commit={commit} art={art} now={now} /> },
        ]} />
      );
    case 'spec':
      return (
        <Tabs tabs={[
          { name: 'Spec tree', ...t, body: <SpecTree save={save} commit={commit} onClose={close} embedded /> },
          { name: 'Training', flag: 'training', ...t, body: <TrainingSheet save={save} commit={commit} art={art} /> },
        ]} />
      );
    case 'orders':
      return (
        <Tabs tabs={[
          { name: 'Places', ...t, body: chapters },
          { name: 'Calendar', runs: 3, ...t, body: <CalendarSheet save={save} commit={commit} art={art} now={now} go={() => walkTo('pantry')} /> },
        ]} />
      );
    case 'kopi':
      return <KopiMeal save={save} commit={commit} onClose={close} embedded />;
    case 'exit':
      return chapters;
    case 'settings':
      return (
        <>
          <SettingsSheet save={save} commit={commit} />
          <button type="button" className="u-plain" data-testid="settings-story" onClick={onStory}>Replay the story</button>
          <button type="button" className="u-plain" data-testid="hub-kitchen" onClick={onKitchen}>{brandWords.words.kitchen}</button>
          {onTune && <button type="button" className="u-plain" data-testid="hub-tune" onClick={onTune}>Tune</button>}
        </>
      );
  }
}
