// The walkable stall's plan, in design units (a 390 x 844 phone portrait; HubScene scales it to the real screen). Pure data and
// pure maths, so a test can check that every station is a short walk from every other. Art is atlas frames only (room/*).
import type { StationId } from '../../hub';

export const ROOM_W = 390;
export const ROOM_H = 844;
/** Kannan's walking speed, design units per second. */
export const SPEED = 200;
/** Where Kannan can stand: the floor, between the counters' front edge and the bottom bar. */
export const BOUNDS = { x0: 22, x1: 368, y0: 322, y1: 770 };
export const START = { x: 195, y: 560 }; // the open middle of the floor

/** One placed prop. (x, y) is the middle of its base; w is the drawn width. `hw`/`d` give its footprint (half-width, depth)
 *  Kannan cannot walk through; none means decoration. `station` ties the prop to a station so a tap on it walks there. */
export type Prop = { frame: string; x: number; y: number; w: number; hw?: number; d?: number; station?: StationId };

// A U round an open floor: the kopi stall, tawa and doorway along the back wall; gear, pantry and the table cluster down the left;
// orders, dips and the spec board down the right. Stations on a side are ~100 wide and 145 apart, so each sign has its own air.
export const PROPS: Prop[] = [
  { frame: 'room/kopi-stall-front', x: 75, y: 300, w: 150, hw: 62, d: 38, station: 'kopi' },
  { frame: 'room/tawa-counter', x: 218, y: 292, w: 150, hw: 62, d: 34, station: 'tawa' },
  { frame: 'room/doorway-glow', x: 334, y: 305, w: 104, hw: 36, d: 16, station: 'exit' },
  { frame: 'room/gear-rack-forge', x: 58, y: 455, w: 104, hw: 42, d: 24, station: 'gear' },
  { frame: 'room/pantry-shelves', x: 58, y: 610, w: 104, hw: 42, d: 24, station: 'pantry' },
  { frame: 'room/order-chalkboard', x: 336, y: 455, w: 88, hw: 34, d: 14, station: 'orders' },
  { frame: 'room/dip-shelf', x: 336, y: 610, w: 100, hw: 40, d: 20, station: 'dips' },
  { frame: 'room/spec-board', x: 336, y: 765, w: 100, hw: 38, d: 14, station: 'spec' },
  // The table cluster (the one thing that is not a station), bottom left.
  { frame: 'room/steel-table', x: 56, y: 762, w: 84, hw: 30, d: 20 },
  { frame: 'room/plastic-stool-red', x: 118, y: 772, w: 32, hw: 9, d: 9 },
  { frame: 'room/plastic-stool-blue', x: 112, y: 730, w: 30, hw: 9, d: 9 },
];

/** Decoration with no footprint. `depth` fixed: floors under everything, lights and fan shadow over it. */
export const DECALS: { frame: string; x: number; y: number; w: number; depth: number; alpha?: number }[] = [
  { frame: 'room/drain-grate', x: 195, y: 700, w: 90, depth: -900, alpha: 0.5 },
  // The one back wall across the top: full width at its natural aspect (337 x 384), about a fifth of it runs off the top edge,
  // its base sits behind the top row of stalls. Depth -800 keeps it behind every prop and Kannan.
  { frame: 'room/stall-back-wall', x: 195, y: 355, w: 390, depth: -800 },
];

export type Station = { id: StationId; /** The sign's name: 1-2 words. */ label: string; /** The line shown when Kannan is close. */ verb: string; /** Atlas frame for the sign. */ icon?: string; /** Where Kannan stands to use it. */ x: number; y: number };
export const STATIONS: Station[] = [
  { id: 'kopi', label: 'Kopi', verb: 'Pre-run meal', icon: 'roomui/icon-kopi-cup', x: 112, y: 356 },
  { id: 'tawa', label: 'Rotis', verb: 'Pick rotis', icon: 'roomui/icon-tawa', x: 218, y: 344 },
  { id: 'exit', label: 'Street \u2192', verb: 'Start run', x: 334, y: 346 },
  { id: 'gear', label: 'Gear', verb: 'Forge gear', icon: 'roomui/icon-anvil-tawa', x: 124, y: 451 },
  { id: 'pantry', label: 'Pantry', verb: 'Ingredients', icon: 'roomui/icon-pantry-sack', x: 124, y: 606 },
  { id: 'orders', label: 'Orders', verb: 'Choose place', icon: 'roomui/icon-chalkboard-v2', x: 286, y: 451 },
  { id: 'dips', label: 'Dips', verb: 'Socket dips', icon: 'roomui/icon-katori', x: 282, y: 606 },
  { id: 'spec', label: 'Spec', verb: 'Spend points', icon: 'room/spec-board', x: 282, y: 761 },
];
/** Walk this close to a station and its panel opens; past RANGE + 24 it closes again. */
export const RANGE = 58;
/** Closer than this and the station's sign lights up (glow, lift, verb); the panel opens at RANGE. */
export const NEAR = RANGE + 28;

export const stationById = (id: StationId): Station => STATIONS.find((s) => s.id === id)!;

/** The station whose spot is nearest (x, y) and within `range`, or null. */
export function stationNear(x: number, y: number, range = RANGE): Station | null {
  let best: Station | null = null;
  let bestD = range;
  for (const s of STATIONS) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= bestD) { best = s; bestD = d; }
  }
  return best;
}

/** Kannan's feet, half-size. */
const HX = 9;
const HY = 5;
const hits = (p: Prop, x: number, y: number): boolean => p.hw !== undefined && p.d !== undefined && Math.abs(x - p.x) < p.hw + HX && y > p.y - p.d - HY && y - HY < p.y;

/** Move from (x, y) by (dx, dy), sliding along props and the room's edge: each axis is tried on its own. */
export function step(x: number, y: number, dx: number, dy: number): { x: number; y: number } {
  const clamp = (nx: number, ny: number) => ({ x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, nx)), y: Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, ny)) });
  let p = clamp(x + dx, y);
  if (PROPS.some((q) => hits(q, p.x, p.y))) p = { x, y: p.y };
  let q = clamp(p.x, p.y + dy);
  if (PROPS.some((r) => hits(r, q.x, q.y))) q = { x: q.x, y: p.y };
  return q;
}

type Pt = { x: number; y: number };
const DT = 1 / 30;

/** Walk the waypoints with step(); the seconds taken, or Infinity if Kannan sticks on a prop. */
export function walkTime(from: Pt, via: Pt[]): number {
  let { x, y } = from, t = 0;
  for (const w of via) {
    for (let guard = 0; Math.hypot(w.x - x, w.y - y) > 4; guard++) {
      const d = Math.hypot(w.x - x, w.y - y);
      const n = step(x, y, ((w.x - x) / d) * SPEED * DT, ((w.y - y) / d) * SPEED * DT);
      if (guard > 400 || Math.hypot(n.x - x, n.y - y) < 0.2 * SPEED * DT) return Infinity;
      x = n.x; y = n.y; t += DT;
    }
  }
  return t;
}

/** Tap-to-walk: the waypoints to follow. Straight if that works, else through the open middle of the floor (x = 195). */
export function route(from: Pt, to: Pt): Pt[] {
  const mid = (y: number): Pt => ({ x: 195, y });
  const options: Pt[][] = [[to], [mid(from.y), to], [mid(to.y), to], [mid(from.y), mid(to.y), to]];
  return options.find((o) => walkTime(from, o) < Infinity) ?? [to];
}
