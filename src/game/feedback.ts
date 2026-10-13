// "Tell Kannan" from inside the game: what a note carries, how it is sent, and the sheet's state machine. Pure (no React,
// no Phaser), so the unit tests run it under Node. The sheet itself is ui/FeedbackSheet.tsx; the server half is the
// `game-feedback` edge function (supabase/functions/game-feedback), which files the note in public.feedback so
// `node scripts/feedback.mjs digest` and the Cell runner see it. Keep CHIPS and the limits in step with that function
// (its test compares them).
import type { RunResult } from '@/core/types';
import { cleanFrom } from './deviceState';
import type { AppInfo } from './appInfo';
import type { Hub, HudState } from './hub';

export type Chip = 'bug' | 'idea' | 'balance' | 'art';
/** The four kinds on the sheet. The server maps them to feedback_kind: bug -> bug, idea -> idea, balance and art -> change
 *  (the chip itself is kept as a tag, so the inbox can still tell them apart). */
export const CHIPS: readonly { id: Chip; label: string }[] = [
  { id: 'bug', label: 'Bug' },
  { id: 'idea', label: 'Idea' },
  { id: 'balance', label: 'Balance' },
  { id: 'art', label: 'Art' },
];
export const DEFAULT_CHIP: Chip = 'idea';
export const BODY_MAX = 1000;

export type Screen = 'title' | 'hub' | 'run' | 'results';

/** GameUi's own screen names -> the four a note reports (the stall hub is "hub"). */
export function toScreen(s: string): Screen {
  return s === 'stall' ? 'hub' : s === 'run' || s === 'results' || s === 'hub' ? s : 'title';
}

// ── What the run looked like ─────────────────────────────────────────────────────────────────────────────────────

export type RunSnapshot = {
  seed: number;
  /** 0 before the first wave. */
  wave: number;
  level: number;
  /** "id:level", e.g. "kosong:2". */
  breads: string[];
  dips: string[];
  over: boolean;
};

const owned = (xs: readonly { id: string; level: number }[]): string[] => xs.map((x) => `${x.id}:${x.level}`);

/**
 * Follows the hub so the sheet can say which run a note is about. Cheap on purpose: the HUD arrives about 10 times a
 * second, so it only keeps the latest one and builds the snapshot when asked.
 */
export function trackRun(hub: Hub): { read(): RunSnapshot | null; stop(): void } {
  let seed: number | null = null;
  let hud: HudState | null = null;
  let end: RunResult | null = null;
  const offs = [
    hub.on('runStart', (p) => {
      seed = p.seed;
      hud = null;
      end = null;
    }),
    hub.on('hud', (h) => {
      hud = h;
    }),
    hub.on('runEnd', (r) => {
      end = r;
    }),
  ];
  return {
    read() {
      if (seed === null) return null;
      if (end) return { seed, wave: end.wave, level: end.level, breads: owned(end.breads), dips: owned(end.dips), over: true };
      if (hud) return { seed, wave: hud.wave, level: hud.level, breads: owned(hud.breads), dips: owned(hud.dips), over: false };
      return { seed, wave: 0, level: 1, breads: [], dips: [], over: false };
    },
    stop: () => offs.forEach((off) => off()),
  };
}

// ── The note ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type NoteContext = {
  app_version: string | null;
  update_id: string | null;
  runtime: string | null;
  platform: string;
  device: string | null;
  screen: Screen;
  /** Only on the run and results screens; null elsewhere (an old run says nothing about the title). */
  wave: number | null;
  level: number | null;
  seed: number | null;
  breads: string[];
  dips: string[];
};

export type NotePayload = {
  /** Made once per note and kept across retries, so a retry after a lost answer never files it twice. */
  id: string;
  /** The anonymous device id (deviceState.ts); the server rate-limits on it. */
  device_id: string;
  chip: Chip;
  body: string;
  from: string;
  context: NoteContext;
};

export const NO_INFO: AppInfo = { version: null, updateId: null, runtime: null, platform: 'web', device: null };

export function buildNote(i: {
  id: string;
  deviceId: string;
  chip: Chip;
  text: string;
  from: string;
  info: AppInfo | null;
  screen: Screen;
  run: RunSnapshot | null;
}): NotePayload {
  const info = i.info ?? NO_INFO;
  const run = i.screen === 'run' || i.screen === 'results' ? i.run : null;
  return {
    id: i.id,
    device_id: i.deviceId,
    chip: i.chip,
    body: i.text.trim().slice(0, BODY_MAX),
    from: cleanFrom(i.from),
    context: {
      app_version: info.version,
      update_id: info.updateId,
      runtime: info.runtime,
      platform: info.platform,
      device: info.device,
      screen: i.screen,
      wave: run?.wave ?? null,
      level: run?.level ?? null,
      seed: run?.seed ?? null,
      breads: run?.breads ?? [],
      dips: run?.dips ?? [],
    },
  };
}

/** The small line under the note box: what travels with it, in a few words. */
export function contextLine(c: NoteContext): string {
  const where = c.screen === 'run' && c.wave ? `run, wave ${c.wave}` : c.screen === 'results' && c.wave ? `results, wave ${c.wave}` : c.screen;
  return [c.app_version ? `v${c.app_version}` : null, where, c.level && c.wave ? `Lv ${c.level}` : null, c.platform].filter(Boolean).join(' · ');
}

// ── Sending ──────────────────────────────────────────────────────────────────────────────────────────────────────

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
/** The edge function's address, from the same public project URL the rest of the app uses ('' when the build has none). */
export const FEEDBACK_URL = BASE ? `${BASE.replace(/\/+$/, '')}/functions/v1/game-feedback` : '';

export type FailReason = 'offline' | 'busy' | 'rejected' | 'server' | 'unconfigured';
export type SendResult = { ok: true; id: string } | { ok: false; reason: FailReason };

export const FAIL_TEXT: Record<FailReason, string> = {
  offline: 'Couldn’t reach Kannan. Check the connection and try again.',
  busy: 'That’s a lot of notes in a short time. Try again in a little while.',
  rejected: 'That note didn’t go through. Try shortening it.',
  server: 'Something broke on our side. Try again in a moment.',
  unconfigured: 'Notes aren’t switched on in this build.',
};

/** POST the note. Never throws: every outcome is a SendResult. text/plain keeps it a "simple" request (no CORS preflight). */
export async function sendNote(
  note: NotePayload,
  opts: { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SendResult> {
  const url = opts.url ?? FEEDBACK_URL;
  if (!url) return { ok: false, reason: 'unconfigured' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(note),
      signal: ctrl.signal,
    });
    if (res.ok) return { ok: true, id: note.id };
    if (res.status === 429) return { ok: false, reason: 'busy' };
    return { ok: false, reason: res.status >= 400 && res.status < 500 ? 'rejected' : 'server' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

// ── The sheet's state ────────────────────────────────────────────────────────────────────────────────────────────

export type SheetState = {
  phase: 'edit' | 'sending' | 'sent' | 'failed';
  text: string;
  chip: Chip;
  from: string;
  /** Set when a send starts and kept for Retry; any edit drops it, so an edited note is a new note. */
  noteId: string | null;
  reason: FailReason | null;
};

export type SheetAction =
  | { type: 'text'; text: string }
  | { type: 'chip'; chip: Chip }
  | { type: 'from'; from: string }
  | { type: 'clear' }
  | { type: 'send'; id: string }
  | { type: 'sent' }
  | { type: 'fail'; reason: FailReason };

export const initialSheet = (from = ''): SheetState => ({ phase: 'edit', text: '', chip: DEFAULT_CHIP, from, noteId: null, reason: null });

export const canSend = (s: Pick<SheetState, 'text'>): boolean => s.text.trim().length > 0;

export function sheetReducer(s: SheetState, a: SheetAction): SheetState {
  // Once a note is on its way (or has landed) the form is read-only.
  const open = s.phase === 'edit' || s.phase === 'failed';
  const edit = (patch: Partial<SheetState>): SheetState => (open ? { ...s, ...patch, phase: 'edit', noteId: null, reason: null } : s);
  switch (a.type) {
    case 'text':
      return edit({ text: a.text.slice(0, BODY_MAX) });
    case 'chip':
      return edit({ chip: a.chip });
    case 'from':
      return edit({ from: a.from });
    case 'clear':
      return edit({ text: '' });
    case 'send':
      return open && canSend(s) ? { ...s, phase: 'sending', noteId: s.noteId ?? a.id, reason: null } : s;
    case 'sent':
      return s.phase === 'sending' ? { ...s, phase: 'sent' } : s;
    case 'fail':
      return s.phase === 'sending' ? { ...s, phase: 'failed', reason: a.reason } : s;
  }
}
