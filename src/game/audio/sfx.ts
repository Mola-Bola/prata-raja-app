// Procedural sound effects (ZzFX, no audio files). Roti hits and throws are WebAudio dough slaps (below).
// zzfx is imported lazily: importing it creates an AudioContext, which would throw in SSR and node.
import type { BreadId } from '@/core/types';

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
// throw and hit are not here: they are dough slaps, see SLAP_PROFILES.
export const SFX_PARAMS: Record<Exclude<SfxName, 'throw' | 'hit'>, readonly number[]> = {
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

// Same name at most once per 40 ms; roti slaps: same bread at most once per 25 ms.
// Hit and throw share at most 12 plays per rolling second, so a swarm stays a crackle, not a clip.
const SAME_GAP_MS = 40;
const SLAP_GAP_MS = 25;
/** Sounds that come in bursts (a volley landing, several biters at the counter) get a longer gap, so a burst is one sound. */
const MIN_GAP_MS: Partial<Record<SfxName, number>> = { playerHurt: 450 };
const BURST_SFX: ReadonlySet<SfxName> = new Set<SfxName>(['hit', 'throw']);
const BURST_MAX = 12;
const BURST_WINDOW_MS = 1000;

export interface SfxHistory {
  readonly last: Readonly<Record<string, number>>;
  readonly burst: readonly number[];
}

export const NO_SFX_HISTORY: SfxHistory = { last: {}, burst: [] };

/** Returns the history after playing `name` at `now` (ms), or null when the throttle drops it. `bread` keys slaps per bread. */
export function admitSfx(h: SfxHistory, name: SfxName, now: number, bread?: BreadId): SfxHistory | null {
  const grouped = BURST_SFX.has(name);
  const key = grouped ? `${name}:${bread ?? 'kosong'}` : name;
  const gap = grouped ? SLAP_GAP_MS : (MIN_GAP_MS[name] ?? SAME_GAP_MS);
  const prev = h.last[key];
  if (prev !== undefined && now - prev < gap) return null;
  const burst = h.burst.filter((t) => now - t < BURST_WINDOW_MS);
  if (grouped && burst.length >= BURST_MAX) return null;
  return { last: { ...h.last, [key]: now }, burst: grouped ? [...burst, now] : burst };
}

// ── Dough slap (throw and hit) ──────────────────────────────────────────────────────────────────────────────
// A slap is three layers built on the ZzFX AudioContext: a bandpassed noise crack (fast attack, 40-90 ms decay),
// a soft sine thump (~90-170 Hz, pitch dropping into the note), and an optional very quiet high-passed tawa sizzle.

export type SlapProfile = {
  readonly crackHz: number;
  readonly crackQ: number;
  readonly crackMs: number;
  readonly crackGain: number;
  readonly thumpHz: number;
  readonly thumpMs: number;
  readonly thumpGain: number;
  /** Sizzle tail level; 0 = none. */
  readonly sizzle: number;
};

const KOSONG_SLAP: SlapProfile = { crackHz: 1600, crackQ: 1.2, crackMs: 70, crackGain: 0.6, thumpHz: 115, thumpMs: 60, thumpGain: 0.5, sizzle: 0.05 };

/** Per-bread voice. Breads not listed (naan, idli, evolutions, ...) use the kosong slap. */
export const SLAP_PROFILES: Partial<Record<BreadId, SlapProfile>> = {
  kosong: KOSONG_SLAP,
  // thin crisp papery snap: higher, shorter, almost no thump
  tissue: { crackHz: 2400, crackQ: 2, crackMs: 40, crackGain: 0.7, thumpHz: 170, thumpMs: 35, thumpGain: 0.12, sizzle: 0 },
  // heavy wet thud: lower, longer, the most thump
  murtabak: { crackHz: 900, crackQ: 1, crackMs: 90, crackGain: 0.55, thumpHz: 90, thumpMs: 130, thumpGain: 0.95, sizzle: 0.02 },
  // crisp crackle with a tawa tail
  thosai: { crackHz: 2200, crackQ: 1.4, crackMs: 45, crackGain: 0.6, thumpHz: 125, thumpMs: 50, thumpGain: 0.25, sizzle: 0.16 },
  // dry pat
  chapati: { crackHz: 1300, crackQ: 1.8, crackMs: 45, crackGain: 0.6, thumpHz: 110, thumpMs: 60, thumpGain: 0.35, sizzle: 0 },
  // soft spongy pop
  appam: { crackHz: 950, crackQ: 0.9, crackMs: 85, crackGain: 0.4, thumpHz: 100, thumpMs: 90, thumpGain: 0.6, sizzle: 0.04 },
};

export type SlapPlan = SlapProfile & { readonly pitch: number };

/** The concrete voice for one play: the bread's profile with a random pitch of +-6% so repeats do not machine-gun. */
export function slapPlan(bread: BreadId | undefined, rnd: () => number): SlapPlan {
  const base = (bread !== undefined ? SLAP_PROFILES[bread] : undefined) ?? KOSONG_SLAP;
  return { ...base, pitch: 1 + (rnd() * 2 - 1) * 0.06 };
}

/** Fast attack, exponential decay to silence. */
function envelope(param: AudioParam, at: number, peak: number, attack: number, decay: number): void {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(Math.max(peak, 0.0001), at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

let noiseBuf: AudioBuffer | null = null;

function noiseSource(ctx: AudioContext, at: number, dur: number): AudioBufferSourceNode {
  noiseBuf ??= (() => {
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  })();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.start(at, Math.random() * 0.3, dur);
  return src;
}

function playSlap(ctx: AudioContext, p: SlapPlan, level: number): void {
  const t = ctx.currentTime;
  const out = ctx.destination;

  const crack = noiseSource(ctx, t, p.crackMs / 1000 + 0.02);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = p.crackHz * p.pitch;
  band.Q.value = p.crackQ;
  const crackGain = ctx.createGain();
  envelope(crackGain.gain, t, p.crackGain * level, 0.002, p.crackMs / 1000);
  crack.connect(band).connect(crackGain).connect(out);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(p.thumpHz * 1.3 * p.pitch, t);
  osc.frequency.exponentialRampToValueAtTime(p.thumpHz * p.pitch, t + 0.03);
  const thumpGain = ctx.createGain();
  envelope(thumpGain.gain, t, p.thumpGain * level, 0.004, p.thumpMs / 1000);
  osc.connect(thumpGain).connect(out);
  osc.start(t);
  osc.stop(t + p.thumpMs / 1000 + 0.02);

  if (p.sizzle > 0) {
    const sizzle = noiseSource(ctx, t + 0.01, 0.25);
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 4000;
    const sizzleGain = ctx.createGain();
    envelope(sizzleGain.gain, t + 0.01, p.sizzle * level, 0.01, 0.18);
    sizzle.connect(high).connect(sizzleGain).connect(out);
  }
}

type Sound = { play: () => unknown };

type ZzfxModule = {
  ZZFX: { audioContext: AudioContext };
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

/** `bread` picks the voice for throw and hit; anything else falls back to the kosong slap. */
export function playSfx(name: SfxName, bread?: BreadId): void {
  if (!enabled) return;
  ensureLoaded();
  if (!zzfx || zzfx.ZZFX.audioContext.state !== 'running') return;
  const next = admitSfx(history, name, Date.now(), bread);
  if (!next) return;
  history = next;
  try {
    if (name === 'throw' || name === 'hit') {
      playSlap(zzfx.ZZFX.audioContext, slapPlan(bread, Math.random), name === 'throw' ? 0.35 : 0.6);
      return;
    }
    // ponytail: each ZzFX sound is synthesized on its first play (up to ~100 ms for the long ones);
    // prebuild in idle time if that first-play hitch shows up on device.
    (sounds[name] ??= new zzfx.ZZFXSound([...SFX_PARAMS[name]])).play();
  } catch {
    // audio can fail on old WebViews; a missing sound must never break the game
  }
}
