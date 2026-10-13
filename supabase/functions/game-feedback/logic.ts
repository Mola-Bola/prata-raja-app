// The pure half of the game-feedback function: what a note must look like, the feedback row it becomes, and when to say
// "too many". No Deno and no network in here, so vitest runs it (src/game/__tests__ compares CHIPS and the limits with the
// game's own copy in src/game/feedback.ts: keep them in step).

/** The chips on the game's sheet -> the feedback_kind enum (like, dislike, bug, idea, change). The chip itself is kept as a tag. */
export const CHIP_KIND = { direction: 'change', bug: 'bug', feel: 'change', idea: 'idea', balance: 'change', art: 'change' } as const;
export type Chip = keyof typeof CHIP_KIND;

export const LIMITS = {
  body: 1000,
  from: 40,
  /** Characters in the whole request. A real note is under 2 KB. */
  request: 200 * 1024,
  screenshot: 180 * 1024,
  /** Notes one device may file per hour, and all devices together: a rough guard for an open endpoint. */
  perDevicePerHour: 6,
  globalPerHour: 120,
} as const;

/** The name of the one profile every game note is filed under (the inbox digest shows it as the author). */
export const AUTHOR_NAME = 'In-game';

const SCREENS = ['title', 'hub', 'run', 'results', 'kitchen'] as const;
export type GameScreen = (typeof SCREENS)[number];

export type Note = {
  id: string;
  deviceSecret?: string;
  screenshot?: string;
  deviceId: string;
  chip: Chip;
  body: string;
  from: string;
  appVersion: string | null;
  updateId: string | null;
  runtime: string | null;
  platform: string;
  device: string | null;
  screen: GameScreen;
  wave: number | null;
  level: number | null;
  seed: number | null;
  breads: string[];
  dips: string[];
};

export type Parsed = { ok: true; note: Note } | { ok: false; error: string };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNED = /^[a-z0-9-]{1,32}:\d{1,2}$/;
// Control characters out (a NUL would make Postgres refuse the row); tab and newline stay for the note itself.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const CONTROL_LINE = /[\u0000-\u001f\u007f]/g;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const label = (x: unknown, max: number, pattern: RegExp): string | null => (typeof x === 'string' && x.length <= max && pattern.test(x) ? x : null);
const int = (x: unknown, max: number): number | null => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max ? x : null);
const list = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string' && OWNED.test(v)).slice(0, 16) : []);
const oneLine = (x: unknown, max: number): string => (typeof x === 'string' ? x.replace(CONTROL_LINE, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '');

/** Check an incoming note (already JSON-parsed). Anything outside the shape is refused; odd context values are dropped. */
export function parseNote(raw: unknown): Parsed {
  if (!isObj(raw)) return { ok: false, error: 'not an object' };
  if (typeof raw.id !== 'string' || !UUID.test(raw.id)) return { ok: false, error: 'id' };
  if (typeof raw.device_id !== 'string' || !UUID.test(raw.device_id)) return { ok: false, error: 'device_id' };
  if (typeof raw.chip !== 'string' || !Object.hasOwn(CHIP_KIND, raw.chip)) return { ok: false, error: 'chip' };
  if (typeof raw.body !== 'string') return { ok: false, error: 'body' };
  const body = raw.body.replace(CONTROL, '').trim();
  if (body.length === 0) return { ok: false, error: 'empty' };
  if (body.length > LIMITS.body) return { ok: false, error: 'too long' };
  if (raw.device_secret !== undefined && !validSecret(raw.device_secret)) return { ok: false, error: 'device_secret' };
  if (raw.screenshot !== undefined && !validScreenshot(raw.screenshot)) return { ok: false, error: 'screenshot' };
  const c = isObj(raw.context) ? raw.context : {};
  return {
    ok: true,
    note: {
      id: raw.id.toLowerCase(),
      ...(raw.device_secret ? { deviceSecret: (raw.device_secret as string).toLowerCase() } : {}),
      ...(raw.screenshot ? { screenshot: raw.screenshot as string } : {}),
      deviceId: raw.device_id.toLowerCase(),
      chip: raw.chip as Chip,
      body,
      from: oneLine(raw.from, LIMITS.from),
      appVersion: label(c.app_version, 24, /^[\w.+-]+$/),
      updateId: label(c.update_id, 64, /^[\w.-]+$/),
      runtime: label(c.runtime, 24, /^[\w.-]+$/),
      platform: label(c.platform, 40, /^[\w .-]+$/) ?? 'unknown',
      device: oneLine(c.device, 120) || null,
      screen: SCREENS.find((s) => s === c.screen) ?? 'title',
      wave: int(c.wave, 999),
      level: int(c.level, 999),
      seed: int(c.seed, 0xffffffff),
      breads: list(c.breads),
      dips: list(c.dips),
    },
  };
}

/** The feedback table's `screen` column, which the digest prints after "on": where in the game, and how far. */
export function screenLabel(n: Pick<Note, 'screen' | 'wave'>): string {
  return n.wave && (n.screen === 'run' || n.screen === 'results') ? `Game: ${n.screen}, wave ${n.wave}` : `Game: ${n.screen}`;
}

/** The public.feedback row. Everything not listed uses the table's defaults (status new, module prata-raja). */
export function rowFor(n: Note, authorId: string) {
  return {
    id: n.id,
    author_id: authorId,
    kind: CHIP_KIND[n.chip],
    body: n.body,
    route: '/play',
    screen: screenLabel(n),
    platform: n.platform,
    app_version: n.appVersion,
    update_id: n.updateId,
    device: n.device,
    tags: ['in-game', n.chip],
    params: {
      src: 'game',
      chip: n.chip,
      device_id: n.deviceId,
      ...(n.from ? { from: n.from } : {}),
      screen: n.screen,
      ...(n.runtime ? { runtime: n.runtime } : {}),
      ...(n.seed !== null ? { seed: n.seed } : {}),
      ...(n.wave !== null ? { wave: n.wave } : {}),
      ...(n.level !== null ? { level: n.level } : {}),
      ...(n.breads.length || n.dips.length ? { build: { breads: n.breads, dips: n.dips } } : {}),
    },
  };
}

/** Counts of game notes filed in the last hour -> whether one more is allowed. */
export function rateVerdict(counts: { device: number; global: number }): 'ok' | 'device' | 'global' {
  if (counts.device >= LIMITS.perDevicePerHour) return 'device';
  if (counts.global >= LIMITS.globalPerHour) return 'global';
  return 'ok';
}

export function validSecret(value: unknown): value is string {
  return typeof value === 'string' && value.length === 73 && value.split('.').length === 2 && value.split('.').every((part) => UUID.test(part));
}
export function validScreenshot(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > LIMITS.screenshot || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  try {
    const bytes = atob(value.slice(23));
    return bytes.length >= 4 && bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 &&
      bytes.charCodeAt(bytes.length - 2) === 255 && bytes.charCodeAt(bytes.length - 1) === 217;
  } catch { return false; }
}
