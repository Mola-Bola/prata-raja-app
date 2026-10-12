// Procedural sound effects (ZzFX, no audio files).
// zzfx is imported lazily: importing it creates an AudioContext, which would throw in SSR and node.

export type SfxName =
  | 'throw'
  | 'hit'
  | 'crit'
  | 'kill'
  | 'blast'
  | 'chain'
  | 'freeze'
  | 'sugarCrash'
  | 'shieldBreak'
  | 'playerHurt'
  | 'dodge'
  | 'levelUp'
  | 'cardPick'
  | 'waveStart'
  | 'bossAppear'
  | 'bossTell'
  | 'win'
  | 'lose'
  | 'coin'
  | 'uiTap';

// ZzFX params, in order: volume, randomness, frequency, attack, sustain, release, shape,
// shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
// bitCrush, delay, sustainVolume, decay, tremolo, filter.
// shape: 0 sine, 1 triangle, 2 saw, 3 clipped tan, 4 sin(t^3) texture, 5+ square (duty = shapeCurve/2).
// randomness .05 gives +-5% pitch per play; 0 keeps repeats identical.
// filter: negative = lowpass, positive = highpass.
export const SFX_PARAMS: Record<SfxName, readonly number[]> = {
  // soft "whup" of dough through air
  throw: [0.55, 0.05, 340, 0.004, 0.02, 0.09, 0, 1, -2, 0, 0, 0, 0, 0.08, 0, 0, 0, 1, 0, 0, -550],
  // soft dough slap
  hit: [0.75, 0.05, 230, 0.003, 0.01, 0.08, 1, 1, -1.6, 0, 0, 0, 0, 0.15, 0, 0, 0, 1, 0, 0, -500],
  // brighter slap with a tiny up-ping
  crit: [0.8, 0, 420, 0.002, 0.015, 0.09, 1, 1, -2.5, 0, 220, 0.03, 0, 0, 0, 0, 0, 1, 0, 0, -1200],
  // small pop
  kill: [0.6, 0.05, 260, 0.002, 0, 0.085, 0, 1, 5, 0, 0, 0, 0, 0.05, 0, 0, 0, 1, 0, 0, -700],
  // muffled comic boom
  blast: [0.85, 0, 110, 0.006, 0.03, 0.26, 1, 1, -0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.55, 0.05, 0, -250],
  // quick zappy crackle
  chain: [0.45, 0, 720, 0.002, 0.03, 0.12, 2, 1, -7, 0, 0, 0, 0, 0.25, 0, 0.04, 0, 1, 0, 0, -1500],
  // icy tinkle
  freeze: [0.45, 0, 1500, 0.003, 0.02, 0.22, 0, 1, 1, 0, 380, 0.035, 0, 0, 0, 0, 0, 1, 0, 0, 600],
  // sweet descending bloop
  sugarCrash: [0.6, 0, 560, 0.006, 0.03, 0.14, 1, 1, -2.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.05, 0, -1300],
  // tin clang (steel tiffin)
  shieldBreak: [0.55, 0, 1180, 0.001, 0.02, 0.3, 1, 0.6, 0, 0, -130, 0.03, 0, 0.18, 0, 0, 0, 1, 0, 0, 250],
  // low thud
  playerHurt: [0.7, 0, 130, 0.003, 0.02, 0.14, 0, 1, -0.7, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -200],
  // quick airy whoosh
  dodge: [0.4, 0, 230, 0.02, 0.03, 0.15, 1, 1, 7, 0, 0, 0, 0, 0.45, 0, 0, 0, 1, 0, 0, -1100],
  // bright rising arpeggio chime (pitch steps every repeatTime)
  levelUp: [0.5, 0, 523, 0.005, 0.25, 0.12, 0, 1, 0, 0, 130, 0.06, 0.1, 0, 0, 0, 0, 1, 0, 0.3],
  // paper flip click
  cardPick: [0.4, 0, 1600, 0.001, 0, 0.04, 0, 1, -12, 0, 0, 0, 0, 0.7, 0, 0.03, 0, 1, 0, 0, -2500],
  // light gong / drum
  waveStart: [0.6, 0, 196, 0.002, 0.03, 0.22, 0, 1, -0.1, 0, 0, 0, 0, 0.03, 0, 0, 0, 0.3, 0.12, 0, -600],
  // low dramatic horn
  bossAppear: [0.5, 0, 98, 0.15, 0.2, 0.35, 2, 1, 0.1, 0, 0, 0, 0, 0.1, 0, 0, 0, 1, 0, 0, -400],
  // short rising warning beep
  bossTell: [0.35, 0, 620, 0.004, 0.04, 0.05, 5, 0.8, 5, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1500],
  // happy fanfare
  win: [0.45, 0, 523, 0.006, 0.25, 0.2, 2, 1, 0, 0, 130, 0.06, 0.13, 0, 0, 0, 0, 1, 0, 0.25, -1500],
  // sleepy descending wah-wah
  lose: [0.6, 0, 392, 0.02, 0.2, 0.25, 0, 1, -0.5, 0, -55, 0.13, 0.26, 0, 0, 0, 0, 1, 0, 0.4],
  // classic coin ding
  coin: [0.6, 0, 988, 0.002, 0.02, 0.2, 1, 1, 0, 0, 331, 0.07, 0, 0, 0, 0, 0, 0.35, 0.06],
  // soft click
  uiTap: [0.25, 0, 1000, 0.002, 0, 0.03, 0, 1, -6, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -1500],
};

// Same name at most once per 40 ms; hit and throw share at most 12 plays per rolling second.
const SAME_GAP_MS = 40;
const BURST_SFX: ReadonlySet<SfxName> = new Set<SfxName>(['hit', 'throw']);
const BURST_MAX = 12;
const BURST_WINDOW_MS = 1000;

export interface SfxHistory {
  readonly last: Partial<Record<SfxName, number>>;
  readonly burst: readonly number[];
}

export const NO_SFX_HISTORY: SfxHistory = { last: {}, burst: [] };

/** Returns the history after playing `name` at `now` (ms), or null when the throttle drops it. */
export function admitSfx(h: SfxHistory, name: SfxName, now: number): SfxHistory | null {
  const prev = h.last[name];
  if (prev !== undefined && now - prev < SAME_GAP_MS) return null;
  const burst = h.burst.filter((t) => now - t < BURST_WINDOW_MS);
  const grouped = BURST_SFX.has(name);
  if (grouped && burst.length >= BURST_MAX) return null;
  return { last: { ...h.last, [name]: now }, burst: grouped ? [...burst, now] : burst };
}

type Sound = { play: () => unknown };

type ZzfxModule = {
  ZZFX: { audioContext: { state: string; resume: () => Promise<void> } };
  ZZFXSound: new (params: number[]) => Sound;
};

let enabled = true;
let zzfx: ZzfxModule | null = null;
let loading: Promise<void> | null = null;
let history: SfxHistory = NO_SFX_HISTORY;
const sounds: Partial<Record<SfxName, Sound>> = {};

function ensureLoaded(): void {
  if (zzfx || loading || typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
  // zzfx ships untyped JS, so the import result is cast below.
  // @ts-expect-error untyped package (no .d.ts)
  loading = import('zzfx').then(
    (m) => {
      zzfx = m as unknown as ZzfxModule;
    },
    () => {
      loading = null; // retry on a later call
    },
  );
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

/** Call from a user gesture; safe to call many times. Browsers keep the AudioContext suspended until then. */
export function unlockAudio(): void {
  ensureLoaded();
  try {
    void zzfx?.ZZFX.audioContext.resume().catch(() => {});
  } catch {
    // no audio here
  }
}

export function playSfx(name: SfxName): void {
  if (!enabled) return;
  ensureLoaded();
  if (!zzfx || zzfx.ZZFX.audioContext.state !== 'running') return;
  const next = admitSfx(history, name, Date.now());
  if (!next) return;
  history = next;
  try {
    // ponytail: each sound is synthesized on its first play (up to ~100 ms for the long ones);
    // prebuild in idle time if that first-play hitch shows up on device.
    (sounds[name] ??= new zzfx.ZZFXSound([...SFX_PARAMS[name]])).play();
  } catch {
    // audio can fail on old WebViews; a missing sound must never break the game
  }
}
