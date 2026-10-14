// Procedural chiptune BGM (WebAudio, no audio files). Carnatic-flavoured: Mayamalavagowla main loop, Mohanam bridge,
// Hanumatodi for bosses; nadaswaram-ish pulse lead with gamaka slides, tanpura-like drone, thavil/mridangam-style drums.
// The pure parts (scales, bar generation, step maths) are exported for tests; the voices below only run in a browser.

export type ModeName = 'mayamalavagowla' | 'mohanam' | 'hanumatodi';
/** Semitones above Sa. Mayamalavagowla: S r1 G3 M1 P d1 N3. Mohanam: S R2 G3 P D2. Hanumatodi: S r1 g2 M1 P d1 n2. */
export const MODES: Record<ModeName, readonly number[]> = {
  mayamalavagowla: [0, 1, 4, 5, 7, 8, 11],
  mohanam: [0, 2, 4, 7, 9],
  hanumatodi: [0, 1, 3, 5, 7, 8, 10],
};

export const SA = 60; // C4
export const BPM = 156;
export const BOSS_BPM = 168;
export const stepSeconds = (bpm: number): number => 60 / bpm / 4; // one 16th note

export const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Scale degree index (may be negative or beyond the octave) to a MIDI note above `base`. */
export function degreeMidi(mode: ModeName, idx: number, base: number): number {
  const s = MODES[mode];
  const oct = Math.floor(idx / s.length);
  return base + oct * 12 + s[idx - oct * s.length];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 16-step lead rhythms; the 3+3+2 groupings (tisram feel inside a chatusram bar) come first. */
export const RHYTHMS: readonly (readonly number[])[] = [
  [0, 3, 6, 8, 11, 14],
  [0, 2, 4, 6, 8, 10, 12, 14],
  [0, 3, 6, 8, 10, 12, 14, 15],
  [0, 4, 6, 8, 12, 14],
  [0, 1, 2, 3, 6, 8, 11, 12, 13, 14],
];
/** Drum accents (kick) on the same 3+3+2 grouping. */
export const KICK_STEPS = [0, 3, 6, 8, 11, 14] as const;
export const PHRASE_ROOTS = [0, 0, 4, 0] as const; // bass root per bar of a 4-bar phrase: Sa Sa Pa Sa

export type LeadNote = { step: number; len: number; idx: number; gamaka: -1 | 0 | 1 };
export type Bar = { lead: LeadNote[]; root: number; fill: boolean };
export type Section = { mode: ModeName; bars: Bar[]; bpm: number; leadBase: number };

export function genSection(mode: ModeName, bars: number, seed: number, bpm: number, leadBase = SA + 12): Section {
  const rnd = mulberry32(seed);
  const n = MODES[mode].length;
  const out: Bar[] = [];
  let idx = 0;
  for (let b = 0; b < bars; b++) {
    const phrasePos = b % 4;
    const rh = RHYTHMS[phrasePos === 0 ? (seed + b) % 2 === 0 ? 0 : 3 : Math.floor(rnd() * RHYTHMS.length)];
    const lead: LeadNote[] = rh.map((step, i) => {
      const last = i === rh.length - 1;
      if (i === 0 && phrasePos === 0) idx = rnd() < 0.5 ? 0 : 4 % n;
      else if (last && phrasePos === 3) idx = rnd() < 0.6 ? 0 : Math.min(4, n - 1);
      else idx = Math.max(-2, Math.min(n + 3, idx + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd() * 8)]));
      const len = (rh[i + 1] ?? 16) - step;
      const gamaka = rnd() < 0.3 ? (rnd() < 0.5 ? -1 : 1) : 0;
      return { step, len, idx, gamaka };
    });
    out.push({ lead, root: PHRASE_ROOTS[phrasePos], fill: phrasePos === 3 });
  }
  return { mode, bars: out, bpm, leadBase };
}

const SEC_A = genSection('mayamalavagowla', 8, 11, BPM);
const SEC_B = genSection('mohanam', 8, 23, BPM);
const SEC_BOSS = genSection('hanumatodi', 8, 37, BOSS_BPM, SA);
/** A, B, A again (the repeat plays an octave up, see barAt). */
export const SONG = [SEC_A, SEC_B, SEC_A] as const;
export const SONG_BARS = SONG.reduce((n, s) => n + s.bars.length, 0);

/** Where a global bar counter lands in the song. `lap` flips on the repeat of A so it can be varied. */
export function barAt(barIndex: number, boss: boolean): { section: Section; bar: Bar; octUp: boolean; barInSection: number } {
  if (boss) {
    const i = barIndex % SEC_BOSS.bars.length;
    return { section: SEC_BOSS, bar: SEC_BOSS.bars[i], octUp: false, barInSection: i };
  }
  let i = barIndex % SONG_BARS;
  for (let s = 0; s < SONG.length; s++) {
    if (i < SONG[s].bars.length) return { section: SONG[s], bar: SONG[s].bars[i], octUp: s === 2, barInSection: i };
    i -= SONG[s].bars.length;
  }
  throw new Error('unreachable');
}

/** Start times (AudioContext seconds) of the steps that fall before `now + ahead`, given the next unscheduled step time. */
export function stepsDue(next: number, now: number, ahead: number, dur: number): number[] {
  const out: number[] = [];
  for (let t = next; t < now + ahead; t += dur) out.push(t);
  return out;
}

/** What plays on one 16th step (0..15 of a bar) at an intensity 0..1. Pure, so the layering rules are testable. */
export function stepPlan(step: number, barNo: number, fill: boolean, intensity: number, boss: boolean) {
  const accent = (KICK_STEPS as readonly number[]).includes(step);
  const inFill = fill && barNo % 4 === 3 && step >= 12; // "ta-ka-dhi-mi" every 4 bars
  return {
    kick: accent && !inFill,
    snare: (step === 4 || step === 12) && !inFill,
    hat: !inFill && (intensity >= 0.5 || boss ? true : step % 2 === 0),
    fillTom: inFill, // 4 rolling toms
    thavilRoll: !inFill && intensity >= 0.7 && step % 4 === 3, // rolling 32nd toms at the end of the beat
    arp: intensity >= 0.25 || boss,
    bassPulse: intensity >= 0.4 || boss, // octave 8ths under the root
  };
}

// ---------------------------------------------------------------- voices (browser only)

const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const BASE_VOLUME = 0.1; // sfx are far louder than this

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let vib: GainNode | null = null; // shared vibrato depth (cents) into every lead's detune
let drone: GainNode | null = null;
let droneOscs: OscillatorNode[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let stepNo = 0;
let wanted = false; // a run is on
let enabled = true;
let paused = false;
let intensity = 0.2;
let boss = false;

function init(): boolean {
  if (ctx) return true;
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return false;
  try {
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = BASE_VOLUME;
    bus.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.8;
    vib = ctx.createGain();
    vib.gain.value = 14;
    lfo.connect(vib);
    lfo.start();
    document.addEventListener('visibilitychange', () => (document.hidden ? suspend() : resumeIf()));
    return true;
  } catch {
    ctx = null;
    return false;
  }
}

function env(g: GainNode, t: number, peak: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.setValueAtTime(peak, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, slide = 0.04, vibrato = false): void {
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.linearRampToValueAtTime(f1, t + slide);
  if (vibrato && vib) vib.connect(o.detune);
  env(g, t, peak, dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hit(kind: 'snare' | 'hat', t: number, peak: number): void {
  if (!ctx || !bus || !noise) return;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7500 : 1800;
  const dur = kind === 'hat' ? 0.03 : 0.09;
  env(g, t, peak, dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.5, dur + 0.02);
}

function startDrone(): void {
  if (!ctx || !bus || drone) return;
  drone = ctx.createGain();
  drone.gain.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  drone.connect(lp).connect(bus);
  droneOscs = ([['sawtooth', SA - 12, 0.5], ['triangle', SA - 5, 0.7], ['sawtooth', SA, 0.25]] as const).map(([type, m, v]) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type;
    o.frequency.value = midiHz(m);
    g.gain.value = v * 0.35;
    o.connect(g).connect(drone!);
    o.start();
    return o;
  });
}

function stopDrone(): void {
  for (const o of droneOscs) try { o.stop(); } catch { /* already stopped */ }
  droneOscs = [];
  drone?.disconnect();
  drone = null;
}

function scheduleStep(t: number): void {
  const { section, bar, octUp, barInSection } = barAt(Math.floor(stepNo / 16), boss);
  const step = stepNo % 16;
  const dur = stepSeconds(section.bpm);
  const p = stepPlan(step, barInSection, bar.fill, intensity, boss);
  const mode = section.mode;

  if (drone && step % 4 === 0) { // tanpura-ish pulse: dip on the beat, swell back
    drone.gain.setValueAtTime(0.25, t);
    drone.gain.linearRampToValueAtTime(0.6, t + dur * 3.5);
  }
  if (p.kick) tone('triangle', 170, 45, t, 0.13, 0.9, 0.1);
  if (p.snare) hit('snare', t, 0.45);
  if (p.hat) hit('hat', t, step % 2 === 0 ? 0.2 : 0.1);
  if (p.fillTom) tone('triangle', 200 - (step - 12) * 25, 90, t, 0.1, 0.6, 0.07); // dha-ki-ta-ka down the drum
  if (p.thavilRoll) for (let k = 0; k < 2; k++) tone('triangle', 130, 80, t + (k * dur) / 2, 0.05, 0.3, 0.04);

  // bass: Sa/Pa, on the same 3+3+2 accents, octave 8ths when it's hot
  const rootMidi = degreeMidi(mode, bar.root, SA - 24);
  if ((KICK_STEPS as readonly number[]).includes(step)) tone('triangle', midiHz(step === 6 || step === 14 ? rootMidi + (bar.root === 0 ? 7 : 0) : rootMidi), midiHz(rootMidi), t, dur * 2.6, 0.55, 0.02);
  else if (p.bassPulse && step % 2 === 0) tone('square', midiHz(rootMidi + 12), midiHz(rootMidi + 12), t, dur * 0.8, 0.12, 0);

  // counter-melody: broken chord on the bar's root, 16ths
  if (p.arp) {
    const a = [0, 2, 4, 2][step % 4] + bar.root;
    const m = degreeMidi(mode, a, SA) + (step % 8 >= 4 ? 12 : 0);
    tone('square', midiHz(m), midiHz(m), t, dur * 0.9, 0.07, 0);
  }

  // lead: nadaswaram-ish pulse with vibrato; a gamaka starts a scale step away and slides in over ~45 ms
  const n = bar.lead.find((x) => x.step === step);
  if (n) {
    const base = section.leadBase + (octUp ? 12 : 0);
    const m = degreeMidi(mode, n.idx, base);
    const from = n.gamaka ? degreeMidi(mode, n.idx + n.gamaka, base) : m;
    tone('square', midiHz(from), midiHz(m), t, Math.max(0.08, n.len * dur * 0.95), 0.2, 0.045, true);
    if (boss) tone('sawtooth', midiHz(m - 12), midiHz(m - 12), t, n.len * dur * 0.9, 0.1, 0);
  }
}

function tick(): void {
  if (!ctx || paused || !wanted) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  const { section } = barAt(Math.floor(stepNo / 16), boss);
  const dur = stepSeconds(section.bpm);
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // fell behind (tab throttled): don't burst
  for (const t of stepsDue(nextTime, ctx.currentTime, LOOKAHEAD, dur)) {
    try { scheduleStep(t); } catch { /* a bad note must not stop the music */ }
    stepNo++;
    nextTime = t + stepSeconds(barAt(Math.floor(stepNo / 16), boss).section.bpm);
  }
}

function run(): void {
  if (timer || !wanted || !enabled || paused || !init()) return;
  startDrone();
  nextTime = ctx!.currentTime + 0.1;
  timer = setInterval(tick, TICK_MS);
}

function halt(): void {
  if (timer) clearInterval(timer);
  timer = null;
  stopDrone();
}

function suspend(): void {
  if (wanted && ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
}
function resumeIf(): void {
  if (wanted && !paused && ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

/** A run started (call from the run start, which follows a tap). Restarts the song from bar 0. */
export function startMusic(): void {
  halt();
  wanted = true;
  paused = false;
  stepNo = 0;
  boss = false;
  intensity = 0.2;
  run();
}
/** The run ended or was quit. */
export function stopMusic(): void {
  wanted = false;
  halt();
}
export function pauseMusic(): void {
  paused = true;
  halt();
}
export function resumeMusic(): void {
  paused = false;
  run();
}
export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!on) halt();
  else run();
}
/** 0..1: how hot the run is (pressure / distance). Adds layers. */
export function setMusicIntensity(v: number): void {
  intensity = Math.max(0, Math.min(1, v));
}
/** Boss on screen: minor, heavier, faster. Restarts the loop on its first bar. */
export function setMusicBoss(on: boolean): void {
  if (on === boss) return;
  boss = on;
  stepNo = 0;
}
/** Dip the music under a heavy sfx for ~0.25 s. */
export function duckMusic(): void {
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(BASE_VOLUME * 0.5, t);
  bus.gain.linearRampToValueAtTime(BASE_VOLUME, t + 0.3);
}
