// The game's React DOM overlay: title, HUD, level-up cards, pause sheet and results. Mount it inside the game root,
// after the canvas, in a positioned parent: it fills that parent (inset 0). Only its panels, buttons and the modal dims
// take touches; the rest passes through to the canvas. It listens to the hub and calls hub.controls, so the renderer
// never imports it. It is the only writer of SAVE_KEY (the payout on runEnd, and the Sound and Haptics toggles).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { CONTENT } from '@/content';
import type { SaveV1 } from '@/core/save';
import { parseSave, recordRun, SAVE_KEY } from '@/core/save';
import type { Card, RunResult } from '@/core/types';

import { ASSET_URLS } from '../assets';
import type { Bridge, HapticKind } from '../bridgeTypes';
import type { Hub, HudState } from '../hub';
import { cardView } from './cardText';
import './GameUi.css';

type UiBridge = Pick<Bridge, 'haptic' | 'save' | 'load'>;
type Screen = 'title' | 'run' | 'results';
type Offer = { n: number; cards: Card[]; rerolls: number; level: number };
type Ended = { result: RunResult; line: string; tip: string; newBest: boolean };
type Banner = { n: number; text: string; boss: boolean };
type Toggle = 'sfx' | 'haptics';

const art = (key: string): string => ASSET_URLS[key];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** A failed write is logged, not thrown: the next write carries the whole save again. */
function writeSave(bridge: UiBridge, save: SaveV1): void {
  bridge.save(SAVE_KEY, JSON.stringify(save)).catch((e: unknown) => console.warn('[ui] save failed', e));
}

/** Haptics follow the Haptics setting. A device without a vibrator just ignores the call. */
function buzz(bridge: UiBridge, on: boolean, kind: HapticKind): void {
  if (on) bridge.haptic(kind).catch(() => {});
}

export function GameUi({ hub, bridge }: { hub: Hub; bridge: UiBridge }) {
  const [screen, setScreen] = useState<Screen>('title');
  const [save, setSave] = useState<SaveV1 | null>(null);
  const [runId, setRunId] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState<Ended | null>(null);
  // The listeners are registered once, so they read the latest save and bridge through refs. Saves are written from
  // the ref, never from state, so two writes in a row cannot race each other.
  const saveRef = useRef<SaveV1 | null>(null);
  const bridgeRef = useRef(bridge);

  useEffect(() => {
    bridgeRef.current = bridge;
  });

  useEffect(() => {
    let live = true;
    bridgeRef.current.load(SAVE_KEY).then(
      (json) => {
        if (!live || saveRef.current) return; // a write may have landed first; it wins
        saveRef.current = parseSave(json);
        setSave(saveRef.current);
      },
      () => {}, // no stored save: the game runs on a fresh one
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const offs = [
      hub.on('runStart', () => {
        setScreen('run');
        setOffer(null);
        setPaused(false);
        setEnded(null);
        setRunId((n) => n + 1);
      }),
      hub.on('levelUp', ({ offer: cards, rerolls, level }) =>
        setOffer((prev) => ({ n: (prev?.n ?? 0) + 1, cards, rerolls, level })),
      ),
      hub.on('runEnd', (result) => {
        const before = saveRef.current ?? parseSave(null);
        const next = recordRun(before, result, new Date());
        setEnded({
          result,
          line: pick(result.won ? CONTENT.lines.win : CONTENT.lines.wake),
          tip: pick(CONTENT.lines.tips),
          newBest: result.wave > before.bestWave,
        });
        setScreen('results');
        setOffer(null);
        setPaused(false);
        saveRef.current = next;
        setSave(next);
        writeSave(bridgeRef.current, next);
        buzz(bridgeRef.current, next.settings.haptics, result.won ? 'success' : 'heavy');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [hub]);

  const toggle = (key: Toggle) => {
    const cur = saveRef.current;
    if (!cur) return;
    const next: SaveV1 = { ...cur, settings: { ...cur.settings, [key]: !cur.settings[key] } };
    saveRef.current = next;
    setSave(next);
    writeSave(bridgeRef.current, next);
  };

  const start = () => hub.controls?.start();
  const pause = () => {
    setPaused(true);
    hub.controls?.pause();
  };
  const resume = () => {
    setPaused(false);
    hub.controls?.resume();
  };
  const restart = () => {
    setPaused(false);
    hub.controls?.start();
  };
  const quit = () => {
    setPaused(false);
    setScreen('title');
    hub.controls?.quit();
  };
  const pickCard = (i: number) => {
    setOffer(null);
    buzz(bridgeRef.current, saveRef.current?.settings.haptics ?? true, 'light');
    hub.controls?.choose(i);
  };
  const toTitle = () => {
    setEnded(null);
    setScreen('title');
    hub.controls?.quit();
  };

  return (
    <div className="gu-root" data-testid="game-ui">
      {screen === 'title' && <Title best={save?.bestWave ?? 0} onStart={start} />}
      {screen === 'run' && (
        <Hud key={runId} hub={hub} firstRun={save?.runs === 0} modal={!!offer || paused} onPause={pause} />
      )}
      {screen === 'run' && offer && (
        <LevelUp offer={offer} onPick={pickCard} onReroll={() => hub.controls?.reroll()} />
      )}
      {screen === 'run' && paused && (
        <Pause
          sound={save?.settings.sfx ?? true}
          haptics={save?.settings.haptics ?? true}
          onResume={resume}
          onRestart={restart}
          onQuit={quit}
          onToggle={toggle}
        />
      )}
      {screen === 'results' && ended && <Results ended={ended} onAgain={start} onTitle={toTitle} />}
    </div>
  );
}

function Title({ best, onStart }: { best: number; onStart: () => void }) {
  return (
    <div className="gu-splash">
      <img className="gu-cover" src={art('scene/hero')} alt="" />
      <header className="gu-splash-top">
        <img className="gu-logo" src={art('ui/logo')} alt="Prata Raja" />
        {best > 0 && <p className="gu-chip">Best: wave {best}</p>}
      </header>
      <footer className="gu-splash-foot">
        <p className="gu-chip">Kannan zones out over the tawa…</p>
        <button type="button" className="gu-start" aria-label="Start daydream" data-testid="ui-start" onClick={onStart}>
          <img src={art('ui/btn-orange')} alt="" />
          <span>Start daydream</span>
        </button>
      </footer>
    </div>
  );
}

function Hud({ hub, firstRun, modal, onPause }: { hub: Hub; firstRun: boolean; modal: boolean; onPause: () => void }) {
  const [hud, setHud] = useState<HudState | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hint, setHint] = useState(firstRun);

  useEffect(() => {
    const offs = [
      hub.on('hud', (h) => setHud(h)),
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
              <span>
                Wave {Math.max(1, hud.wave)}/{hud.waves}
              </span>
            </div>
            <div className="gu-gold" aria-label={`${hud.gold} gold`}>
              <img src={art('ui/coins')} alt="" />
              <span>{hud.gold}</span>
            </div>
            <button type="button" className="gu-pause" aria-label="Pause" data-testid="ui-pause" onClick={onPause}>
              <img src={art('ui/pause')} alt="" />
            </button>
          </div>
          <div className="gu-xp">
            <span className="gu-level">Lv {hud.level}</span>
            <Bar pct={hud.xp / hud.xpToNext} />
          </div>
          {hud.boss && (
            <div className="gu-boss">
              <img src={art('ui/boss-badge')} alt="" />
              <div className="gu-boss-body">
                <span className="gu-boss-name">{hud.boss.name}</span>
                <Bar pct={hud.boss.hp / hud.boss.maxHp} tone="boss" />
              </div>
            </div>
          )}
          <div className="gu-hp" aria-label={`${Math.max(0, Math.ceil(hud.hp))} of ${hud.maxHp} HP`}>
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

function LevelUp({ offer, onPick, onReroll }: { offer: Offer; onPick: (i: number) => void; onReroll: () => void }) {
  return (
    <div className="gu-modal">
      <section className="gu-levelup" role="dialog" aria-label={`Level ${offer.level}: pick a card`}>
        <h2 className="gu-heading">Level {offer.level}!</h2>
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
      </section>
    </div>
  );
}

function CardButton({ card, index, onPick }: { card: Card; index: number; onPick: () => void }) {
  const v = cardView(card);
  return (
    <button
      type="button"
      className="gu-card"
      data-testid={`ui-card-${index}`}
      aria-label={v.label}
      style={{ '--i': index, borderImageSource: `url("${art(v.frame)}")` } as CSSProperties}
      onClick={onPick}
    >
      <img className="gu-card-art" src={art(v.sprite)} alt="" />
      <span className="gu-card-text">
        <span className="gu-card-name">{v.name}</span>
        {v.badge && (
          <span className={v.badge === 'NEW' ? 'gu-badge' : 'gu-pips'} aria-hidden="true">
            {v.badge}
          </span>
        )}
        <span className="gu-card-line">{v.line}</span>
      </span>
    </button>
  );
}

function Pause({
  sound,
  haptics,
  onResume,
  onRestart,
  onQuit,
  onToggle,
}: {
  sound: boolean;
  haptics: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onToggle: (key: Toggle) => void;
}) {
  return (
    <div className="gu-modal">
      <section className="gu-sheet" role="dialog" aria-label="Paused">
        <h2 className="gu-heading">Paused</h2>
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="ui-resume" onClick={onResume}>
          Resume
        </button>
        <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-restart" onClick={onRestart}>
          Restart run
        </button>
        <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-quit" onClick={onQuit}>
          Quit to title
        </button>
        <div className="gu-switches">
          <Switch label="Sound" on={sound} onClick={() => onToggle('sfx')} />
          <Switch label="Haptics" on={haptics} onClick={() => onToggle('haptics')} />
        </div>
      </section>
    </div>
  );
}

function Switch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="gu-switch" onClick={onClick}>
      <span>{label}</span>
      <b>{on ? 'On' : 'Off'}</b>
    </button>
  );
}

function Results({ ended, onAgain, onTitle }: { ended: Ended; onAgain: () => void; onTitle: () => void }) {
  const r = ended.result;
  return (
    <div className="gu-results">
      <img className="gu-results-art" src={art('scene/wake')} alt="" />
      <section className="gu-panel gu-results-panel">
        <h2 className="gu-wake">{ended.line}</h2>
        {ended.newBest && <span className="gu-newbest">New best!</span>}
        <dl className="gu-stats">
          <div>
            <dt>Waves</dt>
            <dd>{r.wave}</dd>
          </div>
          <div>
            <dt>Kills</dt>
            <dd>{r.kills}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{r.level}</dd>
          </div>
          <div>
            <dt>Gold</dt>
            <dd>+{r.gold}</dd>
          </div>
        </dl>
        <p className="gu-tip">
          <b>Tip:</b> {ended.tip}
        </p>
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="ui-again" autoFocus onClick={onAgain}>
          Daydream again
        </button>
        <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-title" onClick={onTitle}>
          Title
        </button>
      </section>
    </div>
  );
}
