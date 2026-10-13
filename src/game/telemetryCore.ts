// What the game tells analytics, as pure functions (no PostHog, no DOM): the names, the properties, and the guard that keeps
// anything but short labels and numbers from leaving the phone. telemetry.ts wires these to posthog-js and the hub.
// Events (every one also carries app + version, see baseProps):
//   app_open {version} · run_start {chapter, seed} · run_end {wave, won, kills, secs, level} · level_up {level}
//   card_pick {kind, id} · boss_spawn {name} · feedback_sent {kind}
// The note's words never go anywhere from here; they travel only to the game-feedback function.
import type { Card, RunResult } from '@/core/types';

import type { AppInfo } from './appInfo';

export const APP = 'prata-raja';

export type Props = Record<string, string | number | boolean>;
export type Evt = readonly [name: string, props: Props];

/** The properties on every event. `version` and `app_version` are the same value: the second is what the Apps and Pilot
 *  dashboards already group by. */
export function baseProps(info: AppInfo | null): Props {
  const out: Props = { app: APP, platform: info?.platform ?? 'web' };
  if (info?.version) {
    out.version = info.version;
    out.app_version = info.version;
  }
  if (info?.updateId) out.update_id = info.updateId;
  return out;
}

/** The page was opened with ?bot=1 (the self-playing test mode) or ?test=1: automation or a check, not a person. Such sessions
 *  are tagged, so the charts can leave them out. */
export const isTestRun = (search: string): boolean => /[?&](bot|test)=/.test(search);

const LABEL = /^[\w .:/+'’-]{0,64}$/;

/** Numbers (finite), booleans and short labels only: anything else is dropped, never truncated. */
export function cleanProps(props: Record<string, unknown>): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(k)) continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string' && LABEL.test(v)) out[k] = v;
  }
  return out;
}

// ── Events the hub already announces: telemetry derives them itself (richer than the renderer's own track() calls) ──

export const runStartEvent = (p: { seed: number; chapter?: string | number }, defaultChapter: string | number): Evt => [
  'run_start',
  { chapter: p.chapter ?? defaultChapter, seed: p.seed },
];

export const runEndEvent = (r: Pick<RunResult, 'wave' | 'won' | 'kills' | 'time' | 'level'>): Evt => [
  'run_end',
  { wave: r.wave, won: r.won, kills: r.kills, secs: Math.round(r.time), level: r.level },
];

export const levelUpEvent = (level: number): Evt => ['level_up', { level }];
export const bossEvent = (name: string): Evt => ['boss_spawn', { name }];

/** Heal and gold cards have no item id: they report their kind in its place. */
export const cardPickEvent = (card: Pick<Card, 'kind' | 'id'>): Evt => ['card_pick', { kind: card.kind, id: card.id || card.kind }];

export const feedbackSentEvent = (kind: string): Evt => ['feedback_sent', { kind }];

/** The renderer (RunScene) still calls bridge.track for these four. Telemetry reports them from the hub with more detail, so
 *  the renderer's copies are dropped here: nothing is sent twice. Any other event the renderer adds later passes through. */
export const RENDERER_COVERED: ReadonlySet<string> = new Set(['run_start', 'run_end', 'level_up', 'card_pick']);

/**
 * level_up from the hub: its `levelUp` also fires again when a reroll re-opens the same offer, so only a higher level than
 * the last one reported counts. `reset()` at each run start.
 */
export function levelUpCounter() {
  let last = 0;
  return {
    reset: () => {
      last = 0;
    },
    next(level: number): Evt | null {
      if (!(level > last)) return null;
      last = level;
      return levelUpEvent(level);
    },
  };
}
