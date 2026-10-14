// Street finds (flow runs): every PICK_EVERY metres a regular hands Kannan one small run-only item, granted at once (no popup).
// Drawn from the level-up card pool (unbiased by the signature roti, nudged toward rotis and dips that fit the build), weaker than
// a card (passives at FIND_MAGNITUDE; fractional-by-nature stats excluded) and capped at MAX_FINDS per run. A new roti arrives at
// NEW_ROTI_LEVEL. Counter mode: a 3 s swap window offers two alternatives of other kinds (swapFind); the sim never pauses for it.
// Free mode (the default): the find is a tiffin PICKUP that drifts down the street (w.pickup); Kannan walking into it pauses the run
// (phase 'levelup', w.pickup.open) on a choice of three cards, and chooseFind grants exactly the one picked. Unclaimed, it scrolls away.
// In-run XP no longer opens cards in flow runs: each level gives a small LEVEL_NUDGE instead, stretched by Kannan's level.
// With fewer, weaker picks than cards the street presses harder (chapter.pressure) and the boss is lighter (chapter.bossHp).
// Theme copy lives in src/content/finds.ts.
import { applyCard, drawOffer } from './cards';
import { dipMatchesBread } from './dipLinks';
import type { Rng } from './rng';
import { FIELD, type Card, type PassiveId, type World } from './types';
import type { Ctx } from './sim/ctx';
import { computeStats } from './stats';

export const MAX_FINDS = 6;
/** Share of a passive card's per-level bonus a find gives. */
export const FIND_MAGNITUDE = 0.6;
export const MAX_FIND_LEVEL = 5;
/** A new roti from a find arrives already at this level (a whole stack from the regular, not a sample). */
export const NEW_ROTI_LEVEL = 3;
/** Each point of Kannan level above 1 adds this share to the in-run level nudge (a better-known stall draws better regulars). */
export const NUDGE_PER_KANNAN_LEVEL = 0.25;
/** Sim seconds the swap offer stays open. */
export const FIND_TIME = 3;
/** Whole-number stats that do not scale down to a fraction of a level. */
const WHOLE = ['extraProjectiles', 'revives', 'splashCrit', 'throwWhileMoving'];

const eligible = (w: World, c: Card): boolean =>
  c.kind === 'passive' ? !Object.keys(w.content.passives[c.id as PassiveId].perLevel).some((k) => WHOLE.includes(k))
    : (c.kind === 'bread' || c.kind === 'dip') && c.level <= MAX_FIND_LEVEL;

/** Higher = fits the build: any roti, or a dip that is owned or whose tags match an owned roti. */
const fit = (w: World, c: Card): number => {
  const p = w.player;
  if (c.kind === 'bread') return 1;
  if (c.kind === 'dip') return p.dips.some((d) => d.id === c.id) || p.breads.some((b) => dipMatchesBread(w.content.dips[c.id as never], w.content.breads[b.id])) ? 1 : 0;
  return 0;
};

/** Recompute stats from passives + loadout; a max HP rise heals by the rise, like a card. */
function refresh(w: World): void {
  const p = w.player;
  const oldMax = p.stats.maxHp;
  p.stats = computeStats(p.passives, w.content, w.loadout);
  p.hp = Math.min(p.stats.maxHp, p.hp + Math.max(0, p.stats.maxHp - oldMax));
}

function addStats(w: World, add: Record<string, number>, scale: number): void {
  const stats: Record<string, number> = { ...(w.loadout?.stats ?? {}) };
  for (const [k, v] of Object.entries(add)) stats[k] = (stats[k] ?? 0) + v * scale;
  w.loadout = { ...w.loadout, stats };
  refresh(w);
}

const bumpPassive = (w: World, id: string, sign: 1 | -1): void => addStats(w, w.content.passives[id as PassiveId].perLevel as Record<string, number>, sign * FIND_MAGNITUDE);

/** Flow runs: every in-run level-up (no cards there) nudges Kannan's rhythm a little. Tune freely. */
export const LEVEL_NUDGE = { dmgPct: 0.0045, throwSpeedPct: 0.0034, maxHp: 1 };
export const levelNudge = (w: World): void => addStats(w, LEVEL_NUDGE, 1 + NUDGE_PER_KANNAN_LEVEL * Math.max(0, (w.loadout?.kannanLevel ?? 1) - 1));

function applyFind(w: World, card: Card): void {
  if (card.kind === 'passive') bumpPassive(w, card.id, 1);
  else {
    applyCard(w.player, card, w.content, w.loadout);
    if (card.kind === 'bread' && card.level === 1) w.player.breads.find((b) => b.id === card.id)!.level = NEW_ROTI_LEVEL;
  }
}

function undoFind(w: World, card: Card): void {
  const p = w.player;
  if (card.kind === 'passive') return bumpPassive(w, card.id, -1);
  const list = (card.kind === 'bread' ? p.breads : p.dips) as { id: string; level: number }[];
  const i = list.findIndex((o) => o.id === card.id);
  if (i < 0) return;
  if (card.level > 1) list[i].level = card.level - 1;
  else list.splice(i, 1);
  refresh(w);
}

/** The next find and its two alternatives (null past MAX_FINDS or with nothing eligible). Draws from `rng`, so it is deterministic per seed. */
function drawFind(w: World, rng: Rng): { card: Card; alts: Card[] } | null {
  if ((w.finds ??= []).length >= MAX_FINDS) return null;
  const pool = drawOffer(w.player, w.content, rng, { ...w.loadout, signatureBread: undefined, n: 12, recentOffers: [] }).filter((c) => eligible(w, c));
  pool.sort((a, b) => fit(w, b) - fit(w, a)); // stable: the weighted draw order breaks ties
  if (!pool.length) return null;
  const [card, ...rest] = pool;
  // Alternatives differ in kind from the find and from each other where the pool allows (a dip, a roti, a passive).
  const alts: Card[] = [];
  const cls = (c: Card): string => (c.kind === 'bread' ? `bread${c.level > 1}` : c.kind);
  const RANK = ['breadtrue', 'dip', 'breadfalse', 'passive'];
  rest.sort((x, y) => RANK.indexOf(cls(x)) - RANK.indexOf(cls(y)));
  for (const seen = new Set([cls(card)]); alts.length < 2 && rest.length; ) {
    const i = rest.findIndex((c) => !seen.has(cls(c)));
    const [c] = rest.splice(i < 0 ? 0 : i, 1);
    seen.add(cls(c));
    alts.push(c);
  }
  return { card, alts };
}

/** Counter mode: grant the next find at once and open its swap window. */
export function grantFind(w: World, rng: Rng): void {
  const d = drawFind(w, rng);
  if (!d) return;
  applyFind(w, d.card);
  w.finds!.push(d.card);
  w.find = { card: d.card, alts: d.alts, t: FIND_TIME, n: w.finds!.length };
}

// ── Free mode: the tiffin pickup ─────────────────────────────────────────────

/** The pickup drifts down the street at this many field units per second (a bit over 11 s from the top of Kannan's reach to gone). */
export const PICKUP_SPEED = 50;
/** Kannan touches it within this distance (u) of its centre, on top of his own radius. */
export const PICKUP_REACH = 30;
/** It appears at this street depth (u): well inside Kannan's reach, so a gift is a short walk, not a trip to the far end. */
export const PICKUP_Y = 420;
/** Edge margin (u) for its random x. */
const PICKUP_EDGE = 50;

/** A find is due in free mode: put a tiffin at the top of the street (replacing one still unclaimed). No-op past MAX_FINDS. */
export function spawnPickup(w: World, rng: Rng): void {
  const offer = drawFind(w, rng);
  if (!offer) return;
  w.pickup = { x: rng.range(-(FIELD.kannanMaxX - PICKUP_EDGE), FIELD.kannanMaxX - PICKUP_EDGE), y: PICKUP_Y, offer: [offer.card, ...offer.alts] };
}

/** Scroll the pickup; open the choice when Kannan touches it; drop it when it passes or the boss steps out. Phase 'wave' only. */
export function updatePickup(c: Ctx): void {
  const { w, p } = c;
  const k = w.pickup;
  if (!k || k.open) return;
  k.y -= PICKUP_SPEED * c.dt;
  if (Math.hypot(p.x - k.x, p.y - k.y) <= FIELD.kannanRadius + PICKUP_REACH) {
    k.open = true;
    w.phase = 'levelup';
    w.offer = k.offer;
  } else if (k.y < FIELD.freeMinY - 60 || w.flowBoss) {
    w.events.push({ t: 'findMissed', x: k.x, y: Math.max(k.y, FIELD.freeMinY) });
    w.pickup = undefined;
  }
}

/** The player picked card `i` of the open pickup: grant exactly that one and let the run go on. */
export function chooseFind(w: World, i: number): void {
  const card = w.pickup?.offer[i];
  if (!card) return;
  applyFind(w, card);
  w.finds!.push(card);
  w.pickup = undefined;
  w.offer = [];
  w.phase = 'wave';
}

/** Swap the open find for alternative `i` (once per find, while its window is open). */
export function swapFind(w: World, i: number): boolean {
  const f = w.find;
  const alt = f?.alts[i];
  if (!f || !alt || f.swapped || f.t <= 0) return false;
  undoFind(w, f.card);
  applyFind(w, alt);
  w.finds![f.n - 1] = alt;
  w.find = { ...f, card: alt, alts: [], swapped: true };
  return true;
}
