// The game's React DOM overlay: title, HUD, level-up cards, pause sheet, wake-up screen and the stall hub. Mount it inside the
// game root, after the canvas, in a positioned parent: it fills that parent (inset 0). Only its panels, buttons and the modal
// dims take touches; the rest passes through to the canvas. It listens to the hub and calls hub.controls, so the renderer
// never imports it. It is the only writer of SAVE_KEY: every change to progress (the payout on runEnd, the stall's buys,
// the Sound and Haptics toggles) goes through the save store (saveStore.ts).
//
// Flow: title -> (first launch) prologue -> run 1, no hub -> wake-up screen with the payout -> "Daydream again" or "Back to
// stall" -> the hub -> its Start button -> the next run, started with the gear and training the save holds. The title's
// "Intro" link replays the prologue and returns to the title.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import { brandWords } from '@/brand';
import { CONTENT } from '@/content';
import { Tune } from './Tune';
import { isTuned, tuneEnabled } from '../tuneStore';
import { makeRng } from '@/core/rng';
import type { Card, RunResult } from '@/core/types';
import { chapterUnlocked } from '@/meta/chapters';
import { computeLoadout } from '@/meta/loadout';
import { awardBeats, beatsFromRun, finishPrologue, shouldShowPrologue } from '@/meta/story';
import { applyRunResult } from '@/meta/runRewards';
import type { SaveV2 } from '@/meta/types';

import { ASSET_URLS } from '../assets';
import type { AppInfo } from '../appInfo';
import type { Bridge, HapticKind } from '../bridgeTypes';
import type { Hub, HudState } from '../hub';
import { cardView } from './cardText';
import { AnalyticsSwitch, FeedbackLayer, TellButton } from './FeedbackSheet'; // [feedback hook]
import { trackCardPick } from '../telemetry'; // [analytics hook]
import { fmt, useCountUp } from './format';
import { Kitchen } from './Kitchen';
import { RunBuild } from './RunBuild';
import { Prologue } from './Prologue';
import { createSaveStore } from './saveStore';
import { Switch, toggleSetting, type SettingKey } from './settings';
import './GameUi.css';
import { Rewards, type Payout } from './stall/Rewards';
import { StallHub } from './stall/StallHub';

type UiBridge = Pick<Bridge, 'haptic' | 'save' | 'load'>;
type Screen = 'title' | 'stall' | 'run' | 'results' | 'story' | 'kitchen';
type Offer = { n: number; cards: Card[]; rerolls: number; level: number; left: number; laterOk: boolean; first: number };
type Ended = { result: RunResult; line: string; tip: string; newBest: boolean; before: SaveV2; payout: Payout };
type Banner = { n: number; text: string; boss: boolean };
/** One live run. `paid` flips the moment its result is applied, so a repeated runEnd for the same run pays nothing. */
type Ticket = { seed: number; paid: boolean };

const art = (key: string): string => ASSET_URLS[key];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const newSeed = (): number => Math.floor(Math.random() * 0x100000000);
/** The chest roll takes its own random stream (the run's seed, scrambled) so it never mirrors the run's first dice. */
const CHEST_SALT = 0x5bd1e995;

/** Dev/test URL switches that must never write progress. */
const devRun = (): boolean => typeof window !== 'undefined' && /[?&](at|god)=/.test(window.location.search);

/** Haptics follow the Haptics setting. A device without a vibrator just ignores the call. */
function buzz(bridge: UiBridge, on: boolean, kind: HapticKind): void {
  if (on) bridge.haptic(kind).catch(() => {});
}

export function GameUi({ hub, bridge, info }: { hub: Hub; bridge: UiBridge; info?: AppInfo }) {
  const chapter = useRef(CONTENT.chapters[0].id);
  const runHud = useRef<HudState | null>(null);
  const [pausedHud, setPausedHud] = useState<HudState | null>(null);
  const [screen, setScreen] = useState<Screen>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('kitchen') === '1' ? 'kitchen' : 'title');
  /** Where the prologue goes when it ends: null for the first-run path (run 1 starts), else the screen that asked for it. */
  const storyReturn = useRef<Screen | null>(null);
  const [runId, setRunId] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const batch = useRef({ first: 0, left: 0 });
  const [paused, setPaused] = useState(false);
  const [tuneOn] = useState(tuneEnabled);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [ended, setEnded] = useState<Ended | null>(null);
  const [load, setLoad] = useState<{ attempt: number; failed: boolean }>({ attempt: 0, failed: false });
  const [sceneReady, setSceneReady] = useState(() => !!hub.controls);
  // The listeners are registered once, so they read the bridge and the live run through refs.
  const bridgeRef = useRef(bridge);
  const ticket = useRef<Ticket | null>(null);
  // GameRoot passes one bridge facade for its whole life (it always calls the newest functions), so the store can keep it.
  const [store] = useState(() => createSaveStore(bridge));
  const save = useSyncExternalStore(store.subscribe, () => store.current, () => null);
  const saveFailed = useSyncExternalStore(store.subscribe, () => store.failed, () => false);

  useEffect(() => {
    bridgeRef.current = bridge;
  });

  // Read the save once (and again on "Try again"). A failed read leaves the game on the title: it must never run on a
  // made-up fresh save, or the first write would wipe the real one.
  useEffect(() => {
    let live = true;
    store.load().then(
      () => live && setLoad((l) => (l.failed ? { ...l, failed: false } : l)),
      () => live && setLoad((l) => ({ ...l, failed: true })),
    );
    return () => {
      live = false;
    };
  }, [store, load.attempt]);

  // The renderer answers (hub.controls) a moment after the page opens; the title waits for it.
  useEffect(() => {
    if (sceneReady) return;
    const timer = window.setInterval(() => {
      if (hub.controls) {
        setSceneReady(true);
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [hub, sceneReady]);

  useEffect(() => {
    const offs = [
      hub.on('hud', (snapshot) => { runHud.current = snapshot; }),
      hub.on('kitchenStart', () => { ticket.current = null; setOffer(null); setPaused(false); setEnded(null); setScreen('kitchen'); }),
      hub.on('runStart', ({ seed }) => {
        ticket.current = { seed, paid: false };
        runHud.current = null;
        batch.current = { first: 0, left: 0 };
        setScreen('run');
        setOffer(null);
        setPaused(false);
        setEnded(null);
        setRunId((n) => n + 1);
      }),
      // The renderer held the run on its own (the app went to the background): show the pause sheet.
      hub.on('paused', () => { setPausedHud(runHud.current); setPaused(true); }),
      hub.on('levelUp', ({ offer: cards, rerolls, level, left = 1, laterOk = false }) =>
        // `first` remembers how many were waiting when this batch opened, so the header can say "Pick 2 of 3".
        setOffer((prev) => {
          // A pick that leaves fewer waiting continues the batch; anything else starts one.
          const b = batch.current;
          batch.current = b.left > left ? { first: b.first, left } : { first: left, left };
          return { n: (prev?.n ?? 0) + 1, cards, rerolls, level, left, laterOk, first: batch.current.first };
        }),
      ),
      hub.on('runEnd', (result) => {
        // Exactly once per run: the ticket is spent before anything else happens, so a second runEnd for the same run
        // (a double tap on End run, a re-render, a replayed event) finds it paid and stops here.
        const t = ticket.current;
        const before = store.current;
        if (!t || t.paid || !before) return;
        t.paid = true;
        const paid = applyRunResult(before, result, makeRng((t.seed ^ CHEST_SALT) >>> 0), new Date());
        const payout = { ...paid, save: awardBeats(paid.save, beatsFromRun(before, result)) };
        if (!devRun()) store.commit(() => payout.save); // ?at / ?god runs never touch the save
        setEnded({
          result,
          line: pick(result.won ? CONTENT.lines.win : CONTENT.lines.wake),
          tip: pick(CONTENT.lines.tips),
          newBest: result.wave > before.bestWave,
          before,
          payout,
        });
        setScreen('results');
        setOffer(null);
        setPaused(false);
        buzz(bridgeRef.current, payout.save.settings.haptics, result.won ? 'success' : 'heavy');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [hub, store]);

  const [returned, setReturned] = useState(false); // the stall was reached from a run's results: a milestone visitor may come
  const enterKitchen = () => { setReturned(false); ticket.current = null; setOffer(null); setPaused(false); setEnded(null); hub.controls?.quit(); setScreen('kitchen'); };

  const toggle = (key: SettingKey) => store.commit(toggleSetting(key));

  /** A fresh run with whatever the stall holds right now (the newest save, so a purchase a moment ago counts). */
  const start = (chapterId = chapter.current) => {
    setReturned(false);
    const cur = store.current;
    if (cur) {
      chapter.current = chapterUnlocked(cur, chapterId) ? chapterId : CONTENT.chapters[0].id;
      hub.controls?.start(newSeed(), computeLoadout(cur, CONTENT), chapter.current);
    }
  };
  const pause = () => {
    hub.controls?.pause();
    setPausedHud(runHud.current);
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
    hub.controls?.resume();
  };
  const restart = () => {
    setPaused(false);
    start();
  };
  // Ending a live run wakes Kannan early: the renderer reports it as a lost run (runEnd), which pays and shows the results.
  const quit = () => {
    setPaused(false);
    hub.controls?.quit();
  };
  const pickCard = (i: number) => {
    trackCardPick(offer?.cards[i]); // [analytics hook]
    setOffer(null);
    buzz(bridgeRef.current, store.current?.settings.haptics ?? true, 'light');
    hub.controls?.choose(i);
  };
  const toStall = () => {
    setEnded(null);
    setReturned(true);
    setScreen('stall');
    hub.controls?.quit(); // the run is over: this only clears its frozen frame
  };
  // First-time players see the skippable story before run 1; returning players open the stall.
  const begin = () => {
    if (!save) return;
    if (shouldShowPrologue(save)) {
      storyReturn.current = null;
      setScreen('story');
    } else if (save.runs === 0) start();
    else setScreen('stall');
  };

  const version = buildLabel(info);

  return (
    <div className="gu-root" data-testid="game-ui">
      {saveFailed && (
        <div className="sh-save-error" role="alert" data-testid="save-error">
          <span>Progress needs saving.</span>
          <button type="button" className="gu-btn" onClick={() => void store.retry()}>
            Retry save
          </button>
        </div>
      )}
      {screen === 'title' && (
        <Title
          best={save?.bestWave ?? 0}
          firstRun={!save || save.runs === 0}
          state={load.failed ? 'failed' : save && sceneReady ? 'ready' : 'loading'}
          version={version}
          onStart={begin}
          onIntro={() => { storyReturn.current = 'title'; setScreen('story'); }}
          onRetry={() => setLoad((l) => ({ attempt: l.attempt + 1, failed: false }))}
        />
      )}
      {screen === 'stall' && save && <StallHub onTune={tuneOn ? () => setTuneOpen(true) : undefined} save={save} commit={store.commit} onStart={start} onKitchen={enterKitchen} onStory={() => { storyReturn.current = 'stall'; setScreen('story'); }} art={art} afterRun={returned} />}
      {screen === 'kitchen' && <Kitchen hub={hub} ready={sceneReady} onStart={() => { ticket.current = null; }} onExit={() => setScreen(save ? 'stall' : 'title')} />}
      {screen === 'story' && <Prologue onDone={() => {
        store.commit(finishPrologue);
        if (storyReturn.current) setScreen(storyReturn.current);
        else start();
      }} />}
      {screen === 'run' && typeof window !== 'undefined' && /[?&]god=1/.test(window.location.search) && <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 50, font: '700 11px sans-serif', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 6px', borderRadius: 6, pointerEvents: 'none' }}>God</div>}
      {screen === 'run' && (
        <Hud key={runId} hub={hub} firstRun={save?.runs === 0} modal={!!offer || paused} onPause={pause} />
      )}
      {screen === 'run' && offer && (
        <LevelUp offer={offer} onPick={pickCard} onReroll={() => hub.controls?.reroll()} onLater={() => { hub.controls?.deferPicks(); batch.current = { first: 0, left: 0 }; setOffer(null); }} />
      )}
      {screen === 'run' && paused && !tuneOpen && (
        <Pause
          hud={pausedHud}
          version={version}
          sound={save?.settings.sfx ?? true}
          music={save?.settings.music ?? true}
          haptics={save?.settings.haptics ?? true}
          onResume={resume}
          onRestart={restart}
          onQuit={quit}
          onToggle={toggle}
          onTune={tuneOn ? () => setTuneOpen(true) : undefined}
        />
      )}
      {tuneOpen && <Tune onClose={() => setTuneOpen(false)} />}
      {screen === 'results' && ended && <Results ended={ended} onAgain={() => start()} onStall={toStall} />}
      <FeedbackLayer hub={hub} screen={screen} /> {/* [feedback hook] */}
    </div>
  );
}

type TitleState = 'loading' | 'ready' | 'failed';

/** The build, for the title and the pause sheet: the app's version, then the update the phone runs (or the platform on web). */
function buildLabel(info?: AppInfo): string | null {
  if (!info?.version) return null;
  const update = info.updateId ? (info.updateId === 'built-in' ? 'built-in' : info.updateId.slice(0, 8)) : info.platform;
  return `v${info.version} · ${update}`;
}

function Title({ best, firstRun, state, version, onStart, onIntro, onRetry }: {
  best: number; firstRun: boolean; state: TitleState; version: string | null; onStart: () => void; onIntro: () => void; onRetry: () => void;
}) {
  const label = state === 'failed' ? 'Try again' : state === 'loading' ? 'Warming the tawa…' : firstRun ? 'Start' : 'Continue';
  return (
    <div className="gu-splash">
      <img className="gu-cover" src={art('scene/hero')} alt="" />
      <header className="gu-splash-top">
        <img className="gu-logo" src={art('ui/logo')} alt={brandWords.appName} />
        {best > 0 && <p className="gu-chip">Best: wave {best}</p>}
        <div className="gu-title-tools">
          {state === 'ready' && <button type="button" className="gu-link" data-testid="title-intro" onClick={onIntro}>Intro</button>}
          {version && <span className="gu-version" data-testid="build-version">{version}</span>}
        </div>
      </header>
      <footer className="gu-splash-foot">
        <p className="gu-chip" role={state === 'failed' ? 'alert' : undefined}>
          {state === 'failed' ? 'Couldn’t open your saved game.' : 'Kannan zones out over the tawa…'}
        </p>
        <button
          type="button"
          className="gu-start"
          disabled={state === 'loading'}
          aria-label={label}
          data-testid="ui-start"
          data-state={state}
          onClick={state === 'failed' ? onRetry : onStart}
        >
          {label}
        </button>
      </footer>
    </div>
  );
}

function Hud({ hub, firstRun, modal, onPause }: { hub: Hub; firstRun: boolean; modal: boolean; onPause: () => void }) {
  const [hud, setHud] = useState<HudState | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hint, setHint] = useState(firstRun);
  // Every drop in HP (a bite, a shot, a boss hit) flashes and shakes the HP pill once. The two names alternate, so the same
  // CSS animation restarts on the next hit without the pill being rebuilt.
  const [hits, setHits] = useState(0);
  const lastHp = useRef<number | null>(null);

  useEffect(() => {
    const offs = [
      hub.on('hud', (h) => {
        const before = lastHp.current;
        lastHp.current = h.hp;
        if (before !== null && h.hp < before - 0.01) setHits((n) => n + 1);
        setHud(h);
      }),
      hub.on('waveStart', ({ wave }) =>
        setBanner((b) => ({ n: (b?.n ?? 0) + 1, text: `Wave ${wave}`, boss: false })),
      ),
      hub.on('boss', ({ name }) => setBanner((b) => ({ n: (b?.n ?? 0) + 1, text: name, boss: true }))),
    ];
    return () => offs.forEach((off) => off());
  }, [hub]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 1500);
    return () => window.clearTimeout(t);
  }, [banner]);

  // The first drag dismisses the hint. Listening on window in the capture phase sees the canvas's pointer moves
  // without the overlay ever taking them.
  useEffect(() => {
    if (!hint) return;
    const stop = () => setHint(false);
    window.addEventListener('pointermove', stop, { capture: true, once: true, passive: true });
    return () => window.removeEventListener('pointermove', stop, { capture: true });
  }, [hint]);

  return (
    <div className="gu-hud">
      {hud && (
        <>
          <div className="gu-topbar">
            <div className="gu-ribbon">
              <img src={art('ui/ribbon')} alt="" />
              <span>{hud.route ? hud.route.name : `Wave ${Math.max(1, hud.wave)}/${hud.waves}`}</span>
            </div>
            <div className="gu-gold" aria-label={`${hud.gold} gold`}>
              <img src={art('ui/coins')} alt="" />
              <span className="gu-shine">{fmt(hud.gold)}</span>
            </div>
            {isTuned() && <span className="gu-version" data-testid="tuned-badge" style={{ position: 'absolute', top: 2, left: 2, background: '#E8702A', color: '#fff', borderRadius: 6, padding: '0 6px' }}>Tuned</span>}
            <button type="button" className="gu-pause" aria-label="Pause" data-testid="ui-pause" onClick={onPause}>
              <img src={art('ui/pause')} alt="" />
            </button>
          </div>
          {hud.route && (
            <div className="gu-xp" data-testid="route-progress">
              <span className="gu-level">
                {Math.round(hud.route.dist)} m / {hud.route.bossAt} m
              </span>
              <Bar pct={hud.route.dist / hud.route.bossAt} />
            </div>
          )}
          {hud.pendingPicks > 0 && (
            <button type="button" className="gu-chip gu-pick-chip" data-testid="pick-chip" onClick={() => hub.controls?.openPicks()}>
              Pick ready ★{hud.pendingPicks}
            </button>
          )}
          <div className="gu-xp">
            <span className="gu-level">Lv {hud.level}</span>
            <Bar pct={hud.xp / hud.xpToNext} />
            <span className="gu-dps" data-testid="run-dps" aria-label={`Shown damage per second: ${hud.shownDps.toFixed(1)}`}>DPS <b>{hud.shownDps.toFixed(1)}</b></span>
          </div>
          {hud.boss && (
            <div className="gu-boss">
              <img src={art(hud.boss.sprite)} alt="" data-testid="boss-portrait" />
              <div className="gu-boss-body">
                <span className="gu-boss-name">{hud.boss.name}</span>
                <Bar pct={hud.boss.hp / hud.boss.maxHp} tone="boss" />
              </div>
            </div>
          )}
          <div className="gu-hp" data-hit={hits === 0 ? undefined : hits % 2 ? 'a' : 'b'} aria-label={`${Math.max(0, Math.ceil(hud.hp))} of ${hud.maxHp} HP`}>
            <img src={art('ui/heart')} alt="" />
            <Bar pct={hud.hp / hud.maxHp} tone="hp" />
            <span>{Math.max(0, Math.ceil(hud.hp))}</span>
          </div>
        </>
      )}
      {banner && (
        <div key={banner.n} className={banner.boss ? 'gu-banner gu-banner--boss' : 'gu-banner'} role="status">
          {banner.boss && <img src={art('ui/ribbon')} alt="" />}
          <span>{banner.text}</span>
        </div>
      )}
      {hint && !modal && <p className="gu-hint">Drag to move · stop to throw</p>}
    </div>
  );
}

function Bar({ pct, tone = 'xp' }: { pct: number; tone?: 'xp' | 'hp' | 'boss' }) {
  return (
    <span className={`gu-bar gu-bar--${tone}`}>
      <i style={{ width: `${clamp01(pct) * 100}%` }} />
    </span>
  );
}

function LevelUp({ offer, onPick, onReroll, onLater }: { offer: Offer; onPick: (i: number) => void; onReroll: () => void; onLater: () => void }) {
  return (
    <div className="gu-modal">
      <section className="gu-levelup" role="dialog" aria-label={`Level ${offer.level}: pick a card`}>
        <h2 className="gu-heading">Level {offer.level}!</h2>
        {offer.first > 1 && <p className="gu-pick-count" data-testid="pick-count">Pick {offer.first - offer.left + 1} of {offer.first}</p>}
        <div className="gu-cards" key={offer.n}>
          {offer.cards.map((card, i) => (
            <CardButton key={i} card={card} index={i} onPick={() => onPick(i)} />
          ))}
        </div>
        {offer.rerolls > 0 && (
          <button type="button" className="gu-btn gu-btn--cream" data-testid="ui-reroll" onClick={onReroll}>
            Reroll ×{offer.rerolls}
          </button>
        )}
        {offer.laterOk && (
          <button type="button" className="gu-btn gu-btn--cream" data-testid="ui-later" onClick={onLater}>
            Later{offer.left > 1 ? ` (${offer.left} waiting)` : ''}
          </button>
        )}
      </section>
    </div>
  );
}

function CardButton({ card, index, onPick }: { card: Card; index: number; onPick: () => void }) {
  const [revealed, setRevealed] = useState(index === 0);
  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), index * 150);
    return () => window.clearTimeout(timer);
  }, [index]);
  const v = cardView(card);
  return (
    <button
      type="button"
      className="gu-card"
      data-kind={card.kind}
      disabled={!revealed}
      data-revealed={revealed}
      data-testid={`ui-card-${index}`}
      aria-label={v.label}
      style={{ '--i': index, borderImageSource: `url("${art(v.frame)}")` } as CSSProperties}
      onClick={onPick}
    >
      <img className="gu-card-art" src={art(v.sprite)} alt="" />
      <span className="gu-card-text">
        <span className="gu-card-name">{v.name}</span>
        {v.badge && (
          <span className={v.badge === 'NEW' || v.badge === 'EVOLVE' ? 'gu-badge' : 'gu-pips'} aria-hidden="true">
            {v.badge}
          </span>
        )}
        <span className="gu-card-line">{v.effect ?? v.line}</span>
        {v.scope && <span className="gu-card-scope">{v.scope}</span>}
        {v.family && <span className="gu-card-meta">{v.family}</span>}
        {v.fit && <span className="gu-card-meta">{v.fit}</span>}
        {v.bonus && <span className="gu-card-meta">{v.bonus}</span>}
      </span>
    </button>
  );
}

function Pause({
  hud,
  version,
  sound,
  music,
  haptics,
  onResume,
  onRestart,
  onQuit,
  onToggle,
  onTune,
}: {
  hud: HudState | null;
  version: string | null;
  sound: boolean;
  music: boolean;
  haptics: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onToggle: (key: SettingKey) => void;
  onTune?: () => void;
}) {
  const [build, setBuild] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  useEffect(() => { sheet.current?.querySelector<HTMLElement>('[data-focus]')?.focus(); }, [build]);
  return (
    <div className="gu-modal">
      <section ref={sheet} className={`gu-sheet gu-pause-sheet${build ? ' gu-pause-sheet--build' : ''}`} role="dialog" aria-modal="true" aria-label={build ? 'Current build' : 'Paused'} onKeyDown={e => {
        if (e.key === 'Escape') { if (build) setBuild(false); else onResume(); }
        if (e.key !== 'Tab') return;
        const controls = sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }}>
        {build && hud ? <>
          <header className="gu-build-heading"><h2 className="gu-heading">Current build</h2><button type="button" className="gu-btn" data-focus data-testid="build-back" onClick={() => setBuild(false)}>Back</button></header>
          <RunBuild hud={hud} />
          <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="build-resume" onClick={onResume}>Resume</button>
        </> : <>
        <h2 className="gu-heading">Paused</h2>
        <button type="button" className="gu-btn gu-btn--wide" data-focus data-testid="ui-build" disabled={!hud} onClick={() => setBuild(true)}>Current build & stats</button>
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="ui-resume" onClick={onResume}>
          Resume
        </button>
        <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-restart" onClick={onRestart}>
          Restart run
        </button>
        <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-quit" onClick={onQuit}>
          End run
        </button>
        <TellButton />
        {onTune && <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-tune" onClick={onTune}>Tune</button>}
        <div className="gu-switches">
          <Switch label="Sound" on={sound} onClick={() => onToggle('sfx')} />
          <Switch label="Music" on={music} onClick={() => onToggle('music')} />
          <Switch label="Haptics" on={haptics} onClick={() => onToggle('haptics')} />
          <AnalyticsSwitch />
        </div>
        </>}
        {version && <p className="gu-version" data-testid="build-version">{version}</p>}
      </section>
    </div>
  );
}

function Results({ ended, onAgain, onStall }: { ended: Ended; onAgain: () => void; onStall: () => void }) {
  const r = ended.result;
  const { paid } = ended.payout.rewards;
  const dist = useCountUp(r.dist ?? r.wave);
  const kills = useCountUp(r.kills);
  const coins = useCountUp(ended.payout.rewards.gold);
  const xp = useCountUp(ended.payout.rewards.kannanXp || ended.payout.rewards.stallXp);
  return (
    <div className="gu-results" data-testid="results">
      <img className="gu-results-art" src={art('scene/wake')} alt="" />
      <section className="gu-panel gu-results-panel sh-result-panel">
        <div className="sh-result-body">
          <h2 className="gu-wake">{ended.line}</h2>
          {ended.newBest && paid && <span className="gu-newbest">New best!</span>}
          <dl className={paid ? 'gu-stats gu-stats--five' : 'gu-stats gu-stats--three'}>
            <div>
              <dt>{r.dist !== undefined ? 'Metres' : 'Waves'}</dt>
              <dd>{fmt(dist)}</dd>
            </div>
            <div>
              <dt>Kills</dt>
              <dd>{fmt(kills)}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{r.level}</dd>
            </div>
            {paid && (
              <>
                <div>
                  <dt>Coins</dt>
                  <dd data-testid="results-coins" className="gu-shine">+{fmt(coins)}</dd>
                </div>
                <div>
                  <dt>XP</dt>
                  <dd data-testid="results-xp">+{fmt(xp)}</dd>
                </div>
              </>
            )}
          </dl>
          {paid ? (
            <Rewards before={ended.before} payout={ended.payout} art={art} />
          ) : (
            <p className="sh-short" role="status" data-testid="results-short">
              Too short a daydream — no tips this time
            </p>
          )}
          <p className="gu-tip">
            <b>Tip:</b> {ended.tip}
          </p>
        </div>
        <div className="sh-result-actions">
          <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="ui-again" autoFocus onClick={onAgain}>
            Daydream again
          </button>
          <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-stall" onClick={onStall}>
            Back to stall
          </button>
        </div>
      </section>
      <div className="fb-results-tell">
        <TellButton />
      </div>
    </div>
  );
}
