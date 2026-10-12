// Where the counter is about to be hit: what the autoplay bot (and any "safe spot" hint) dodges.
import { FIELD, type World } from '../types';
import { tellAge, tellZones } from './boss';
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
