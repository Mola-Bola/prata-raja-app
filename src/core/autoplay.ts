// A simple bot for balance sims and tests: stands and throws, kites when pests close in or a shot is about to land.
import { MAX_BREADS } from './cards';
import { chooseCard, createRun, drainEvents, step } from './sim';
import { dangersFree, distToDanger, type Danger2 } from './sim/danger';
import { FREE } from './sim/free';
import { FIELD, type Card, type Content, type Loadout, type RunInput, type RunResult, type World } from './types';

/** Seconds a danger has to be on screen before the bot reacts (a person needs a moment to see it). */
const REACTION = 0.3;

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
  return { jx, jy, dodge };
}

/** What a player would do this frame: kite. */
export const autoInput = autoInputFree;

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
    won: false, wave: world.wave, dist: Math.round(world.dist), kills: world.kills, bossKills: world.bossKills, time: world.time, level: p.level, gold: Math.round(world.gold),
    dipUseXp: { ...world.dipUseXp },
    breads: p.breads.map((b) => ({ ...b })), dips: p.dips.map((d) => ({ ...d })),
  };
}
