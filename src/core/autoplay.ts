// A simple bot for balance sims and tests: dodges what is about to land, otherwise stands still and throws.
import { MAX_BREADS } from './cards';
import { swapFind } from './finds';
import { chooseCard, createRun, drainEvents, step } from './sim';
import { dangers, dangersFree, distToDanger, type Danger, type Danger2 } from './sim/danger';
import { FREE, isFreeMode } from './sim/free';
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

// ── Free mode: kite ──────────────────────────────────────────────────────────

const DIRS = 16;
const CANDIDATES = Array.from({ length: DIRS }, (_, i) => [Math.cos((2 * Math.PI * i) / DIRS), Math.sin((2 * Math.PI * i) / DIRS)] as const);
/** Pests closer than this (beyond touching) make the bot move; otherwise it stands and throws at full rate. */
const KITE_RANGE = 200;
const LOOKAHEAD = 0.35;
const WALL = 70;

/** How bad it is to stand at (x, y): crowding by pests (closer = worse), walls, and anything that is about to land. */
function risk(w: World, ds: Danger2[], x: number, y: number): number {
  let r = 0;
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const d = Math.hypot(x - e.x, y - e.y) - e.def.radius * FREE.contactScale - FIELD.kannanRadius;
    if (d < KITE_RANGE) {
      const f = 1 - Math.max(d, 0) / KITE_RANGE;
      r += (e.def.contactDps > 0 || e.boss ? 1 : 0.4) * f * f * 10 + (d < 0 ? 12 : 0);
    }
  }
  const m = Math.min(x + FIELD.kannanMaxX, FIELD.kannanMaxX - x, y - FIELD.freeMinY, FIELD.freeMaxY - y);
  if (m < WALL) r += ((WALL - m) / WALL) * 4;
  for (const d of ds) if (d.t < 1.1 && distToDanger(d, x, y) < d.half) r += 40;
  return r;
}

/** Risk units per 200 u of distance to a street gift. High on purpose: finds decide a run (no finds = 0% wins), so the bot beelines
 *  for a gift, and only a real threat (a shot about to land, 40) turns it aside. */
const GIFT_PULL = 25;
const lastDirs = new WeakMap<World, number>();
/** Free-mode bot: stand and throw until pests close in or something is about to land, then step to the least risky spot and dash out of trouble. */
function autoInputFree(w: World): RunInput {
  const p = w.player;
  const ds = dangersFree(w, REACTION);
  const here = risk(w, ds, p.x, p.y);
  const reach = p.stats.moveSpeed * FREE.speedMul * LOOKAHEAD;
  const lastDir = lastDirs.get(w) ?? -1;
  let best = -1;
  const gift = w.pickup && !w.pickup.open ? w.pickup : null;
  const pull = (x: number, y: number): number => (gift ? (GIFT_PULL * Math.hypot(x - gift.x, y - gift.y)) / 200 : 0);
  let bestRisk = here + pull(p.x, p.y) - 0.5; // staying put is the default; moving must clearly help
  for (let i = 0; i < DIRS; i++) {
    const [cx, cy] = CANDIDATES[i];
    const nx = Math.max(-FIELD.kannanMaxX, Math.min(FIELD.kannanMaxX, p.x + cx * reach));
    const ny = Math.max(FIELD.freeMinY, Math.min(FIELD.freeMaxY, p.y + cy * reach));
    const r = risk(w, ds, nx, ny) + pull(nx, ny) - (i === lastDir ? 0.6 : 0);
    if (r < bestRisk) {
      best = i;
      bestRisk = r;
    }
  }
  lastDirs.set(w, best);
  const jx = best < 0 ? 0 : CANDIDATES[best][0];
  const jy = best < 0 ? 0 : CANDIDATES[best][1];
  // Dash when a shot/tell is about to land on us, or a pest has us and the way out is clear.
  let dodge = false;
  if (p.dashCd <= 0 && best >= 0) {
    const landing = ds.some((d) => d.t < 0.22 && distToDanger(d, p.x, p.y) < d.half);
    let touching = 0;
    for (const e of w.enemies) if (e.state !== 'dead' && Math.hypot(p.x - e.x, p.y - e.y) < e.def.radius * FREE.contactScale + FIELD.kannanRadius + 18 && e.def.contactDps > 0) touching++;
    dodge = landing || touching >= 2 || (touching >= 1 && here > 14);
  }
  return { targetX: null, moving: best >= 0, jx, jy, dodge };
}

/** What a player would do this frame. Dodge first (an enemy shot, boss tell or aim lands near Kannan's x), then settle under
 *  the densest enemy column, but only when the gain is clear: moving stops the throwing. */
export function autoInput(w: World): RunInput {
  if (isFreeMode(w.content)) return autoInputFree(w);
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

/** The bot's answer to a fresh street find: swap to an alternative it values more than the granted one (e.g. no new breads
 *  past maxBreads). Call once per frame after step(). */
export function autoFind(w: World, o: BotOptions = {}): void {
  const f = w.find;
  if (!f || f.swapped || !f.alts.length) return;
  const maxBreads = o.maxBreads ?? MAX_BREADS;
  // The granted card is already applied, so a new roti/dip counts as new (not owned) and one past maxBreads is worth nothing.
  const granted = f.card.level > 1 ? cardValue(w, f.card, maxBreads)
    : f.card.kind === 'bread' ? (w.player.breads.length <= maxBreads ? 95 : 0) : f.card.kind === 'dip' ? 80 : cardValue(w, f.card, maxBreads);
  let best = 0;
  f.alts.forEach((c, i) => { if (cardValue(w, c, maxBreads) > cardValue(w, f.alts[best], maxBreads)) best = i; });
  if (cardValue(w, f.alts[best], maxBreads) > granted) swapFind(w, best);
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
    autoFind(world, opts);
    drainEvents(world);
  }
  const p = world.player;
  return world.result ?? {
    chapterId: world.chapter.id, bossAttempted: world.bossAttempted ?? false,
    won: false, wave: world.wave, dist: Math.round(world.dist), kills: world.kills, bossKills: world.bossKills, time: world.time, level: p.level, gold: Math.round(world.gold),
    dipUseXp: { ...world.dipUseXp },
    breads: p.breads.map((b) => ({ ...b })), dips: p.dips.map((d) => ({ ...d })),
  };
}
