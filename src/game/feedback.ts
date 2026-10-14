// "Tell Kannan" from inside the game: what a note carries, how it is sent, and the sheet's state machine. Pure (no React,
// no Phaser), so the unit tests run it under Node. The sheet itself is ui/FeedbackSheet.tsx; the server half is the
// `game-feedback` edge function (supabase/functions/game-feedback), which files the note in public.feedback so
// `node scripts/feedback.mjs digest` and the Cell runner see it. Keep CHIPS and the limits in step with that function
// (its test compares them).
import { brandWords } from '@/brand';
import type { RunResult } from '@/core/types';
import { cleanFrom } from './deviceState';
import type { AppInfo } from './appInfo';
import type { Hub, HudState } from './hub';

export type Chip = 'direction' | 'bug' | 'feel' | 'idea';
/** Direction is intent; only the server decides whether this device is the owner. */
export const CHIPS: readonly { id: Chip; label: string }[] = [
  { id: 'direction', label: 'Direction' },
  { id: 'bug', label: 'Bug' },
  { id: 'feel', label: 'Feel' },
  { id: 'idea', label: 'Idea' },
];
export const DEFAULT_CHIP: Chip = 'idea';
export const BODY_MAX = 1000;

export type Screen = 'title' | 'hub' | 'run' | 'results' | 'kitchen';

/** GameUi's own screen names -> the screens a note reports (the stall hub is "hub"). */
export function toScreen(s: string): Screen {
  return s === 'stall' ? 'hub' : s === 'run' || s === 'results' || s === 'hub' || s === 'kitchen' ? s : 'title';
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
  flakyKosong?: boolean;
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
  let kitchenWave: number | null = null;
  let kitchenOver = false;
  let flakyKosong: boolean | undefined;
  const reset = (nextSeed: number | null) => {
    seed = nextSeed;
    hud = null;
    end = null;
    kitchenWave = null;
    kitchenOver = false;
    flakyKosong = undefined;
  };
  const offs = [
    hub.on('runStart', (p) => {
      reset(p.seed);
    }),
    hub.on('kitchenStart', (p) => { reset(p.seed); flakyKosong = p.flakyKosong; }),
    hub.on('kitchenStats', (stats) => {
      kitchenWave = stats.wave;
      if (stats.flakyKosong !== undefined) flakyKosong = stats.flakyKosong;
    }),
    hub.on('kitchenEnd', ({ reason, stats }) => {
      if (reason === 'stopped') reset(null);
      else {
        kitchenWave = stats.wave;
        kitchenOver = true;
      }
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
      if (hud) return { seed, wave: kitchenWave ?? hud.wave, level: hud.level, breads: owned(hud.breads), dips: owned(hud.dips), over: kitchenOver, ...(flakyKosong !== undefined ? { flakyKosong } : {}) };
      return { seed, wave: kitchenWave ?? 0, level: 1, breads: [], dips: [], over: kitchenOver, ...(flakyKosong !== undefined ? { flakyKosong } : {}) };
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
  /** Only on the run, results and kitchen screens; null elsewhere (an old run says nothing about the title). */
  wave: number | null;
  level: number | null;
  seed: number | null;
  breads: string[];
  dips: string[];
  flaky_kosong?: boolean;
};

export type NotePayload = {
  /** Made once per note and kept across retries, so a retry after a lost answer never files it twice. */
  id: string;
  /** The anonymous device id (deviceState.ts); the server rate-limits on it. */
  device_id: string;
  device_secret?: string;
  screenshot?: string;
  chip: Chip;
  body: string;
  from: string;
  context: NoteContext;
};

export const NO_INFO: AppInfo = { version: null, updateId: null, runtime: null, platform: 'web', device: null };

export function buildNote(i: {
  id: string;
  deviceId: string;
  deviceSecret?: string | null;
  screenshot?: string | null;
  chip: Chip;
  text: string;
  from: string;
  info: AppInfo | null;
  screen: Screen;
  run: RunSnapshot | null;
}): NotePayload {
  const info = i.info ?? NO_INFO;
  const run = i.screen === 'run' || i.screen === 'results' || i.screen === 'kitchen' ? i.run : null;
  return {
    id: i.id,
    device_id: i.deviceId,
    ...(i.deviceSecret ? { device_secret: i.deviceSecret } : {}),
    ...(validScreenshot(i.screenshot) ? { screenshot: i.screenshot! } : {}),
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
      ...(i.screen === 'kitchen' && run?.flakyKosong !== undefined ? { flaky_kosong: run.flakyKosong } : {}),
    },
  };
}

/** The small line under the note box: what travels with it, in a few words. */
export function contextLine(c: NoteContext): string {
  const where = c.wave && (c.screen === 'run' || c.screen === 'results' || c.screen === 'kitchen') ? `${c.screen}, wave ${c.wave}` : c.screen;
  return [c.app_version ? `v${c.app_version}` : null, where, c.level && c.wave ? `Lv ${c.level}` : null, c.platform].filter(Boolean).join(' · ');
}

// ── Sending ──────────────────────────────────────────────────────────────────────────────────────────────────────

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
/** The edge function's address, from the same public project URL the rest of the app uses ('' when the build has none). */
export const FEEDBACK_URL = BASE ? `${BASE.replace(/\/+$/, '')}/functions/v1/game-feedback` : '';

export type FailReason = 'offline' | 'busy' | 'rejected' | 'server' | 'unconfigured' | 'unavailable';
export type SendResult = { ok: true; id: string } | { ok: false; reason: FailReason };

export const FAIL_TEXT: Record<FailReason, string> = {
  offline: 'Couldn’t reach Kannan. Check the connection and try again.',
  busy: 'That’s a lot of notes in a short time. Try again in a little while.',
  rejected: 'That note didn’t go through. Try shortening it.',
  server: 'Something broke on our side. Try again in a moment.',
  unconfigured: 'Notes aren’t switched on in this build.',
  unavailable: 'My notes isn’t available on this server yet.',
};

/** The signed-in session's access token (supabase-js keeps it in localStorage on web), so the function can tell the owner. */
export function authHeaders(): Record<string, string> {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (/^sb-.+-auth-token$/.test(k)) {
        const token = JSON.parse(localStorage.getItem(k) ?? '{}').access_token;
        if (typeof token === 'string') return { authorization: `Bearer ${token}` };
      }
    }
  } catch { /* no storage: sent as nobody */ }
  return {};
}

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
      headers: { 'content-type': 'text/plain;charset=UTF-8', ...authHeaders() },
      body: JSON.stringify(note),
      signal: ctrl.signal,
    });
    if (res.ok) {
      const answer = await res.json().catch(() => null);
      return answer?.ok === true && answer.id === note.id ? { ok: true, id: note.id } : { ok: false, reason: 'server' };
    }
    if (res.status === 429) return { ok: false, reason: 'busy' };
    return { ok: false, reason: res.status >= 400 && res.status < 500 ? 'rejected' : 'server' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

export const SCREENSHOT_MAX = 180 * 1024;
export function validScreenshot(value: unknown): value is string {
  if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  return value.length <= SCREENSHOT_MAX;
}

export type DevicePair = { device_id: string; device_secret: string };
export type NoteMessage = { id: string; body: string; author_label: string; created_at: string };
export type SavedNote = { id: string; body: string; chip: string; status: string; plan: string | null; shipped_in: string | null; created_at: string; messages: NoteMessage[] };
export type NotesResult = { ok: true; notes: SavedNote[]; owner: boolean } | { ok: false; reason: FailReason };
type RequestOptions = { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max;
const nullableText = (v: unknown) => v === null || text(v);
const message = (v: unknown): v is NoteMessage => record(v) && text(v.id, 100) && text(v.body) && text(v.author_label, 100) && text(v.created_at, 100);
const savedNote = (v: unknown): v is SavedNote => record(v) && text(v.id, 100) && text(v.body) && text(v.chip, 40) && text(v.status, 40) && nullableText(v.plan) && nullableText(v.shipped_in) && text(v.created_at, 100) && Array.isArray(v.messages) && v.messages.length <= 500 && v.messages.every(message);

async function feedbackAction(body: Record<string, unknown>, opts: RequestOptions): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: FailReason }> {
  if (!body.device_id || !body.device_secret) return { ok: false, reason: 'unavailable' };
  const url = opts.url ?? FEEDBACK_URL;
  if (!url) return { ok: false, reason: 'unconfigured' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8', ...authHeaders() }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) return { ok: false, reason: res.status === 429 ? 'busy' : [400, 404, 405, 501].includes(res.status) ? 'unavailable' : res.status === 401 || res.status === 403 ? 'rejected' : 'server' };
    const data: unknown = await res.json().catch(() => null);
    return record(data) && data.ok === true ? { ok: true, data } : { ok: false, reason: 'unavailable' };
  } catch { return { ok: false, reason: 'offline' }; }
  finally { clearTimeout(timer); }
}
export async function listNotes(pair: DevicePair, opts: RequestOptions = {}): Promise<NotesResult> {
  const answer = await feedbackAction({ action: 'list', ...pair }, opts);
  if (!answer.ok) return answer;
  const { notes, owner } = answer.data;
  return Array.isArray(notes) && notes.length <= 200 && notes.every(savedNote) && typeof owner === 'boolean' ? { ok: true, notes, owner } : { ok: false, reason: 'unavailable' };
}
export async function replyToNote(pair: DevicePair, id: string, messageId: string, body: string, opts: RequestOptions = {}): Promise<SendResult> {
  const answer = await feedbackAction({ action: 'reply', ...pair, id, message_id: messageId, body: body.trim().slice(0, BODY_MAX) }, opts);
  if (!answer.ok) return answer;
  return answer.data.id === id && answer.data.message_id === messageId ? { ok: true, id: messageId } : { ok: false, reason: 'unavailable' };
}
export async function pairOwner(pair: DevicePair, code: string, opts: RequestOptions = {}): Promise<{ ok: true; owner: true } | { ok: false; reason: FailReason }> {
  const answer = await feedbackAction({ action: 'owner', ...pair, code: code.trim() }, opts);
  if (!answer.ok) return answer;
  return answer.data.owner === true ? { ok: true, owner: true } : { ok: false, reason: 'rejected' };
}
export function noteStatus(note: Pick<SavedNote, 'status' | 'shipped_in'>): string {
  const labels = brandWords.statusLabels;
  const known: Record<string, string> = { new: labels.received, needs_info: labels.question, proposed: labels.planReady, approved: labels.planned, in_progress: labels.building, shipped: labels.shipped, done: labels.done, wont_do: labels.not_now, duplicate: labels.merged };
  return note.status === 'shipped' && note.shipped_in ? `${brandWords.statusShort.shipped} in ${note.shipped_in}` : known[note.status] ?? 'Status pending';
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
