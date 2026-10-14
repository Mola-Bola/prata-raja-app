// Free-run combat feel (docs/research/combat-feel.md "Prata Raja recipe"): pickup bursts that the magnet pulls in, and the numbers
// the scene uses for hit-stop. Renderer only; the sim never reads any of it.
import { D } from './look';
import type { Fx } from './fx';

/** Hit-stop seconds: a critical pest hit, an elite kill, a boss phase change. */
export const STOP = { crit: 0.03, elite: 0.05, boss: 0.1 } as const;
/** Pickup magnet radius in field units (screen px = this x design px). */
export const MAGNET_U = 90;
/** Camera trauma on Kannan being hit by contact / by a shot or blast / by the boss. */
export const HURT_TRAUMA = { contact: 0.6, shot: 0.7, boss: 0.9 } as const;

const TAU = Math.PI * 2;

/** `n` pickups (coin or orb art) burst from (x, y) to evenly spread spots 40..70 u away, then wait for the magnet. */
export function pickupBurst(fx: Fx, key: string, x: number, y: number, n: number, u: number, seed: number, size: number, near = 1): void {
  for (let i = 0; i < n; i++) {
    const a = seed * 1.7 + (i / n) * TAU + (i % 2) * 0.4;
    const r = (40 + ((i * 37 + seed * 13) % 31)) * u * near;
    fx.spawn(key, x, y, D.fxTop, 99, size, size)
      .fade(1, 1, 0)
      .spin(0, 0)
      .pickup(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55)
      .arcH(34 * u);
  }
}
