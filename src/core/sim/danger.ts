// Where the counter is about to be hit: what the autoplay bot (and any "safe spot" hint) dodges.
import { FIELD, type BossDef, type World } from '../types';
import { tellAge, tellMarkY, tellPlayerY, tellZones } from './boss';
import { cdGet } from './ctx';

/** x = centre on the counter, half = half-width of the danger, t = seconds until it lands, age = seconds since it appeared
 *  (a player cannot react before it has been on screen for a moment). */
export type Danger = { x: number; half: number; t: number; age: number };

/** Enemy shots in flight, shooters mid-aim, boss tells and a boss mid-charge, once they have been around for `minAge` seconds. */
export function dangers(w: World, minAge = 0): Danger[] {
  const out: Danger[] = [];
  const add = (d: Danger): void => {
    if (d.age >= minAge) out.push(d);
  };
  for (const s of w.projectiles) {
    if (s.owner === 'enemy' && s.ttl >= 0) add({ x: s.tx, half: FIELD.kannanHitHalfWidth, t: s.y / Math.max(1, Math.abs(s.vy)), age: s.t });
  }
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    if (e.boss) {
      const st = cdGet(e, '_st');
      if (st !== 1 && st !== 2) continue;
      const z = tellZones(e);
      if (z.width <= 0) continue;
      for (const x of z.xs) add({ x, half: z.width / 2, t: st === 1 ? e.t : 0, age: tellAge(e) });
    } else if (cdGet(e, '_aim') === 1 && e.def.ranged) {
      add({ x: cdGet(e, '_tx'), half: FIELD.kannanHitHalfWidth, t: e.t + e.y / e.def.ranged.projSpeed, age: e.def.ranged.aimTime - e.t });
    }
  }
  return out;
}

/** Free mode: a danger is a fat segment (a, b) with half-width `half`. t = seconds until it lands, age = seconds since it appeared. */
export type Danger2 = { ax: number; ay: number; bx: number; by: number; half: number; t: number; age: number };

/** Distance from (px, py) to the segment of a danger (minus nothing: compare with `half`). */
export function distToDanger(d: Danger2, px: number, py: number): number {
  const vx = d.bx - d.ax;
  const vy = d.by - d.ay;
  const l2 = vx * vx + vy * vy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - d.ax) * vx + (py - d.ay) * vy) / l2)) : 0;
  return Math.hypot(px - (d.ax + vx * u), py - (d.ay + vy * u));
}

const EXTEND = 500;
const toward = (fx: number, fy: number, tx: number, ty: number, d2: number): { x: number; y: number } => {
  const d = Math.hypot(tx - fx, ty - fy) || 1;
  return { x: tx + ((tx - fx) / d) * d2, y: ty + ((ty - fy) / d) * d2 };
};

/** Free-mode counterpart of dangers(): shots in flight, shooters mid-aim and boss tells, as segments on the street. */
export function dangersFree(w: World, minAge = 0): Danger2[] {
  const out: Danger2[] = [];
  const add = (d: Danger2): void => {
    if (d.age >= minAge) out.push(d);
  };
  const p = w.player;
  const shotHalf = 8 + 0.8 * FIELD.kannanRadius + 6;
  for (const s of w.projectiles) {
    if (s.owner !== 'enemy' || s.ttl < 0) continue;
    const sp = Math.hypot(s.vx, s.vy) || 1;
    add({ ax: s.x, ay: s.y, bx: s.x + (s.vx / sp) * 700, by: s.y + (s.vy / sp) * 700, half: shotHalf, t: Math.hypot(p.x - s.x, p.y - s.y) / sp, age: s.t });
  }
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    if (e.boss) {
      const st = cdGet(e, '_st');
      if (st !== 1 && st !== 2) continue;
      const z = tellZones(e);
      const t = st === 1 ? e.t : 0;
      const age = tellAge(e);
      const kind = (e.def as BossDef).attacks[cdGet(e, '_cur')].kind;
      z.xs.forEach((x, i) => {
        if (kind === 'volley') {
          const end = toward(e.x, e.y, x, tellPlayerY(e), EXTEND);
          add({ ax: e.x, ay: e.y, bx: end.x, by: end.y, half: shotHalf, t, age });
        } else if (kind === 'charge') add({ ax: x, ay: e.y, bx: x, by: 0, half: z.width / 2 + 10, t, age });
        else if (kind === 'rain') add({ ax: x, ay: tellMarkY(e, i), bx: x, by: tellMarkY(e, i), half: z.width / 2 + FIELD.kannanRadius / 2 + 10, t, age });
        else if (kind === 'sweep') add({ ax: x, ay: -100, bx: x, by: 1100, half: z.width / 2, t, age });
      });
    } else if (cdGet(e, '_aim') === 1 && e.def.ranged) {
      const end = toward(e.x, e.y, cdGet(e, '_tx'), cdGet(e, '_ty'), EXTEND);
      add({ ax: e.x, ay: e.y, bx: end.x, by: end.y, half: shotHalf, t: e.t, age: e.def.ranged.aimTime - e.t });
    }
  }
  return out;
}
