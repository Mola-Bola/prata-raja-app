// "Tell Kannan" inside the game: a sheet with a note box, four kind chips, an optional "From" name and a Send button, plus the
// two small pieces the pause sheet and the results screen drop in (TellButton, AnalyticsSwitch). Notes go to the
// `game-feedback` edge function (src/game/feedback.ts) and land in the factory's feedback inbox.
//
// Hook points in GameUi.tsx (the only places it touches): <FeedbackLayer hub screen /> once at the root, <TellButton /> in the
// pause sheet and on the results screen, <AnalyticsSwitch /> beside Sound and Haptics. The stall hub opens the sheet with
// openFeedback().
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';

import { brandWords } from '@/brand';
import { uuid } from '@/data/bytes';

import { captureGame } from '../capture';
import { FeedbackNotes } from './FeedbackNotes';
import { device, getInfo, setAnalytics, trackFeedbackSent } from '../telemetry';
import {
  BODY_MAX,
  buildNote,
  CHIPS,
  canSend,
  contextLine,
  FAIL_TEXT,
  initialSheet,
  type NotePayload,
  type RunSnapshot,
  type Screen,
  sendNote,
  sheetReducer,
  toScreen,
  trackRun,
} from '../feedback';
import type { Hub } from '../hub';
import './FeedbackSheet.css';

const TELL = brandWords.words.tell;

// ── Open / closed, for any caller ────────────────────────────────────────────────────────────────────────────────

type Opened = { screen: Screen; run: RunSnapshot | null; screenshot: string | null };
let opened: Opened | null = null;
const subs = new Set<() => void>();
/** What the layer last saw: where the player is, and the run behind them. Read at the moment the sheet opens. */
const here: { screen: Screen; run: () => RunSnapshot | null } = { screen: 'title', run: () => null };

const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
};
const set = (next: Opened | null) => {
  opened = next;
  subs.forEach((fn) => fn());
};

/** Open the note sheet over whatever is on screen. Safe to call from the stall hub or any other screen. */
export function openFeedback(): void {
  const next: Opened = { screen: here.screen, run: here.run(), screenshot: null };
  set(next);
  void captureGame().then(screenshot => {
    if (opened === next) set({ ...next, screenshot });
  }).catch(() => {});
}
export function closeFeedback(): void {
  set(null);
}

/** Mount once, last inside GameUi's root, so the sheet draws above the pause sheet and the results. */
export function FeedbackLayer({ hub, screen }: { hub: Hub; screen: string }) {
  const sheet = useSyncExternalStore(subscribe, () => opened, () => null);
  useEffect(() => {
    here.screen = toScreen(screen);
  }, [screen]);
  useEffect(() => {
    const tracker = trackRun(hub);
    here.run = tracker.read;
    return () => {
      tracker.stop();
      here.run = () => null;
    };
  }, [hub]);
  return sheet ? <Sheet {...sheet} /> : null;
}

/** The "Tell Kannan" button for the pause sheet and the results screen. */
export function TellButton() {
  return (
    <button type="button" className="gu-btn gu-btn--wide" data-testid="ui-tell" onClick={openFeedback}>
      {TELL}
    </button>
  );
}

/** The Analytics switch, styled like Sound and Haptics (it spans both columns). */
export function AnalyticsSwitch() {
  const on = useSyncExternalStore(device.subscribe, () => device.get()?.analytics ?? true, () => true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Analytics"
      className="gu-switch fb-switch"
      data-testid="ui-analytics"
      onClick={() => setAnalytics(!on)}
    >
      <span>Analytics</span>
      <b>{on ? 'On' : 'Off'}</b>
    </button>
  );
}

// ── The sheet ────────────────────────────────────────────────────────────────────────────────────────────────────

function Sheet({ screen, run, screenshot }: Opened) {
  const [s, dispatch] = useReducer(sheetReducer, undefined, () => initialSheet(device.get()?.from ?? ''));
  const alive = useRef(true);
  const identity = useSyncExternalStore(device.subscribe, device.get, () => null);
  const secretSaved = useSyncExternalStore(device.subscribe, device.secretSaved, () => false);
  const deviceId = identity?.id ?? '';
  const pendingNote = useRef<NotePayload | null>(null);
  const [tab, setTab] = useState<'write' | 'notes'>('write');
  const [notesOpened, setNotesOpened] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const inFlight = useRef(false);
  const sending = s.phase === 'sending';
  const busy = sending || notesBusy;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const close = useCallback(() => closeFeedback(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, busy]);
  // A note that has gone: say so for a moment, then step out of the way.
  useEffect(() => {
    if (s.phase !== 'sent' || tab !== 'write') return;
    const t = window.setTimeout(close, 1600);
    return () => window.clearTimeout(t);
  }, [s.phase, close, tab]);

  const preview = buildNote({ id: '', deviceId, deviceSecret: identity?.secret, screenshot, chip: s.chip, text: s.text, from: s.from, info: getInfo(), screen, run });

  const displayedNote = pendingNote.current?.id === s.noteId ? pendingNote.current : preview;

  const send = async () => {
    if (!identity || !canSend(s) || busy || inFlight.current) return;
    inFlight.current = true;
    const id = s.noteId ?? uuid();
    dispatch({ type: 'send', id });
    device.update({ from: s.from });
    if (pendingNote.current?.id !== id) pendingNote.current = { ...preview, id };
    const result = await sendNote(pendingNote.current);
    inFlight.current = false;
    if (!alive.current) return;
    if (result.ok) {
      dispatch({ type: 'sent' });
      trackFeedbackSent(s.chip);
    } else {
      dispatch({ type: 'fail', reason: result.reason });
    }
  };

  return (
    <div className="gu-modal fb-modal">
      <section className="gu-sheet fb-sheet" role="dialog" aria-modal="true" aria-label={TELL} data-testid="feedback-sheet">
        <header className="fb-head">
          <h2 className="gu-heading">{TELL}</h2>
          <button type="button" className="fb-x" aria-label="Close" data-testid="feedback-close" disabled={busy} onClick={close}>
            ×
          </button>
        </header>
        <div className="fb-tabs" role="tablist" aria-label="Feedback">
          <button type="button" className="fb-chip" role="tab" aria-selected={tab === 'write'} disabled={busy} data-testid="feedback-write-tab" onClick={() => setTab('write')}>Write a note</button>
          <button type="button" className="fb-chip" role="tab" aria-selected={tab === 'notes'} disabled={busy} data-testid="feedback-notes-tab" onClick={() => { setNotesOpened(true); setTab('notes'); }}>My notes</button>
        </div>
        {notesOpened && <div hidden={tab !== 'notes'}><FeedbackNotes identity={identity} secretSaved={secretSaved} onBusy={setNotesBusy} /></div>}
        <div className="fb-compose" hidden={tab !== 'write'}>
        {s.phase === 'sent' ? (
          <p className="fb-status fb-status--ok" role="status" data-testid="feedback-sent">
            Sent. Thanks, Kannan will read it. {s.noteId && <span className="fb-note-reference">Note {s.noteId.slice(-8)}</span>}
          </p>
        ) : (
          <>
            <div className="fb-chips" role="radiogroup" aria-label="Kind of note">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={s.chip === c.id}
                  className="fb-chip"
                  data-testid={`feedback-chip-${c.id}`}
                  disabled={sending}
                  onClick={() => dispatch({ type: 'chip', chip: c.id })}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="fb-box">
              <textarea
                className="fb-text"
                data-testid="feedback-text"
                aria-label="Your note"
                placeholder="What happened? What should change?"
                value={s.text}
                maxLength={BODY_MAX}
                rows={4}
                autoFocus
                readOnly={sending}
                onChange={(e) => dispatch({ type: 'text', text: e.target.value })}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && void send()}
              />
              {s.text && !sending && (
                <button type="button" className="fb-clear" aria-label="Clear note" data-testid="feedback-clear" onClick={() => dispatch({ type: 'clear' })}>
                  ×
                </button>
              )}
            </div>
            <label className="fb-from">
              <span>From (optional)</span>
              <input
                className="fb-input"
                data-testid="feedback-from"
                value={s.from}
                maxLength={40}
                placeholder="Your name"
                autoComplete="off"
                enterKeyHint="done"
                readOnly={sending}
                onChange={(e) => dispatch({ type: 'from', from: e.target.value })}
              />
            </label>
            {!secretSaved && <p className="fb-context">This device hasn’t saved its private note key. You can send a note, but its thread may be unavailable after reloading.</p>}
            <p className="fb-context" data-testid="feedback-context">
              Goes with it: {contextLine(displayedNote.context)}{displayedNote.screenshot ? ' · game screenshot' : ''}
            </p>
            {s.phase === 'failed' && s.reason && (
              <p className="fb-status fb-status--bad" role="alert" data-testid="feedback-error">
                {FAIL_TEXT[s.reason]}
              </p>
            )}
            <button
              type="button"
              className="gu-btn gu-btn--primary gu-btn--wide"
              data-testid="feedback-send"
              disabled={!identity || !canSend(s) || sending}
              onClick={() => void send()}
            >
              {sending ? 'Sending…' : s.phase === 'failed' ? 'Retry' : 'Send'}
            </button>
          </>
        )}
        </div>
      </section>
    </div>
  );
}
