// The one seam between the Phaser renderer (src/game/phaser/*) and the React DOM overlays (src/game/ui/*).
// The renderer owns the World and publishes; the UI listens and calls GameControls. Neither imports the other.
import type { BreadId, Card, DipId, RunResult } from '@/core/types';

export type HudState = {
  wave: number;
  waves: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  gold: number;
  kills: number;
  /** Seconds since the run started. */
  time: number;
  boss: { name: string; hp: number; maxHp: number } | null;
  breads: { id: BreadId; level: number }[];
  dips: { id: DipId; level: number }[];
};

export type HubEvents = {
  /** About 10 times a second while a run is live. */
  hud: HudState;
  /** The run paused for a pick; the UI shows the cards and answers with controls.choose/reroll. */
  levelUp: { offer: Card[]; rerolls: number; level: number };
  waveStart: { wave: number; waves: number };
  boss: { name: string };
  runEnd: RunResult;
  /** The UI asked for a run and the scene is ready (hides the title screen). */
  runStart: { seed: number };
};

export type GameControls = {
  /** Start a fresh run (seed defaults to a random one). */
  start(seed?: number): void;
  choose(index: number): void;
  reroll(): void;
  pause(): void;
  resume(): void;
  /** Abandon the run and go back to the title. */
  quit(): void;
};

type Listener<T> = (payload: T) => void;

export type Hub = {
  on<K extends keyof HubEvents>(event: K, fn: Listener<HubEvents[K]>): () => void;
  emit<K extends keyof HubEvents>(event: K, payload: HubEvents[K]): void;
  /** Set by the renderer once its scene exists; the UI calls through it. */
  controls: GameControls | null;
};

export function createHub(): Hub {
  // One untyped map inside; the typed on/emit signatures above keep callers honest.
  const listeners = new Map<keyof HubEvents, Set<Listener<never>>>();
  return {
    controls: null,
    on(event, fn) {
      let set = listeners.get(event);
      if (!set) listeners.set(event, (set = new Set()));
      set.add(fn as Listener<never>);
      return () => set.delete(fn as Listener<never>);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((fn) => (fn as Listener<typeof payload>)(payload));
    },
  };
}
