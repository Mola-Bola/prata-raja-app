// A simple bot for balance sims and tests: dodges what is about to land, otherwise stands still and throws.
import { MAX_BREADS } from './cards';
import { chooseCard, createRun, drainEvents, step } from './sim';
import { dangers, type Danger } from './sim/danger';
import { FIELD, type Card, type Content, type Loadout, type RunInput, type RunResult, type World } from './types';

/** Extra clearance around a danger, on top of Kannan's half-width already counted in it. */
const MARGIN = 14;
/** Seconds a danger has to be on screen before the bot reacts (a person needs a moment to see it and drag). */
const REACTION = 0.3;
const GRID = 10;
/** Column picker: field split into bins this wide. */
const BIN = 40;
const BINS = Math.ceil((FIELD.halfWidth * 2) / BIN);

const unsafeAt = (ds: Danger[], x: number): boolean => ds.some((d) => Math.abs(x - d.x) <= d.half + MARGIN);

/** Nearest x that is clear of every danger; if none is clear, the x farthest from the closest edge. */
function safestX(ds: Danger[], from: number): number {
  let best = from;
  let bestCost = Infinity;
  for (let x = -FIELD.kannanMaxX; x <= FIELD.kannanMaxX; x += GRID) {
    if (!unsafeAt(ds, x)) {
      const cost = Math.abs(x - from);
      if (cost < bestCost) {
        best = x;
        bestCost = cost;
      }
    }
  }
  if (bestCost < Infinity) return best;
  let room = -Infinity;
  for (let x = -FIELD.kannanMaxX; x <= FIELD.kannanMaxX; x += GRID) {
    const r = Math.min(...ds.map((d) => Math.abs(x - d.x) - d.half));
    if (r > room) {
      best = x;
      room = r;
    }
  }
  return best;
}

const raw = new Array<number>(BINS).fill(0);
const smooth = new Array<number>(BINS).fill(0);
/** Enemy weight per column bin (closer to the counter counts more), lightly smoothed into neighbours. Returns a shared array. */
function columnScores(w: World): number[] {
  raw.fill(0);
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const bin = Math.min(BINS - 1, Math.max(0, Math.floor((e.x + FIELD.halfWidth) / BIN)));
    raw[bin] += (e.boss ? 3 : 1) / (1 + e.y / 250);
  }
  for (let i = 0; i < BINS; i++) smooth[i] = raw[i] + 0.5 * ((raw[i - 1] ?? 0) + (raw[i + 1] ?? 0));
  return smooth;
}
const binOf = (x: number): number => Math.min(BINS - 1, Math.max(0, Math.floor((x + FIELD.halfWidth) / BIN)));
const binCentre = (bin: number): number => Math.max(-FIELD.kannanMaxX, Math.min(FIELD.kannanMaxX, -FIELD.halfWidth + bin * BIN + BIN / 2));

/** What a player would do this frame. Dodge first (an enemy shot, boss tell or aim lands near Kannan's x), then settle under
 *  the densest enemy column, but only when the gain is clear: moving stops the throwing. */
export function autoInput(w: World): RunInput {
  const p = w.player;
  const ds = dangers(w, REACTION);
  if (ds.length > 0 && (unsafeAt(ds, p.x) || unsafeAt(ds, p.targetX))) {
    const x = safestX(ds, p.x);
    return { targetX: x, moving: Math.abs(x - p.x) > 1 };
  }
  if (Math.abs(p.targetX - p.x) > 1) return { targetX: p.targetX, moving: true };
  const score = columnScores(w);
  let best = 0;
  for (let i = 1; i < BINS; i++) if (score[i] > score[best]) best = i;
  const here = binOf(p.x);
  if (Math.abs(best - here) >= 2 && score[best] >= 1.5 * score[here] + 0.8) {
    const x = binCentre(best);
    if (!unsafeAt(ds, x)) return { targetX: x, moving: true };
  }
  return { targetX: null, moving: false };
}

/** Pick policy. maxBreads: take new bread cards until Kannan holds this many (1 = a solo-Kosong build). */
export type BotOptions = { maxBreads?: number };

const PASSIVE_BONUS: Record<string, number> = {
  'strong-wrists': 8, 'fast-flip': 8, 'extra-dough': 9, 'lucky-towel': 4, 'thick-skin': 5, 'kopi-break': 5, 'big-dough': 3, 'sharp-eye': 2,
};

/** Card value for the bot: bread cards first (upgrades, then new breads while there is room), then new dips, dip upgrades,
 *  passives (damage and speed before the rest); a heal only when low. */
function cardValue(w: World, card: Card, maxBreads: number): number {
  const p = w.player;
  switch (card.kind) {
    case 'evolve':
      return 200;
    case 'bread':
      if (p.breads.some((b) => b.id === card.id)) return 100;
      return p.breads.length < maxBreads ? 95 : 0;
    case 'dip':
      return p.dips.some((d) => d.id === card.id) ? 70 : 80;
    case 'passive':
      return 60 + (PASSIVE_BONUS[card.id] ?? 0);
    case 'heal':
      return p.hp < p.stats.maxHp * 0.4 ? 90 : 30;
    default:
      return 10;
  }
}

/** Index of the card to take from world.offer. */
export function autoPick(w: World, o: BotOptions = {}): number {
  const maxBreads = o.maxBreads ?? MAX_BREADS;
  let best = 0;
  let bestValue = -Infinity;
  w.offer.forEach((card, i) => {
    const v = cardValue(w, card, maxBreads);
    if (v > bestValue) {
      best = i;
      bestValue = v;
    }
  });
  return best;
}

/** One whole run with the bot at 30 steps per second. Ends on win, loss or maxTime sim-seconds (then won = false). */
export function simulateRun(opts: BotOptions & { seed: number; content: Content; maxTime?: number; chapterId?: string; loadout?: Loadout }): RunResult {
  const world = createRun({ seed: opts.seed, content: opts.content, chapterId: opts.chapterId, loadout: opts.loadout });
  const maxTime = opts.maxTime ?? 1200;
  const dt = 1 / 30;
  // The cap only guards against a pick that never resolves (time does not move while a card is pending).
  for (let i = 0; i < maxTime * 60 + 1000 && world.phase !== 'won' && world.phase !== 'lost' && world.time < maxTime; i++) {
    if (world.phase === 'levelup') chooseCard(world, autoPick(world, opts));
    else step(world, dt, autoInput(world));
    drainEvents(world);
  }
  const p = world.player;
  return world.result ?? {
    chapterId: world.chapter.id, bossAttempted: world.bossAttempted ?? false,
    won: false, wave: world.wave, kills: world.kills, bossKills: world.bossKills, time: world.time, level: p.level, gold: Math.round(world.gold),
    dipUseXp: { ...world.dipUseXp },
    breads: p.breads.map((b) => ({ ...b })), dips: p.dips.map((d) => ({ ...d })),
  };
}
