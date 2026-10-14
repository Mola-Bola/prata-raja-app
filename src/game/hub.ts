// The one seam between the Phaser renderer (src/game/phaser/*) and the React DOM overlays (src/game/ui/*).
// The renderer owns the World and publishes; the UI listens and calls GameControls. Neither imports the other.
import type { KitchenConfig, KitchenTuning } from '@/core/kitchen';
import type { ActiveFind, Buff, Card, Loadout, OwnedBread, OwnedDip, OwnedPassive, PlayerStats, RunPhase, RunResult, SpriteKey } from '@/core/types';

export type HudState = {
  wave: number;
  waves: number;
  /** Flow runs: the chapter's name and the metres travelled / to the boss (null in wave runs). */
  route: { name: string; dist: number; bossAt: number } | null;
  /** Flow runs: the street find just handed over (null once its swap window closes). */
  find: ActiveFind | null;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  gold: number;
  kills: number;
  /** Seconds since the run started. */
  time: number;
  boss: { name: string; sprite: SpriteKey; hp: number; maxHp: number } | null;
  breads: Pick<OwnedBread, 'id' | 'level'>[];
  dips: OwnedDip[];
  passives: OwnedPassive[];
  stats: PlayerStats;
  buffs: Buff[];
  revivesLeft: number;
  dipSimmer: Loadout['dipSimmer'];
  signatureBread: Loadout['signatureBread'];
  /** Hit + DoT event damage in the last five simulation seconds, including overkill. */
  shownDps: number;
  /** Free-movement run (joystick, dodge): the run HUD is the free layout (src/game/ui/run/FreeRunHud.tsx). */
  free: boolean;
  /** The cooked meal this run carries, as a chip label ("Kopi-O kosong: +70 move speed"); null when none. */
  meal: string | null;
};

/** Hit and DoT numbers shown on screen, including overkill; not effective HP removed. */
export type KitchenStats = {
  time: number;
  wave: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  kills: number;
  damageShown: number;
  damageShownPerSecond: number;
  tuning: KitchenTuning;
  flakyKosong?: boolean;
};

/** The walkable stall hub's stations (src/game/phaser/hub/stations.ts). */
export type StationId = 'tawa' | 'dips' | 'gear' | 'pantry' | 'spec' | 'orders' | 'kopi' | 'exit';

export type HubEvents = {
  /** Kannan walked into range of a station (its panel opens) or out of range of all of them (null: it closes). */
  hubStation: { id: StationId | null };
  kitchenStart: { seed: number; tuning: KitchenTuning; flakyKosong?: boolean };
  kitchenStats: KitchenStats;
  kitchenEnd: { reason: 'won' | 'lost' | 'stopped'; stats: KitchenStats };
  /** About 10 times a second while a run is live. */
  hud: HudState;
  /** The run paused for a pick; the UI shows the cards and answers with controls.choose/reroll. */
  levelUp: { offer: Card[]; rerolls: number; level: number; /** Picks waiting including this one. */ left?: number; /** Free mode: Kannan walked into a street tiffin. The same pause, but a find choice (no reroll, no level). */ find?: boolean };
  waveStart: { wave: number; waves: number };
  boss: { name: string };
  runEnd: RunResult;
  /** The UI asked for a run and the scene is ready (hides the title screen). */
  runStart: { seed: number };
  /** The renderer held the run by itself because the page went hidden (the app was sent to the background, or the tab was
   *  switched away). The sim is already stopped: the UI opens its pause sheet, and Resume calls controls.resume(). */
  paused: { reason: 'hidden' };
};

export type GameControls = {
  /** Start a fresh run (seed defaults to a random one; loadout = stall gear + training bonuses, S2). */
  start(seed?: number, loadout?: Loadout, chapterId?: string): void;
  startKitchen(config: KitchenConfig): void;
  tuneKitchen(tuning: KitchenTuning): void;
  stopKitchen(): void;
  choose(index: number): void;
  reroll(): void;
  /** Flow runs: swap the street find just granted for alternative `index` (once, inside its window). */
  swapFind(index: number): void;
  /** Free-movement runs: press Dodge (a short i-frame dash). Ignored in counter mode. A HUD button calls this. */
  dodge(): void;
  pause(): void;
  resume(): void;
  /** Abandon the run and go back to the title. */
  quit(): void;
  // The walkable hub (HubScene). Optional: they exist once that scene has booted.
  /** Show the hub scene (the run scene sleeps). */
  hubEnter?(): void;
  /** Stop showing the hub scene (the run scene wakes). start() and startKitchen() do this themselves. */
  hubLeave?(): void;
  /** Walk Kannan to a station; its panel opens when he arrives. */
  hubWalkTo?(id: StationId): void;
  /** The panel was closed by hand: keep it shut until Kannan has walked out of that station's range. */
  hubDismiss?(): void;
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
