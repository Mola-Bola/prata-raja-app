// Owner-side Tune panel storage (localStorage `prata-raja/tune`). Never touches the save or telemetry; the overlay is applied
// to CONTENT only when a run is created (tunedContent). `?tune=1` turns the panel on and it stays on until `?tune=0`.
import { CONTENT } from '@/content';
import { applyTune, cleanOverrides, PRES_DEFAULTS, tuneKnobs, type Knob, type Overrides } from '@/core/tune';

const KEY = 'prata-raja/tune';
const ON = 'prata-raja/tune-on';
export const KNOBS: Knob[] = tuneKnobs(CONTENT);

const ls = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
let cache: Overrides | null = null;
let tuned: { src: Overrides; content: typeof CONTENT } | null = null;

export function getOverrides(): Overrides {
  if (!cache) {
    try { cache = cleanOverrides(JSON.parse(ls()?.getItem(KEY) ?? '{}'), KNOBS); } catch { cache = {}; }
  }
  return cache;
}
export function setOverrides(next: Overrides): void {
  cache = cleanOverrides(next, KNOBS);
  tuned = null;
  try { if (Object.keys(cache).length) ls()?.setItem(KEY, JSON.stringify(cache)); else ls()?.removeItem(KEY); } catch { /* private mode */ }
}
export const isTuned = (): boolean => Object.keys(getOverrides()).length > 0;
/** The content a new run should use: CONTENT itself when nothing is tuned. */
export function tunedContent(): typeof CONTENT {
  const o = getOverrides();
  if (!Object.keys(o).length) return CONTENT;
  if (!tuned || tuned.src !== o) tuned = { src: o, content: applyTune(CONTENT, o) };
  return tuned.content;
}
export const pres = (k: keyof typeof PRES_DEFAULTS): number => getOverrides()[`pres.${k}`] ?? PRES_DEFAULTS[k];

/** Reads `?tune=1|0` once and returns whether the panel is enabled (persisted). */
export function tuneEnabled(): boolean {
  try {
    const q = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tune');
    if (q === '1') ls()?.setItem(ON, '1');
    if (q === '0') { ls()?.removeItem(ON); ls()?.removeItem(KEY); cache = {}; tuned = null; }
    return ls()?.getItem(ON) === '1';
  } catch { return false; }
}

export function tuneJson(): string {
  return JSON.stringify({ tune: 'prata-raja', note: 'L1-based for breads/dips: every level is scaled by value/default. enemies.all.* and director.pressure are multipliers.', overrides: Object.fromEntries(Object.entries(getOverrides()).map(([id, v]) => [id, +v.toFixed(4)])) }, null, 2);
}
