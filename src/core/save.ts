// The local save: versioned JSON, tolerant parsing, pure updates. Storage itself is the bridge's job.
// OWNER: swarm builder "save".
import type { RunResult } from './types';

export const SAVE_KEY = 'prata-raja/save';

export type SaveV1 = {
  v: 1;
  bestWave: number;
  runs: number;
  wins: number;
  gold: number;
  totalKills: number;
  /** ISO time of the last finished run. */
  lastPlayed: string | null;
  settings: { sfx: boolean; music: boolean; haptics: boolean };
};

export function freshSave(): SaveV1 {
  return {
    v: 1,
    bestWave: 0,
    runs: 0,
    wins: 0,
    gold: 0,
    totalKills: 0,
    lastPlayed: null,
    settings: { sfx: true, music: true, haptics: true },
  };
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback: number): number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : fallback;
const bool = (x: unknown, fallback: boolean): boolean => (typeof x === 'boolean' ? x : fallback);
const dateOrNull = (x: unknown): string | null =>
  typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null;

/** Parse stored JSON. null, invalid JSON, a non-object or an unknown future version -> freshSave().
 *  Missing or wrongly-typed fields fall back to fresh values field by field (never throw). */
export function parseSave(json: string | null): SaveV1 {
  const fresh = freshSave();
  if (json === null) return fresh;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return fresh;
  }
  if (!isObj(raw) || raw.v !== 1) return fresh;
  const s: Record<string, unknown> = isObj(raw.settings) ? raw.settings : {};
  return {
    v: 1,
    bestWave: num(raw.bestWave, fresh.bestWave),
    runs: num(raw.runs, fresh.runs),
    wins: num(raw.wins, fresh.wins),
    gold: num(raw.gold, fresh.gold),
    totalKills: num(raw.totalKills, fresh.totalKills),
    lastPlayed: dateOrNull(raw.lastPlayed),
    settings: {
      sfx: bool(s.sfx, fresh.settings.sfx),
      music: bool(s.music, fresh.settings.music),
      haptics: bool(s.haptics, fresh.settings.haptics),
    },
  };
}

/** Pure: a new save with this run counted (runs + 1, wins + won, gold + result.gold, totalKills + kills,
 *  bestWave = max, lastPlayed = now.toISOString()). */
export function recordRun(save: SaveV1, result: RunResult, now: Date): SaveV1 {
  return {
    ...save,
    bestWave: Math.max(save.bestWave, result.wave),
    runs: save.runs + 1,
    wins: save.wins + (result.won ? 1 : 0),
    gold: save.gold + result.gold,
    totalKills: save.totalKills + result.kills,
    lastPlayed: now.toISOString(),
    settings: { ...save.settings },
  };
}
