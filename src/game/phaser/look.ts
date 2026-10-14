// Every tunable number of the renderer in one place: layers, sizes, colours, timings. Change the look here, not in the
// scene code. Pixel values are "design px" at a 390 px wide screen; the layout multiplies them by `u` (width / 390).
import type { EnemyKind } from '@/core/types';

/** The sim runs on this fixed step (s). */
export const STEP = 1 / 60;
/** Sim steps per frame at speed 1. A slower frame drops the rest of its time instead of spiralling. */
export const MAX_STEPS = 4;
/** Seconds between 'hud' publications. */
export const HUD_PERIOD = 0.1;

/** Where the street sits on screen, as shares of the height: its far end (the horizon) and the counter line, the counter's far
 *  steel edge, where enemies stand when they bite. The counter surface fills from there to the bottom of the screen. */
export const LANE = { horizon: 0.2, counter: 0.7 };

/** Phaser depths, back to front. Enemies and shots add their screen y so far ones draw first. */
export const D = {
  bg: 0,
  ground: 100,
  tele: 150,
  shadow: 200,
  enemy: 1000,
  enemyShot: 4000,
  fx: 7000,
  counter: 10000,
  slot: 10100,
  kannan: 10200,
  shot: 11000,
  fxTop: 14000,
  number: 15000,
} as const;

// ── Colours (Okabe-Ito, colourblind safe: docs/research/game-feel.md section 2) ───────────────────────────────
export const HAZARD = 0xd55e00;
/** The red of the counter warning: an enemy biting Kannan (danger.ts). */
export const DANGER = 0xe5372b;
export const CHILL_TINT = 0x9fd4ff;
/** Frozen by mint chutney: a pale mint body and a frosted rim. */
export const FREEZE_TINT = 0xbdf7e4;
export const FROST_TINT = 0xa6f2dc;
/** Spice heat (curry, sambal, masala burn): the body pulses from white toward this red-orange. */
export const BURN_TINT = 0xff6a3d;
/** Milk slow (condensed milk): a sticky pale cream. */
export const SLOW_TINT = 0xfff0c2;
export const ELITE_TINT = 0xffe08a;
export const TENDER_TINT = 0xffb9a3;
export const STEEL = 0xcfe6ff;
export const ZONE_TINT = 0xc9d98c;
export const CURRY = 0xb5533c;
export const WHITE = 0xffffff;
/** Teh tarik haste: the pulled-tea ribbon and its foam, the caramel trail behind a thrown bread, and the bread itself under
 *  reduced motion (tint only, no trail). */
export const CARAMEL = 0xc27a2c;
export const FROTH = 0xfff4dc;
export const CARAMEL_TRAIL = 0xd9953f;
export const CARAMEL_SHOT = 0xffb36b;

// ── Sizes ──────────────────────────────────────────────────────────────────────────────────────────────────
/** src/content radii are the hit circles, and were scaled up by this (enemies and bosses) so a bread that visibly touches an
 *  enemy hits it. The art-direction sizes below were set against the radii from before that, so undo it here. */
const HIT_SCALE = 1.6;

/** An enemy sprite's size (its larger side) as a share of the screen width, at the counter line (depth scale 1), from its
 *  field radius. Art direction anchors: a roach (hit radius 28.8) 22%, the burger brute (54.4) 32%, King Cockroach (112) 55%;
 *  between them it is a power law. Depth scale then shrinks it down the street (a roach is ~12% of the width halfway). */
export function enemyShare(radius: number): number {
  const r = Math.max(radius / HIT_SCALE, 6);
  return r <= 34 ? 0.22 * Math.pow(r / 18, 0.59) : 0.32 * Math.pow(r / 34, 0.75);
}
/** An elite is a bit bigger; a mosquito cloud member a bit smaller (there are six of them). */
export const ELITE_SCALE = 1.15;
export const SWARM_SCALE = 0.85;
/** Thrown bread size = hit diameter x this (bread hit radii were scaled up 1.3x in src/content; the look stays as it was). */
export const SHOT_FIT = 2.1 / 1.3;
export const SHOT_MIN_U = 42;
/** Lob (roti bomb, naan) sprite diameter in field units; the blast radius is not a sprite size. */
export const LOB_U = 74;
/** Enemy shot size in field units. */
export const ENEMY_SHOT_U = 56;
/** Kannan's width as a share of the screen width. */
export const KANNAN_W = 0.54;
/** The disc look of a thrown bread: its container is squashed this much vertically. */
export const DISC_SQUASH = 0.66;
/** Lob arc height in design px at depth scale 1. */
export const LOB_ARC = 150;
/** A shot leaves Kannan's hand and settles onto the field projection over this many field units. */
export const LAUNCH_U = 170;

// ── Cut-out life per enemy kind ────────────────────────────────────────────────────────────────────────────
export type Anim = {
  /** Seconds per step (walkers) or per flap (flyers). */
  period: number;
  /** Hop height as a share of body height. */
  bob: number;
  /** Wobble in radians. */
  rot: number;
  /** Squash and stretch strength. */
  sq: number;
  /** Lift above the ground as a share of body height (the shadow stays put). */
  hover: number;
  /** Lean into sideways movement. */
  lean: number;
};
export const ANIM: Record<EnemyKind, Anim> = {
  walker: { period: 0.36, bob: 0.07, rot: 0.07, sq: 0.1, hover: 0, lean: 0.35 },
  runner: { period: 0.22, bob: 0.06, rot: 0.05, sq: 0.12, hover: 0, lean: 0.6 },
  flyer: { period: 0.2, bob: 0.06, rot: 0.04, sq: 0.22, hover: 0.32, lean: 0.55 },
  swarm: { period: 0.14, bob: 0.1, rot: 0.14, sq: 0.1, hover: 0.5, lean: 0.4 },
  tank: { period: 0.95, bob: 0.05, rot: 0.03, sq: 0.14, hover: 0, lean: 0.1 },
  shooter: { period: 0.32, bob: 0.06, rot: 0.06, sq: 0.1, hover: 0, lean: 0.3 },
  splitter: { period: 0.6, bob: 0.03, rot: 0.02, sq: 0.15, hover: 0, lean: 0.15 },
  shielded: { period: 0.5, bob: 0.05, rot: 0.04, sq: 0.08, hover: 0, lean: 0.2 },
  healer: { period: 0.8, bob: 0.08, rot: 0.04, sq: 0.06, hover: 0.18, lean: 0.2 },
  summoner: { period: 0.9, bob: 0.06, rot: 0.03, sq: 0.06, hover: 0.12, lean: 0.1 },
  exploder: { period: 0.28, bob: 0.07, rot: 0.08, sq: 0.1, hover: 0, lean: 0.3 },
};

// ── Limits (game-feel.md: readability budgets) ─────────────────────────────────────────────────────────────
export const MAX_NUMBERS = 24;
export const ENEMY_SCALE_FLOOR = 0.48;
export const NUMBER_SCALE_FLOOR = 0.85;
export const NUMBER_COLOR = { big: '#ff713d', chip: '#ffdf57', dot: '#ff9a3d' };
export const MAX_PARTICLES = 160;
export const TRAUMA_DECAY = 1.0;
/** Shake offset at trauma 1 as a share of the screen width. */
export const SHAKE_SHARE = 0.025;
