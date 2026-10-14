// Free mode crowd: pests push each other apart (spatial hash, no allocation per step) and fan out around Kannan instead of
// queueing on one path. Positional, deterministic (array order, no rng here), and pests never displace Kannan.
// Spec: docs/research/combat-feel.md "Crowd". Per-pest scratch in Enemy.cooldowns: _th approach angle offset (rad), _sj speed
// factor (both drawn at spawn), _side sidestep clock (>0 active, counts down to -SIDE_REST so it cannot retrigger at once).
import { isDisabled } from '../status';
import { FIELD, type Enemy } from '../types';
import { alive, cdGet, hyp, MAX_ENEMY_Y, type Ctx } from './ctx';
import { FREE } from './free';

export const CROWD = {
  /** Two pests keep SEP x (ra + rb) between centres (hit radii; sprites are about 1/1.6 of that, so this reads as touching-plus-air). */
  sep: 0.7,
  /** Push speed (u/s) at full overlap. */
  push: 320,
  /** Approach offset: each pest aims this many radians off the straight line to Kannan (+/-). */
  fan: 0.9,
  /** Speed factor band at spawn: 1 +/- this. */
  speedJitter: 0.15,
  /** The ring pests aim for sits this far beyond their contact reach. */
  slotPad: 36,
  /** Summed neighbour push (unit vectors weighted by overlap) above which a pest sidesteps. */
  crowded: 0.6,
  sideTime: 0.6,
  sideRest: 0.8,
  /** A pest this close inside its contact reach (share of reach) is pushed back out to it. */
  bodyShare: 0.85,
};

const CELL = 96; // >= the largest pest-pest separation (0.7 x 2 x 54) so the 3x3 cells around a pest hold every neighbour
const COLS = Math.ceil((2 * FIELD.halfWidth) / CELL) + 2;
const ROWS = Math.ceil((MAX_ENEMY_Y + 80) / CELL) + 2;
const head = new Int32Array(COLS * ROWS);
let next = new Int32Array(64);
let ax = new Float64Array(64);
let ay = new Float64Array(64);
let rx = new Float64Array(64);
let ry = new Float64Array(64);
let fixed = new Uint8Array(64);
let who: Enemy[] = [];
const bosses: Enemy[] = [];

const cellOf = (e: Enemy): number => {
  const cx = Math.min(COLS - 1, Math.max(0, Math.floor((e.x + FIELD.halfWidth) / CELL) + 1));
  const cy = Math.min(ROWS - 1, Math.max(0, Math.floor((e.y + 40) / CELL) + 1));
  return cy * COLS + cx;
};

function grow(n: number): void {
  if (n <= next.length) return;
  const m = Math.max(n, next.length * 2);
  next = new Int32Array(m);
  ax = new Float64Array(m);
  ay = new Float64Array(m);
  rx = new Float64Array(m);
  ry = new Float64Array(m);
  fixed = new Uint8Array(m);
}

/** Where a pest at distance d heads: Kannan once it is near the ring, otherwise a point on the ring `th` radians round from where it is. */
export function aimAt(px: number, py: number, e: Enemy, slotR: number, out: { x: number; y: number }): void {
  const th = cdGet(e, '_th');
  const dx = e.x - px;
  const dy = e.y - py;
  const d = hyp(dx, dy);
  if (th === 0 || d <= slotR * 1.15) {
    out.x = px;
    out.y = py;
    return;
  }
  const a = Math.atan2(dy, dx) + th;
  out.x = px + Math.cos(a) * slotR;
  out.y = py + Math.sin(a) * slotR;
}

/** One separation pass over the living pests, after they moved. */
export function separate(c: Ctx): void {
  const { w, p, dt } = c;
  const en = w.enemies;
  grow(en.length);
  head.fill(-1);
  bosses.length = 0;
  who.length = 0;
  let n = 0;
  for (let i = 0; i < en.length; i++) {
    const e = en[i];
    if (!alive(e)) continue;
    if (e.boss) {
      bosses.push(e);
      continue;
    }
    who[n] = e;
    ax[n] = 0;
    ay[n] = 0;
    rx[n] = 0;
    ry[n] = 0;
    fixed[n] = isDisabled(e) ? 1 : 0;
    const cell = cellOf(e);
    next[n] = head[cell];
    head[cell] = n;
    n++;
  }
  const maxStep = CROWD.push * dt;
  for (let i = 0; i < n; i++) {
    const a = who[i];
    const cell = cellOf(a);
    const cx = cell % COLS;
    const cy = (cell - cx) / COLS;
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= ROWS) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= COLS) continue;
        for (let j = head[gy * COLS + gx]; j >= 0; j = next[j]) {
          if (j <= i) continue;
          const b = who[j];
          const rs = CROWD.sep * (a.def.radius + b.def.radius);
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs) continue;
          let d = Math.sqrt(d2);
          if (d < 1e-3) {
            dx = Math.cos(i * 2.399);
            dy = Math.sin(i * 2.399);
            d = 1;
          }
          const ux = dx / d;
          const uy = dy / d;
          const f = 1 - d / rs;
          const k = f * maxStep;
          const fa = fixed[i] ? 0 : fixed[j] ? 1 : 0.5;
          const fb = fixed[j] ? 0 : fixed[i] ? 1 : 0.5;
          ax[i] += ux * k * fa * 2;
          ay[i] += uy * k * fa * 2;
          ax[j] -= ux * k * fb * 2;
          ay[j] -= uy * k * fb * 2;
          rx[i] += ux * f;
          ry[i] += uy * f;
          rx[j] -= ux * f;
          ry[j] -= uy * f;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const e = who[i];
    // A boss is a wall: nothing stands inside it.
    for (let b = 0; b < bosses.length; b++) {
      const o = bosses[b];
      const rs = CROWD.sep * (o.def.radius + e.def.radius);
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const d = hyp(dx, dy) || 1;
      if (d < rs) {
        const f = 1 - d / rs;
        ax[i] += (dx / d) * f * maxStep * 2;
        ay[i] += (dy / d) * f * maxStep * 2;
      }
    }
    if (fixed[i]) continue;
    let mx = ax[i];
    let my = ay[i];
    const m = hyp(mx, my);
    if (m > maxStep) {
      mx = (mx / m) * maxStep;
      my = (my / m) * maxStep;
    }
    e.x = Math.max(-FIELD.halfWidth, Math.min(FIELD.halfWidth, e.x + mx));
    e.y = Math.max(-40, Math.min(MAX_ENEMY_Y, e.y + my));
    // Never into Kannan's body (he is not pushed): back out to just inside contact reach.
    const reach = (e.def.radius * FREE.contactScale + FIELD.kannanRadius) * CROWD.bodyShare;
    const kx = e.x - p.x;
    const ky = e.y - p.y;
    const kd = hyp(kx, ky);
    if (kd < reach) {
      const s = kd > 1e-3 ? reach / kd : 0;
      e.x = kd > 1e-3 ? p.x + kx * s : p.x + reach;
      e.y = kd > 1e-3 ? p.y + ky * s : p.y;
    }
    // Crowded from several sides: slip sideways for a moment (the E.T. Returns "spread" idea), then rest.
    const side = e.cooldowns._side;
    if (hyp(rx[i], ry[i]) > CROWD.crowded && (side === undefined || side <= -CROWD.sideRest)) e.cooldowns._side = CROWD.sideTime;
  }
}
