// The stall in the morning: the hub scene (scene/hub.webp) with a tappable spot on each prop, the stall level bar and coins on
// top, and the big Start button at the bottom. Each spot opens a sheet (sheets.tsx). The scene is drawn at its own 9:16
// shape from the top of the screen, and the hotspots are percentages of that picture, so they stay on their props on any
// phone; a taller phone gets the floor extended below it (Stall.css), where the Start button sits.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { brandWords } from '@/brand';
import { CONTENT } from '@/content';
import { kannanLevel, kannanXpOf, nextPerk, specPointsOf } from '@/meta/kannan';
import { chapterUnlocked } from '@/meta/chapters';
import { dueMilestone } from '@/meta/milestones';
import type { SaveV2 } from '@/meta/types';

import { DipCollection } from './DipCollection';
import { fmt } from '../format';
import { chestArt, HOTSPOTS, PANELS, readyBadges, unlockBeat, type Panel } from './helpers';
import { SignatureSheet, CalendarSheet, ChestsSheet, GearSheet, IdleSheet, PreviewSheet, RecipeSheet, SettingsSheet, TrainingSheet, type Commit } from './sheets';
import { StallProgress, type Art } from './StallProgress';
import { Visitor } from './Visitor';
import { openFeedback } from '../FeedbackSheet'; // [feedback hook]
import './Stall.css';

export type { Art } from './StallProgress';

/** afterRun: the hub was reached from a run's results, so a due milestone visitor comes to the stall. */
export function StallHub({ save, commit, onStart, onStory, onKitchen, onTune, art, afterRun }: { onTune?: () => void; save: SaveV2; commit: Commit; onStart: (chapterId: string) => void; onStory: () => void; onKitchen: () => void; art: Art; afterRun?: boolean }) {
  // A sheet is a prop's panel, or the settings cog's.
  const [panel, setPanel] = useState<Panel | 'settings' | 'chapters' | 'signature' | 'dips' | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [visitor, setVisitor] = useState(() => (afterRun ? dueMilestone(save) : null));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const perk = nextPerk(kannanLevel(kannanXpOf(save)));
  const badges = readyBadges(save, now);
  const open = (id: Panel | 'settings' | 'chapters' | 'signature' | 'dips') => {
    setNow(new Date());
    setPanel(id);
  };
  const spot = panel && panel !== 'settings' && panel !== 'chapters' && panel !== 'signature' && panel !== 'dips' ? HOTSPOTS[panel] : null;
  const locked = !!spot?.flag && !save.unlocks[spot.flag];
  return (
    <div className="sh-hub" data-testid="stall-hub">
      <div className="sh-scene" data-testid="stall-scene" inert={!!panel || !!visitor}>
        <img className="sh-art" src={art('scene/hub')} alt="Kannan’s morning stall" draggable={false} />
        {/* Every tap area first, then every label: a label is never under another prop's area, so its whole pill is tappable. */}
        {PANELS.map((id) => {
          const { x, y, w, h } = HOTSPOTS[id].box;
          return (
            <button
              key={id}
              type="button"
              className="sh-prop"
              tabIndex={-1}
              aria-hidden="true"
              data-testid={`stall-${id}-prop`}
              data-ready={badges[id] ? '' : undefined}
              onClick={() => open(id)}
              style={{ left: `${x + w / 2}%`, top: `${y + h / 2}%`, width: `${w}%`, height: `${h}%` }}
            />
          );
        })}
        {PANELS.map((id) => {
          const s = HOTSPOTS[id];
          const { x, y, w, h } = s.box;
          const lock = !!s.flag && !save.unlocks[s.flag];
          const badge = badges[id];
          const at = { '--bx': `${x + w / 2}%`, '--by': `${s.pill === 'top' ? y : y + h}%` } as CSSProperties;
          // The label under a prop is the control a screen reader and a keyboard get.
          return (
            <button key={id} type="button" className={`sh-label sh-label--${s.side}`} style={at} data-testid={`stall-${id}`} data-locked={lock || undefined} onClick={() => open(id)}>
              {lock && <img src={art('ui/lock')} alt="Locked" />}
              {s.label}
              {badge && <i className="sh-badge">{badge === true ? '!' : badge}</i>}
            </button>
          );
        })}
        <button type="button" className="gu-btn sh-collection-entry" data-testid="stall-dips" onClick={() => open('dips')}>Dip collection</button>
      </div>
      <header className="sh-top" inert={!!panel || !!visitor}>
        <StallProgress xp={kannanXpOf(save)} art={art} />
        <span className="sh-coins" data-testid="stall-coins">
          <img src={art('ui/coins')} alt="Coins" />
          <span className="gu-shine">{fmt(save.gold)}</span>
        </span>
        <button type="button" className="sh-cog" data-testid="stall-settings" aria-label="Settings" onClick={() => open('settings')}>
          <img src={art('hub/settings')} alt="" />
        </button>
        <span className="sh-spec" data-testid="stall-spec">
          <b>★ {specPointsOf(save)}</b> spec points{perk && <> · Lv {perk.level} perk: {perk.label}</>}
        </span>
      </header>
      <footer className="sh-footer" inert={!!panel || !!visitor}>
        <button type="button" className="gu-btn" data-testid="stall-signature" onClick={() => open('signature')}>
          Signature · {save.unlocks.signature ? CONTENT.breads[save.signatureBread].name : unlockBeat('signature')}
        </button>
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide sh-start" data-testid="stall-start" onClick={() => chapterUnlocked(save, 'hawker-night') ? open('chapters') : onStart(CONTENT.chapters[0].id)}>
          Start
        </button>
        <button type="button" className="gu-btn" data-testid="stall-kitchen" onClick={onKitchen}>{brandWords.words.kitchen}</button>
        {onTune && <button type="button" className="gu-btn" data-testid="stall-tune" onClick={onTune}>Tune</button>}
        <button type="button" className="gu-btn" data-testid="stall-tell" onClick={openFeedback}>
          Tell Kannan
        </button>
      </footer>
      {visitor && <Visitor due={visitor} commit={commit} art={art} onDone={() => setVisitor(null)} />}
      {panel === 'dips' && (
        <Sheet title="Dip collection" icon={art('ui/crown')} onClose={() => setPanel(null)}>
          <DipCollection save={save} art={art} />
        </Sheet>
      )}
      {panel === 'signature' && (
        <Sheet title="Signature" icon={art('ui/crown')} onClose={() => setPanel(null)}>
          <SignatureSheet save={save} commit={commit} art={art} />
        </Sheet>
      )}
      {panel === 'chapters' && (
        <Sheet title="Choose a chapter" onClose={() => setPanel(null)}>
          {CONTENT.chapters.filter(ch => chapterUnlocked(save, ch.id)).map(ch => (
            <button key={ch.id} type="button" className="gu-btn sh-chapter" data-testid={`chapter-${ch.id}`} onClick={() => onStart(ch.id)}>
              <img src={art(ch.background)} alt="" />
              {ch.name}
            </button>
          ))}
        </Sheet>
      )}
      {panel === 'settings' && (
        <Sheet title="Settings" icon={art('hub/settings')} onClose={() => setPanel(null)}>
          <SettingsSheet save={save} commit={commit} />
          <button type="button" className="gu-btn" data-testid="settings-story" onClick={onStory}>Story</button>
        </Sheet>
      )}
      {panel && panel !== 'settings' && panel !== 'chapters' && panel !== 'signature' && panel !== 'dips' && spot && (
        <Sheet title={spot.label} icon={SHEET_ICON[panel as Panel]?.(art)} onClose={() => setPanel(null)}>
          {locked ? (
            <div className="sh-locked" data-testid="stall-locked">
              <img src={art('ui/lock')} alt="" />
              <p>Unlocks: {unlockBeat(spot.flag!)}</p>
              {panel === 'recipes' && <p>Cook evolved breads here from stall level 6.</p>}
              {panel === 'special' && <PreviewSheet kind={panel} art={art} />}
            </div>
          ) : (
            <>
              {panel === 'gear' && <GearSheet save={save} commit={commit} art={art} />}
              {panel === 'training' && <TrainingSheet save={save} commit={commit} art={art} />}
              {panel === 'idle' && <IdleSheet save={save} commit={commit} art={art} now={now} />}
              {panel === 'calendar' && <CalendarSheet save={save} commit={commit} art={art} now={now} go={setPanel} />}
              {panel === 'chests' && <ChestsSheet save={save} commit={commit} art={art} />}
              {panel === 'recipes' && <RecipeSheet save={save} commit={commit} art={art} />}
              {panel === 'special' && <PreviewSheet kind={panel} art={art} />}
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

/** The small picture beside a sheet's title (art that already exists; a panel without one just has no picture). */
const SHEET_ICON: Partial<Record<Panel, (art: (key: string) => string) => string>> = {
  calendar: (art) => art('hub/calendar'),
  idle: (art) => art('hub/tip-jar'),
  training: (art) => art('hub/training'),
  recipes: (art) => art('hub/recipe-book'),
  special: (art) => art('hub/chef-special'),
  chests: (art) => art(chestArt('common')),
  gear: (art) => art('gear/plain-headband'),
};

/** A bottom sheet over a dim: Escape or a tap outside closes it, focus moves in and returns, and Tab stays inside. The hub
 *  behind it is inert while it is open, and focus that falls out of the sheet (the button it was on just disabled itself:
 *  claiming a gift, spending the last coins) is brought back to the sheet. */
function Sheet({ title, icon, onClose, children }: { title: string; icon?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  });
  return (
    <div className="sh-dim" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="gu-sheet sh-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="stall-sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key !== 'Tab') return;
          const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          if (!buttons?.length) return;
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="sh-sheet-head">
          <div className="sh-sheet-title">
            {icon && <img src={icon} alt="" />}
            <h2 className="gu-heading">{title}</h2>
          </div>
          <button type="button" className="gu-btn" data-testid="stall-close" onClick={onClose} aria-label="Close panel">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
