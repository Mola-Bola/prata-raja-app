// Procedural sound effects (ZzFX, no audio files). Roti hits and throws are WebAudio dough slaps (below).
// zzfx is imported lazily: importing it creates an AudioContext, which would throw in SSR and node.
import type { BreadId } from '@/core/types';

export type SfxName =
  | 'throw'
  | 'hit'
  | 'crit'
  | 'kill'
  | 'blast'
  | 'splash'
  | 'meteor'
  | 'zone'
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
  | 'uiTap'
  | 'step'
  | 'stationOpen'
  | 'stationClose'
  | 'enhance'
  | 'fuse'
  | 'socket'
  | 'dash'
  | 'cook';

// ZzFX params, in order: volume, randomness, frequency, attack, sustain, release, shape,
// shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
// bitCrush, delay, sustainVolume, decay, tremolo, filter.
// shape: 0 sine, 1 triangle, 2 saw, 3 clipped tan, 4 sin(t^3) texture, 5+ square (duty = shapeCurve/2).
// randomness .05 gives +-5% pitch per play; 0 keeps repeats identical.
// filter: negative = lowpass, positive = highpass.
// throw and hit are not here: they are dough slaps (SLAP_PROFILES); crit, blast, splash, meteor, zone and freeze are
// WebAudio combat voices (see playCombat).
/** Sounds synthesized with raw WebAudio instead of ZzFX. */
export type ProcName = 'crit' | 'blast' | 'splash' | 'meteor' | 'zone' | 'freeze';
const PROC: ReadonlySet<string> = new Set<ProcName>(['crit', 'blast', 'splash', 'meteor', 'zone', 'freeze']);
/** Quiet hub and kitchen cues, WebAudio too (see LIGHT). They skip the combat voice cap so footsteps never steal a crit's voice. */
export type LightName = 'step' | 'stationOpen' | 'stationClose' | 'enhance' | 'fuse' | 'socket' | 'dash' | 'cook';

export const SFX_PARAMS: Record<Exclude<SfxName, 'throw' | 'hit' | ProcName | LightName>, readonly number[]> = {
  // small pop
  kill: [0.6, 0.05, 260, 0.002, 0, 0.085, 0, 1, 5, 0, 0, 0, 0, 0.05, 0, 0, 0, 1, 0, 0, -700],
  // quick zappy crackle
  chain: [0.45, 0, 720, 0.002, 0.03, 0.12, 2, 1, -7, 0, 0, 0, 0, 0.25, 0, 0.04, 0, 1, 0, 0, -1500],
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
const MIN_GAP_MS: Partial<Record<SfxName, number>> = { playerHurt: 450, crit: 90, blast: 90, splash: 110, meteor: 220, zone: 260, freeze: 120, step: 90 };
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


// ── Combat voices (crit crunch and area effects) ────────────────────────────────────────────────────────────
// Global cap: at most MAX_VOICES of these sound at once, so a screen of explosions cannot stack into a wall of noise.
const MAX_VOICES = 6;
const voiceEnds: number[] = [];

/** True (and the voice is booked) when there is room for one more combat voice lasting `dur` seconds. */
export function admitVoice(ends: number[], now: number, dur: number, max = MAX_VOICES): boolean {
  for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= now) ends.splice(i, 1);
  if (ends.length >= max) return false;
  ends.push(now + dur);
  return true;
}

function tone(ctx: AudioContext, t: number, type: OscillatorType, f0: number, f1: number, glide: number, gain: number, attack: number, decay: number): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  const g = ctx.createGain();
  envelope(g.gain, t, gain, attack, decay);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + attack + decay + 0.02);
}

function noise(ctx: AudioContext, t: number, type: BiquadFilterType, f0: number, f1: number, q: number, gain: number, attack: number, decay: number): void {
  const n = noiseSource(ctx, t, attack + decay + 0.02);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  const g = ctx.createGain();
  envelope(g.gain, t, gain, attack, decay);
  n.connect(f).connect(g).connect(ctx.destination);
}

/** [duration s, play] per procedural combat sound. `v` is a random pitch factor of +-8%. */
const COMBAT: Record<ProcName, readonly [number, (c: AudioContext, t: number, v: number) => void]> = {
  // Biting a crisp edge: a bright noise burst plus 5 tiny high-passed clicks, 3-8 ms each, spread over ~60 ms.
  crit: [0.12, (c, t, v) => {
    noise(c, t, 'highpass', 3200 * v, 5000 * v, 0.7, 0.35, 0.002, 0.05);
    for (let i = 0; i < 5; i++) noise(c, t + 0.004 + i * 0.012 + Math.random() * 0.006, 'highpass', (4500 + Math.random() * 3000) * v, 7000, 1, 0.28, 0.0008, 0.003 + Math.random() * 0.005);
    tone(c, t, 'triangle', 1900 * v, 1300 * v, 0.03, 0.12, 0.001, 0.04);
  }],
  // Curry splash: a wet "splort", lowpassed noise that opens then closes, with a falling blip.
  splash: [0.2, (c, t, v) => {
    noise(c, t, 'lowpass', 500 * v, 1500 * v, 2.5, 0.5, 0.012, 0.13);
    tone(c, t, 'sine', 420 * v, 130 * v, 0.1, 0.35, 0.004, 0.11);
    tone(c, t + 0.07, 'sine', 300 * v, 110 * v, 0.07, 0.2, 0.003, 0.07);
  }],
  // Roti bomb / heat blast: punchy low thump, then a sizzle tail.
  blast: [0.5, (c, t, v) => {
    tone(c, t, 'sine', 150 * v, 42 * v, 0.12, 0.85, 0.003, 0.2);
    noise(c, t, 'lowpass', 900, 200, 0.8, 0.5, 0.003, 0.14);
    noise(c, t + 0.06, 'highpass', 5000, 7500, 0.6, 0.12, 0.03, 0.34);
  }],
  // Tandoor meteor: rising whoosh into a heavy boom.
  meteor: [0.7, (c, t, v) => {
    noise(c, t, 'bandpass', 300 * v, 2400 * v, 1.2, 0.35, 0.22, 0.04);
    tone(c, t + 0.26, 'sine', 110 * v, 30 * v, 0.3, 1, 0.004, 0.4);
    noise(c, t + 0.26, 'lowpass', 1200, 120, 0.7, 0.6, 0.004, 0.3);
  }],
  // Garlic thunder zone: a short buzzy zap.
  zone: [0.2, (c, t, v) => {
    tone(c, t, 'sawtooth', 1400 * v, 180 * v, 0.1, 0.22, 0.002, 0.1);
    noise(c, t, 'bandpass', 3000 * v, 1200, 3, 0.3, 0.002, 0.08);
  }],
  // Freeze shatter: glassy inharmonic tinkles over a tiny ice crack.
  freeze: [0.45, (c, t, v) => {
    noise(c, t, 'highpass', 6000, 9000, 0.7, 0.25, 0.001, 0.04);
    [2637, 3520, 4699, 5588].forEach((f, i) => tone(c, t + i * 0.035 + Math.random() * 0.01, 'sine', f * v, f * v * 0.98, 0.1, 0.16, 0.001, 0.2 + i * 0.03));
  }],
};

function playCombat(ctx: AudioContext, name: ProcName): void {
  const [dur, play] = COMBAT[name];
  if (!admitVoice(voiceEnds, ctx.currentTime, dur)) return;
  play(ctx, ctx.currentTime, 1 + (Math.random() * 2 - 1) * 0.08);
}

/** Light cues, all quiet. `v` is a random pitch factor of +-5%, drawn per play. */
const LIGHT: Record<LightName, (c: AudioContext, t: number, v: number) => void> = {
  // Soft slipper on terrazzo: a tiny lowpassed scuff with a faint thud under it.
  step: (c, t, v) => {
    noise(c, t, 'lowpass', 1400 * v, 500 * v, 1.2, 0.12, 0.002, 0.05);
    tone(c, t, 'sine', 170 * v, 110 * v, 0.03, 0.06, 0.002, 0.04);
  },
  // Light steel katori clink: a bright ring with one inharmonic overtone.
  stationOpen: (c, t, v) => {
    tone(c, t, 'sine', 2300 * v, 2280 * v, 0.01, 0.16, 0.001, 0.18);
    tone(c, t, 'sine', 3450 * v, 3400 * v, 0.01, 0.06, 0.001, 0.09);
  },
  // Same clink, softer and lower, for closing.
  stationClose: (c, t, v) => {
    tone(c, t, 'sine', 1500 * v, 1480 * v, 0.01, 0.13, 0.001, 0.14);
    tone(c, t, 'sine', 2250 * v, 2220 * v, 0.01, 0.04, 0.001, 0.08);
  },
  // Tawa sizzle, about 0.4 s: a highpassed noise bed that fades, with a few crackles on top.
  enhance: (c, t, v) => {
    noise(c, t, 'highpass', 3000 * v, 5500 * v, 0.7, 0.2, 0.02, 0.38);
    for (let i = 0; i < 6; i++) noise(c, t + 0.02 + i * 0.06 + Math.random() * 0.03, 'highpass', 5000 * v, 7000, 1, 0.1, 0.001, 0.005);
  },
  // Curry pot bubbling: three low pops, each a short falling blip.
  fuse: (c, t, v) => {
    for (let i = 0; i < 3; i++) tone(c, t + i * 0.12 + Math.random() * 0.01, 'sine', 260 * v, 170 * v, 0.05, 0.22, 0.002, 0.06);
  },
  // Katori set down on the counter: a muted clunk.
  socket: (c, t, v) => {
    tone(c, t, 'triangle', 220 * v, 140 * v, 0.03, 0.28, 0.001, 0.07);
    noise(c, t, 'lowpass', 900, 400, 0.8, 0.12, 0.001, 0.05);
  },
  // Run dodge: a quick airy whoosh, filter sweeping up.
  dash: (c, t, v) => noise(c, t, 'bandpass', 400 * v, 2200 * v, 1.2, 0.3, 0.02, 0.16),
  // Kopi pour: a short noise glide that rises as the cup fills.
  cook: (c, t, v) => noise(c, t, 'bandpass', 900 * v, 2400 * v, 2, 0.22, 0.03, 0.22),
};
/** Every light cue name; these are never ZzFX params. */
export const LIGHT_SFX: readonly SfxName[] = Object.keys(LIGHT) as LightName[];
const LIGHT_SET: ReadonlySet<string> = new Set<string>(LIGHT_SFX);

function playLight(ctx: AudioContext, name: LightName): void {
  LIGHT[name](ctx, ctx.currentTime, 1 + (Math.random() * 2 - 1) * 0.05);
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
    if (LIGHT_SET.has(name)) {
      playLight(zzfx.ZZFX.audioContext, name as LightName);
      return;
    }
    if (PROC.has(name)) {
      const ctx = zzfx.ZZFX.audioContext;
      if (name === 'crit') playSlap(ctx, slapPlan(bread, Math.random), 0.45); // the normal slap, then the crunch over it
      playCombat(ctx, name as ProcName);
      return;
    }
    // ponytail: each ZzFX sound is synthesized on its first play (up to ~100 ms for the long ones);
    // prebuild in idle time if that first-play hitch shows up on device.
    (sounds[name] ??= new zzfx.ZZFXSound([...SFX_PARAMS[name as keyof typeof SFX_PARAMS]])).play();
  } catch {
    // audio can fail on old WebViews; a missing sound must never break the game
  }
}
