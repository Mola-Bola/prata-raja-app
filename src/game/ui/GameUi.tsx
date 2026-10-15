// The game's React DOM overlay: title, HUD, level-up cards, pause sheet, wake-up screen and the stall hub. Mount it inside the
// game root, after the canvas, in a positioned parent: it fills that parent (inset 0). Only its panels, buttons and the modal
// dims take touches; the rest passes through to the canvas. It listens to the hub and calls hub.controls, so the renderer
// never imports it. It is the only writer of SAVE_KEY: every change to progress (the payout on runEnd, the stall's buys,
// the Sound and Haptics toggles) goes through the save store (saveStore.ts).
//
// Flow: title -> (first launch) prologue -> run 1, no hub -> wake-up screen with the payout -> "Daydream again" or "Back to
// stall" -> the hub -> GO -> the next run, started with the gear and training the save holds. The prologue replays from the hub's
// Settings and returns to the hub.
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
import { cardView, findChoice } from './cardText';
import { AnalyticsSwitch, FeedbackLayer, TellButton } from './FeedbackSheet'; // [feedback hook]
import { trackCardPick } from '../telemetry'; // [analytics hook]
import { fmt, useCountUp } from './format';
import { Kitchen } from './Kitchen';
import { FreeRunHud } from './run/FreeRunHud';
import { RunBuild } from './RunBuild';
import { Prologue } from './Prologue';
import { createSaveStore } from './saveStore';
import { Switch, toggleSetting, type SettingKey } from './settings';
import './system';
import './GameUi.css';
import { beaten, loadBest, type BestRun } from './bestRun';
import { Rewards, RewardDetails, nextLine, type Payout } from './stall/Rewards';
import { HubOverlay } from './hub/HubOverlay';

type UiBridge = Pick<Bridge, 'haptic' | 'save' | 'load'>;
type Screen = 'title' | 'hub' | 'run' | 'results' | 'story' | 'kitchen';
type Offer = { n: number; cards: Card[]; rerolls: number; level: number; left: number; first: number; find?: boolean };
type Ended = { result: RunResult; line: string; tip: string; newBest: boolean; before: SaveV2; payout: Payout };
type Banner = { n: number; text: string; boss: boolean };
/** One live run. `paid` flips the moment its result is applied, so a repeated runEnd for the same run pays nothing. */
type Ticket = { seed: number; paid: boolean };

const art = (key: string): string => ASSET_URLS[key];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
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
  const [best, setBest] = useState<BestRun | null>(null);
  const bestRef = useRef<BestRun | null>(null);
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

  useEffect(() => {
    let live = true;
    void loadBest().then((b) => { if (live && b && !bestRef.current) { bestRef.current = b; setBest(b); } });
    return () => { live = false; };
  }, []);

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
      hub.on('levelUp', ({ offer: cards, rerolls, level, left = 1, find }) =>
        // `first` remembers how many were waiting when this batch opened, so the header can say "Pick 2 of 3".
        setOffer((prev) => {
          // A pick that leaves fewer waiting continues the batch; anything else starts one.
          const b = batch.current;
          batch.current = b.left > left ? { first: b.first, left } : { first: left, left };
          return { n: (prev?.n ?? 0) + 1, cards, rerolls, level, left, first: batch.current.first, find };
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
        const prevBest = bestRef.current;
        const nowBest = devRun() ? null : beaten(prevBest, result.dist ?? 0, result.chapterId ?? chapter.current);
        if (nowBest) { bestRef.current = nowBest; setBest(nowBest); }
        setEnded({
          result,
          line: pick(result.won ? CONTENT.lines.win : CONTENT.lines.wake),
          tip: pick(CONTENT.lines.tips),
          newBest: !!nowBest && !!prevBest && paid.rewards.paid,
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
    setScreen('hub');
    hub.controls?.quit(); // the run is over: this only clears its frozen frame
  };
  // First-time players see the skippable story before run 1; returning players open the stall.
  const begin = () => {
    if (!save) return;
    if (shouldShowPrologue(save)) {
      storyReturn.current = null;
      setScreen('story');
    } else if (save.runs === 0) start();
    else setScreen('hub');
  };

  // The walkable hub shows its scene (the run scene sleeps).
  useEffect(() => {
    if (screen === 'hub') hub.controls?.hubEnter?.();
  }, [screen, hub]);

  const version = buildLabel(info);

  return (
    <div className="gu-root" data-testid="game-ui">
      {saveFailed && (
        <div className="sh-save-error" role="alert" data-testid="save-error">
          <span>Progress needs saving.</span>
          <button type="button" className="u-plain" onClick={() => void store.retry()}>
            Retry save
          </button>
        </div>
      )}
      {screen === 'title' && (
        <Title
          best={best}
          firstRun={!save || save.runs === 0}
          state={load.failed ? 'failed' : save && sceneReady ? 'ready' : 'loading'}
          version={version}
          onStart={begin}
          onRetry={() => setLoad((l) => ({ attempt: l.attempt + 1, failed: false }))}
        />
      )}
      {screen === 'hub' && save && <HubOverlay hub={hub} save={save} commit={store.commit} art={art} afterRun={returned} onStart={start} onKitchen={enterKitchen} onTune={tuneOn ? () => setTuneOpen(true) : undefined} onStory={() => { storyReturn.current = 'hub'; setScreen('story'); }} />}
      {screen === 'kitchen' && <Kitchen hub={hub} ready={sceneReady} onStart={() => { ticket.current = null; }} onExit={() => setScreen(save ? 'hub' : 'title')} />}
      {screen === 'story' && <Prologue onDone={() => {
        store.commit(finishPrologue);
        if (storyReturn.current) setScreen(storyReturn.current);
        else start();
      }} />}
      {screen === 'run' && typeof window !== 'undefined' && /[?&]god=1/.test(window.location.search) && <div className="gu-god">God</div>}
      {screen === 'run' && (
        <Hud key={runId} hub={hub} modal={!!offer || paused} onPause={pause} />
      )}
      {screen === 'run' && offer?.find && <FindChoice offer={offer} onPick={pickCard} />}
      {screen === 'run' && offer && !offer.find && (
        <LevelUp offer={offer} onPick={pickCard} onReroll={() => hub.controls?.reroll()} />
      )}
      {screen === 'run' && paused && !tuneOpen && (
        <Pause
          hud={pausedHud}
          version={version}
          sound={save?.settings.sfx ?? true}
          music={save?.settings.music ?? true}
          haptics={save?.settings.haptics ?? true}
          onResume={resume}
          onQuit={quit}
          onToggle={toggle}
          onTune={tuneOn ? () => setTuneOpen(true) : undefined}
        />
      )}
      {tuneOpen && <Tune onClose={() => setTuneOpen(false)} />}
      {screen === 'results' && ended && <Results ended={ended} best={best} onAgain={() => start()} onStall={toStall} />}
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

function Title({ best, firstRun, state, version, onStart, onRetry }: {
  best: BestRun | null; firstRun: boolean; state: TitleState; version: string | null; onStart: () => void; onRetry: () => void;
}) {
  const label = state === 'failed' ? 'Try again' : state === 'loading' ? 'Warming the tawa…' : firstRun ? 'Start' : 'Continue';
  const chapter = best && CONTENT.chapters.find((c) => c.id === best.chapterId)?.name;
  return (
    <div className="gu-splash">
      <img className="gu-cover" src={art('scene/hero')} alt="" />
      <header className="gu-splash-top">
        <img className="gu-logo" src={art('ui/logo')} alt={brandWords.appName} />
      </header>
      <footer className="gu-splash-foot">
        {state === 'failed' && <p className="gu-pill" role="alert">Couldn’t open your saved game.</p>}
        {state === 'ready' && !firstRun && best && <p className="gu-pill" data-testid="title-best">Best {fmt(best.metres)} m{chapter ? ` · ${chapter}` : ''}</p>}
        <button
          type="button"
          className="u-go gu-start"
          disabled={state === 'loading'}
          aria-label={label}
          data-testid="ui-start"
          data-state={state}
          onClick={state === 'failed' ? onRetry : onStart}
        >
          {label}
        </button>
        {version && <span className="gu-version" data-testid="build-version">{version}</span>}
      </footer>
    </div>
  );
}

function Hud({ hub, modal, onPause }: { hub: Hub; modal: boolean; onPause: () => void }) {
  const [hud, setHud] = useState<HudState | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  // The run starts with a hint: shown for three seconds once the first frame arrives, then gone.
  const [freeHint, setFreeHint] = useState(false);
  const hinted = useRef(false);
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

  const live = !!hud;
  useEffect(() => {
    if (!live || hinted.current) return;
    hinted.current = true;
    setFreeHint(true);
    const t = window.setTimeout(() => setFreeHint(false), 3000);
    return () => window.clearTimeout(t);
  }, [live]);

  return (
    <div className="gu-hud gu-hud--free">
      {hud && (
        <>
          {isTuned() && <span className="gu-tuned" data-testid="tuned-badge">Tuned</span>}
          <FreeRunHud hud={hud} hits={hits} hub={hub} onPause={onPause} />
        </>
      )}
      {banner && (
        <div key={banner.n} className={banner.boss ? 'gu-banner gu-banner--boss' : 'gu-banner'} role="status">
          {banner.boss && <img src={art('ui/ribbon')} alt="" />}
          <span>{banner.text}</span>
        </div>
      )}
      {!modal && freeHint && <p className="gu-hint" data-testid="free-hint">Drag anywhere to move · auto-throw</p>}
    </div>
  );
}

function LevelUp({ offer, onPick, onReroll }: { offer: Offer; onPick: (i: number) => void; onReroll: () => void }) {
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
          <button type="button" className="u-plain" data-testid="ui-reroll" onClick={onReroll}>
            Reroll ×{offer.rerolls}
          </button>
        )}
      </section>
    </div>
  );
}

/** Free mode: Kannan walked into a tiffin. Three cards, no timer; a tap picks one and the run resumes after a short beat. */
const FIND_BEAT_MS = 300;
function FindChoice({ offer, onPick }: { offer: Offer; onPick: (i: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    if (picked === null) return;
    const timer = window.setTimeout(() => onPick(picked), FIND_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="gu-modal" data-testid="find-choice">
      <section className="gu-levelup" role="dialog" aria-label="A regular left you a tiffin. Pick one.">
        <h2 className="gu-heading gu-find-title">A regular left you a tiffin — pick one</h2>
        <div className="gu-cards" key={offer.n}>
          {offer.cards.map((card, i) => {
            const v = findChoice(card);
            return (
              <button
                key={i}
                type="button"
                className="gu-card"
                data-kind={card.kind}
                data-picked={picked === null ? undefined : picked === i}
                disabled={picked !== null}
                data-testid={`find-card-${i}`}
                aria-label={v.label}
                style={{ '--i': i, borderImageSource: `url("${art(v.frame)}")` } as CSSProperties}
                onClick={() => setPicked(i)}
              >
                <img className="gu-card-art" src={art(v.sprite)} alt="" />
                <span className="gu-card-text">
                  <span className="gu-card-name">{v.name}</span>
                  <span className={v.tag.startsWith('NEW') ? 'gu-badge' : 'gu-pips'}>{v.tag}</span>
                  <span className="gu-card-line">{v.line}</span>
                </span>
              </button>
            );
          })}
        </div>
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

type PauseView = 'main' | 'build' | 'settings';

function Pause({
  hud,
  version,
  sound,
  music,
  haptics,
  onResume,
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
  onQuit: () => void;
  onToggle: (key: SettingKey) => void;
  onTune?: () => void;
}) {
  const [view, setView] = useState<PauseView>('main');
  const [confirm, setConfirm] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  useEffect(() => { sheet.current?.querySelector<HTMLElement>('[data-focus]')?.focus(); }, [view, confirm]);
  const back = () => { setView('main'); setConfirm(false); };
  return (
    <div className="gu-modal">
      <section ref={sheet} className={`gu-sheet gu-pause-sheet u-sheet-in${view === 'build' ? ' gu-pause-sheet--build' : ''}`} role="dialog" aria-modal="true" aria-label={view === 'build' ? 'Current build' : view === 'settings' ? 'Settings' : 'Paused'} onKeyDown={e => {
        if (e.key === 'Escape') { if (view !== 'main') back(); else onResume(); }
        if (e.key !== 'Tab') return;
        const controls = sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }}>
        {view === 'build' && hud ? <>
          <header className="gu-build-heading"><h2 className="gu-heading">Build &amp; stats</h2><button type="button" className="u-plain" data-focus data-testid="build-back" onClick={back}>Back</button></header>
          <RunBuild hud={hud} />
          <button type="button" className="u-go u-wide" data-testid="build-resume" onClick={onResume}>Resume</button>
        </> : view === 'settings' ? <>
          <h2 className="gu-heading">Settings</h2>
          <div className="gu-switches" data-testid="pause-switches">
            <Switch label="Sound" on={sound} onClick={() => onToggle('sfx')} />
            <Switch label="Music" on={music} onClick={() => onToggle('music')} />
            <Switch label="Haptics" on={haptics} onClick={() => onToggle('haptics')} />
            <AnalyticsSwitch />
          </div>
          <TellButton />
          {onTune && <button type="button" className="u-plain u-wide" data-testid="ui-tune" onClick={onTune}>Tune</button>}
          <button type="button" className="u-go u-wide" data-focus data-testid="settings-back" onClick={back}>Back</button>
        </> : <>
          <h2 className="gu-heading">Paused</h2>
          <button type="button" className="u-go u-wide" data-focus data-testid="ui-resume" onClick={onResume}>Resume</button>
          <button type="button" className="u-plain u-wide" data-testid="ui-build" disabled={!hud} onClick={() => setView('build')}>Build &amp; stats</button>
          <button type="button" className="u-plain u-wide" data-testid="ui-settings" onClick={() => setView('settings')}>Settings</button>
          {confirm ? (
            <div className="gu-confirm" role="group" aria-label="End this run?">
              <p>End this run? Your tips so far are kept.</p>
              <button type="button" className="u-plain" data-testid="ui-quit-confirm" onClick={onQuit}>End run</button>
              <button type="button" className="u-go" data-focus data-testid="ui-quit-cancel" onClick={() => setConfirm(false)}>Keep going</button>
            </div>
          ) : (
            <button type="button" className="u-plain u-wide" data-testid="ui-quit" onClick={() => setConfirm(true)}>End run</button>
          )}
        </>}
        {version && <p className="gu-version" data-testid="build-version">{version}</p>}
      </section>
    </div>
  );
}

function Results({ ended, best, onAgain, onStall }: { ended: Ended; best: BestRun | null; onAgain: () => void; onStall: () => void }) {
  const r = ended.result;
  const { paid } = ended.payout.rewards;
  const hero = useCountUp(r.dist ?? r.wave);
  const chapter = CONTENT.chapters.find((c) => c.id === (r.chapterId ?? best?.chapterId))?.name;
  return (
    <div className="gu-results" data-testid="results">
      <img className="gu-results-art" src={art('scene/wake')} alt="" />
      <section className="gu-panel rs-panel">
        <div className="rs-body">
          <h2 className="rs-line">{ended.line}</h2>
          <p className="rs-hero" data-testid="results-metres">
            <b>{fmt(hero)}</b>
            <span>{r.dist !== undefined ? 'metres' : 'waves'}{chapter ? ` · ${chapter}` : ''}</span>
            {ended.newBest && <i className="gu-newbest" data-testid="results-newbest">New best</i>}
          </p>
          {paid ? (
            <Rewards before={ended.before} payout={ended.payout} art={art} />
          ) : (
            <p className="sh-short" role="status" data-testid="results-short">
              Too short a daydream. Go a little further for tips.
            </p>
          )}
          <p className="rs-next" data-testid="results-next">{nextLine(ended.before, ended.payout, paid)}</p>
          <details className="rs-more" data-testid="results-details">
            <summary className="u-link">Details</summary>
            <dl className="rs-stats">
              <div><dt>Kills</dt><dd>{fmt(r.kills)}</dd></div>
              <div><dt>Run level</dt><dd>{r.level}</dd></div>
            </dl>
            {paid && <RewardDetails payout={ended.payout} art={art} />}
            <p className="gu-tip"><b>Tip:</b> {ended.tip}</p>
          </details>
        </div>
        <div className="rs-actions">
          <button type="button" className="u-go" data-testid="ui-again" autoFocus onClick={onAgain}>
            Daydream again
          </button>
          <button type="button" className="u-plain" data-testid="ui-stall" onClick={onStall}>
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
