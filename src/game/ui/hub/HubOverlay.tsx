// The walkable stall's React side (the scene is src/game/phaser/HubScene.ts). It listens to the hub's `hubStation` event: Kannan
// walks into a station's range and that station's panel opens as a bottom sheet over the room; he walks out and it closes. The
// panels reuse the old stall's sheets (src/game/ui/stall/*), at most two levels deep (station, then a tab). The GO pill is always
// there and starts a run exactly as the old stall's Start button did. The overlay ignores touches except on its own controls,
// so the joystick and tap-to-walk go to the canvas.
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { CONTENT } from '@/content';
import { chapterUnlocked } from '@/meta/chapters';
import { kannanXpOf, specPointsOf } from '@/meta/kannan';
import { dueMilestone } from '@/meta/milestones';
import { MATERIALS, type SaveV2, type UnlockFlag } from '@/meta/types';

import type { Hub, StationId } from '../../hub';
import { fmt } from '../format';
import { SettingsSheet, SignatureSheet, CalendarSheet, ChestsSheet, GearSheet, IdleSheet, PreviewSheet, RecipeSheet, TrainingSheet, type Commit } from '../stall/sheets';
import { DipCollection } from '../stall/DipCollection';
import { DipBench } from './workbench/DipBench';
import { GearBench } from './workbench/GearBench';
import { PotBench } from './workbench/PotBench';
import { TiffinBench } from './workbench/TiffinBench';
import { progress, titleCase, unlockBeat } from '../stall/helpers';
import type { Art } from '../stall/StallProgress';
import { Visitor } from '../stall/Visitor';
import { playSfx } from '../../audio/sfx';
import { KopiMeal, mealLabel } from '../meal/KopiMeal';
import { SpecTree } from '../spec/SpecTree';
import { openFeedback } from '../FeedbackSheet'; // [feedback hook]
import '../stall/Stall.css';
import './HubOverlay.css';

type Props = { hub: Hub; save: SaveV2; commit: Commit; art: Art; afterRun: boolean; onStart: (chapterId: string) => void; onStory: () => void; onOldStall: () => void; onKitchen: () => void; onTune?: () => void };
type Open = StationId | 'settings';

const TITLES: Record<Open, string> = { tawa: 'Tawa', dips: 'Dip shelf', gear: 'Gear rack and forge', pantry: 'Pantry', spec: 'Spec board', orders: 'Orders', kopi: 'Kopi uncle', exit: 'Out to the street', settings: 'Settings' };
const ICONS: Partial<Record<Open, string>> = { tawa: 'roomui/icon-tawa', dips: 'roomui/icon-katori', gear: 'roomui/icon-anvil-tawa', pantry: 'roomui/icon-pantry-sack', orders: 'roomui/icon-chalkboard', kopi: 'roomui/icon-kopi-cup' };

export function HubOverlay({ hub, save, commit, art, afterRun, onStart, onStory, onOldStall, onKitchen, onTune }: Props) {
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
  const go = () => (chapterUnlocked(save, 'hawker-night') ? setHeld('exit') : onStart(CONTENT.chapters[0].id));
  const { level, fraction } = progress(kannanXpOf(save));
  return (
    <div className="hb-root" data-testid="hub-overlay">
      <header className="hb-top">
        <div className="hb-level" data-testid="hub-level">
          <img src={art('roomui/level-ring-frame')} alt="" />
          <b>{level}</b>
          <i style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
        <span className="hb-spec" data-testid="hub-spec">★ {specPointsOf(save)}</span>
        <span className="hb-coins" data-testid="hub-coins">
          <img src={art('roomui/coin-pill')} alt="" />
          <b>{fmt(save.gold)}</b>
        </span>
        <button type="button" className="hb-cog" data-testid="hub-settings" aria-label="Settings" onClick={() => setHeld('settings')}>
          <img src={art('hub/settings')} alt="" />
        </button>
      </header>
      <button type="button" className="hb-go" data-testid="hub-go" aria-label="Go" onClick={go}>
        <img src={art('roomui/go-pill')} alt="" />
      </button>
      {mealLabel(save) && <span className="hb-meal" data-testid="hub-meal">{mealLabel(save)}</span>}
      <button type="button" className="gu-btn hb-tell" data-testid="hub-tell" onClick={openFeedback}>Tell Kannan</button>
      {shown && (
        <Panel key={shown} id={shown} close={close} art={art}>
          <Content id={shown} save={save} commit={commit} art={art} onStart={onStart} onStory={onStory} onOldStall={onOldStall} onKitchen={onKitchen} onTune={onTune} close={close} walkTo={(s) => { setHeld(null); hub.controls?.hubWalkTo?.(s); }} />
        </Panel>
      )}
      {visitor && <Visitor due={visitor} commit={commit} art={art} onDone={() => setVisitor(null)} />}
    </div>
  );
}

function Panel({ id, close, art, children }: { id: Open; close: () => void; art: Art; children: ReactNode }) {
  const icon = ICONS[id];
  return (
    <section className="gu-sheet hb-sheet" role="dialog" aria-label={TITLES[id]} data-testid="hub-panel" data-station={id} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <header className="hb-sheet-head">
        {icon && <img src={art(icon)} alt="" />}
        <h2 className="gu-heading">{TITLES[id]}</h2>
        <button type="button" className="gu-btn" data-testid="hub-close" aria-label="Close panel" onClick={close}>×</button>
      </header>
      {children}
    </section>
  );
}

/** A station's panel is one view, or a row of tabs (one more level, never more). */
function Tabs({ tabs }: { tabs: { name: string; flag?: UnlockFlag; save: SaveV2; art: Art; body: ReactNode }[] }) {
  const [i, setI] = useState(0);
  const t = tabs[i];
  return (
    <>
      {tabs.length > 1 && (
        <div className="hb-tabs" role="tablist">
          {tabs.map((x, n) => <button key={x.name} type="button" role="tab" aria-selected={n === i} className="hb-tab" data-testid={`hub-tab-${x.name.toLowerCase().replace(/\W+/g, '-')}`} onClick={() => setI(n)}>{x.name}</button>)}
        </div>
      )}
      {t.flag && !t.save.unlocks[t.flag] ? (
        <div className="sh-locked" data-testid="stall-locked"><img src={t.art('ui/lock')} alt="" /><p>Unlocks: {unlockBeat(t.flag)}</p></div>
      ) : t.body}
    </>
  );
}

type ContentProps = { id: Open; save: SaveV2; commit: Commit; art: Art; onStart: (c: string) => void; onStory: () => void; onOldStall: () => void; onKitchen: () => void; onTune?: () => void; walkTo: (s: StationId) => void; close: () => void };

function Content({ id, save, commit, art, onStart, onStory, onOldStall, onKitchen, onTune, walkTo, close }: ContentProps) {
  const now = new Date();
  const chapters = (
    <div data-testid="hub-chapters">
      {CONTENT.chapters.filter((ch) => chapterUnlocked(save, ch.id)).map((ch) => (
        <button key={ch.id} type="button" className="gu-btn sh-chapter" data-testid={`chapter-${ch.id}`} onClick={() => onStart(ch.id)}>
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
      return <Tabs tabs={[{ name: 'Katori', ...t, body: <DipBench save={save} commit={commit} art={art} /> }, { name: 'Curry pot', ...t, body: <PotBench save={save} commit={commit} art={art} /> }, { name: 'Collection', ...t, body: <DipCollection save={save} art={art} /> }]} />;
    case 'gear':
      return <Tabs tabs={[{ name: 'Wear', flag: 'gear', ...t, body: <GearSheet save={save} commit={commit} art={art} /> }, { name: 'Forge', flag: 'gear', ...t, body: <GearBench save={save} commit={commit} art={art} /> }]} />;
    case 'pantry':
      return (
        <Tabs tabs={[
          { name: 'Materials', ...t, body: (
            <div className="hb-materials" data-testid="hub-materials">
              {MATERIALS.map((m) => <span key={m} className="sh-balance"><img src={art(`materials/${m}`)} alt="" />{titleCase(m)} {save.materials[m]}</span>)}
            </div>
          ) },
          { name: 'Chests', ...t, body: <ChestsSheet save={save} commit={commit} art={art} /> },
          { name: 'Tip jar', ...t, body: <IdleSheet save={save} commit={commit} art={art} now={now} /> },
        ]} />
      );
    case 'spec':
      return (
        <Tabs tabs={[
          { name: 'Spec tree', ...t, body: <SpecTree save={save} commit={commit} onClose={close} /> },
          { name: 'Training', flag: 'training', ...t, body: <TrainingSheet save={save} commit={commit} art={art} /> },
        ]} />
      );
    case 'orders':
      return (
        <Tabs tabs={[
          { name: 'Places', ...t, body: chapters },
          { name: 'Special', flag: 'chefsSpecial', ...t, body: <PreviewSheet kind="special" art={art} /> },
          { name: 'Calendar', ...t, body: <CalendarSheet save={save} commit={commit} art={art} now={now} go={() => walkTo('pantry')} /> },
        ]} />
      );
    case 'kopi':
      return <KopiMeal save={save} commit={commit} onClose={close} />;
    case 'exit':
      return chapters;
    case 'settings':
      return (
        <>
          <SettingsSheet save={save} commit={commit} />
          <button type="button" className="gu-btn" data-testid="settings-story" onClick={onStory}>Story</button>
          <button type="button" className="gu-btn" data-testid="settings-old-stall" onClick={onOldStall}>Old stall menu</button>
          <button type="button" className="gu-btn" data-testid="hub-kitchen" onClick={onKitchen}>Kitchen</button>
          {onTune && <button type="button" className="gu-btn" data-testid="hub-tune" onClick={onTune}>Tune</button>}
        </>
      );
  }
}
