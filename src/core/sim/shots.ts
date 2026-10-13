// Kannan's projectiles in flight (straight, lob, wave, boomerang, orbit) and the lingering zones they leave.
// A projectile is removed by setting ttl = -1; sim.ts sweeps them out at the end of the step.
// Movement is continuous: every projectile advances by the time it has left in the step, contacts are resolved in the order
// they happen along the path, and range limits clip the last bit of travel, so hits do not depend on the step size.
import type { BreadStats, Enemy, Projectile } from '../types';
import { alive, clamp, dist, emit, hyp, newUid, type Ctx } from './ctx';
import { applyHitEffect } from '../status';
import { chain, DOT_ZONE, dotDamage, hitEnemy, killEnemy } from './hit';
import { placeOrb } from './throw';

const HOMING_TURN = 5; // rad/s at homing 1
const FRAGMENT_SPEED = 600;
const FRAGMENT_RADIUS = 8;
const FRAGMENT_TTL = 0.6;
const SPIN_RATE = 14; // rad/s, for the renderer
const OUT_Y = 1060;
const OUT_NEAR_Y = -60;
const OUT_X = 330;
/** How far a wave bar reaches in y around its leading edge, on top of the enemy's radius. */
const WAVE_REACH = 20;
/** A returning boomerang is caught this close to Kannan. */
const CATCH_RADIUS = 30;
/** Time slices shorter than this are rounding dust. */
const TIME_EPS = 1e-9;

/** Where along the segment a->b (0 = a, 1 = b) it first touches a circle of radius r at (ex, ey); 0 when it starts inside; -1 never. */
function contactAt(ax: number, ay: number, bx: number, by: number, ex: number, ey: number, r: number): number {
  const fx = ax - ex;
  const fy = ay - ey;
  const outside = fx * fx + fy * fy - r * r;
  if (outside <= 0) return 0;
  const dx = bx - ax;
  const dy = by - ay;
  const a = dx * dx + dy * dy;
  const b = fx * dx + fy * dy;
  if (a === 0 || b >= 0) return -1; // not moving, or moving away
  const disc = b * b - a * outside;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / a;
  return t <= 1 ? t : -1;
}

/** The un-hit enemy the segment a->b touches first (ties: the earlier in the list), or null. */
function firstTouched(c: Ctx, s: Projectile, ax: number, ay: number, bx: number, by: number): Enemy | null {
  let best: Enemy | null = null;
  let bt = 2;
  for (const e of c.w.enemies) {
    if (!alive(e) || s.hit.includes(e.uid)) continue;
    const t = contactAt(ax, ay, bx, by, e.x, e.y, s.radius + e.def.radius);
    if (t >= 0 && t < bt) {
      best = e;
      bt = t;
    }
  }
  return best;
}

function nearestUnhit(c: Ctx, x: number, y: number, range: number, hit: number[]): Enemy | null {
  let best: Enemy | null = null;
  let bd = range;
  for (const e of c.w.enemies) {
    if (!alive(e) || hit.includes(e.uid)) continue;
    const d = dist(x, y, e.x, e.y);
    if (d <= bd) {
      best = e;
      bd = d;
    }
  }
  return best;
}

/** Turn the velocity toward the nearest un-hit enemy, at most HOMING_TURN x homing rad/s over `dt`. */
function steer(c: Ctx, s: Projectile, homing: number, dt: number): void {
  let best: Enemy | null = null;
  let bd = Infinity;
  for (const e of c.w.enemies) {
    if (!alive(e) || s.hit.includes(e.uid)) continue;
    const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
    if (d < bd) {
      best = e;
      bd = d;
    }
  }
  if (!best) return;
  const speed = hyp(s.vx, s.vy);
  const cur = Math.atan2(s.vx, s.vy);
  let diff = Math.atan2(best.x - s.x, best.y - s.y) - cur;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const lim = HOMING_TURN * homing * dt;
  const a = cur + clamp(diff, -lim, lim);
  s.vx = Math.sin(a) * speed;
  s.vy = Math.cos(a) * speed;
}

/** Egg: a ring of small straight fragments from the hit enemy. They carry a stats copy with fragments 0 (no recursion).
 *  `left` is the part of the step still to run after the hit; they fly it at once, so they are never a step ahead or behind. */
function spawnFragments(c: Ctx, s: Projectile, e: Enemy, left: number): void {
  const st = s.stats as BreadStats;
  const n = st.fragments;
  const fst: BreadStats = { ...st, fragments: 0, hops: 0, pierce: 0, stun: 0, knockback: 0, dmg: st.fragmentDmg };
  const a0 = c.rng.range(0, (2 * Math.PI) / n);
  for (let i = 0; i < n; i++) {
    const a = a0 + (2 * Math.PI * i) / n;
    const f: Projectile = {
      uid: newUid(c), owner: 'player', sprite: s.loaded ? 'breads/egg-telur' : s.sprite, breadId: s.breadId, motion: 'straight', x: e.x, y: e.y,
      vx: Math.sin(a) * FRAGMENT_SPEED, vy: Math.cos(a) * FRAGMENT_SPEED, z: 0, t: 0, ttl: s.loaded ? 0.9 : FRAGMENT_TTL, dmg: st.fragmentDmg,
      radius: FRAGMENT_RADIUS * (1 + c.p.stats.sizePct), pierceLeft: 0, hopsLeft: 0, hit: [e.uid], returning: false,
      targetUid: null, tx: 0, ty: 0, stats: fst, spin: 0,
    };
    c.w.projectiles.push(f);
    flyStraight(c, f, left);
  }
}

/** One straight-shot hit: shield block / pierce / hop / fragments / done. Returns true when the shot flies on (pierced or hopped). */
function straightHit(c: Ctx, s: Projectile, e: Enemy, left: number): boolean {
  const st = s.stats as BreadStats;
  s.hit.push(e.uid);
  if (hitEnemy(c, e, s.dmg, st, s.pierceLeft <= 0, s.guaranteedCrit, s.breadId)) {
    s.ttl = -1;
    return false;
  }
  if (s.pierceLeft > 0) {
    s.pierceLeft--;
    return true;
  }
  if (s.hopsLeft > 0) {
    const next = nearestUnhit(c, e.x, e.y, st.hopRange, s.hit);
    if (next) {
      const speed = hyp(s.vx, s.vy);
      const a = Math.atan2(next.x - e.x, next.y - e.y);
      s.hopsLeft--;
      s.dmg *= 1 - st.hopFalloff;
      s.x = e.x;
      s.y = e.y;
      s.vx = Math.sin(a) * speed;
      s.vy = Math.cos(a) * speed;
      s.targetUid = next.uid;
      s.ttl = s.t + st.hopRange / speed; // the next enemy is within hopRange, so that is all the leg needs
      return true;
    }
  }
  if (s.loaded) emit(c, { t: 'blast', x: e.x, y: e.y, radius: 85, color: null });
  if (st.fragments > 0) spawnFragments(c, s, e, left);
  s.ttl = -1;
  return false;
}

/** Fly `dt` seconds: each slice runs to the first contact (or the end of the path / lifetime), the hit is resolved, and the
 *  rest of the time carries on from there (pierce, hop, fragments). The path is clipped where the lifetime (= range) ends. */
function flyStraight(c: Ctx, s: Projectile, dt: number): void {
  const st = s.stats as BreadStats;
  let left = dt;
  while (left > TIME_EPS && s.ttl >= 0) {
    const life = s.ttl - s.t;
    if (life <= TIME_EPS) {
      s.ttl = -1;
      return;
    }
    const step = Math.min(left, life);
    if (st.homing > 0 && st.fragments === 0) steer(c, s, st.homing, step);
    const ax = s.x;
    const ay = s.y;
    const bx = ax + s.vx * step;
    const by = ay + s.vy * step;
    const e = firstTouched(c, s, ax, ay, bx, by);
    if (e) {
      const used = step * contactAt(ax, ay, bx, by, e.x, e.y, s.radius + e.def.radius);
      s.x = ax + s.vx * used;
      s.y = ay + s.vy * used;
      s.t += used;
      left -= used;
      if (!straightHit(c, s, e, left)) return;
    } else {
      s.x = bx;
      s.y = by;
      s.t += step;
      left -= step;
      if (s.y > OUT_Y || s.y < OUT_NEAR_Y || Math.abs(s.x) > OUT_X || s.t >= s.ttl - TIME_EPS) {
        s.ttl = -1;
        return;
      }
    }
  }
}

function land(c: Ctx, s: Projectile): void {
  const { w } = c;
  const st = s.stats as BreadStats;
  s.x = s.tx;
  s.y = s.ty;
  s.z = 0;
  emit(c, { t: 'blast', x: s.tx, y: s.ty, radius: s.radius, color: null });
  const n = w.enemies.length; // enemies born from these kills (splitters) are not caught by the same blast
  for (let i = 0; i < n; i++) {
    const e = w.enemies[i];
    if (alive(e) && dist(s.tx, s.ty, e.x, e.y) <= s.radius + e.def.radius) hitEnemy(c, e, s.dmg, st, false, s.guaranteedCrit, s.breadId);
  }
  if (st.zoneTime > 0) {
    w.zones.push({ uid: newUid(c), x: s.tx, y: s.ty, radius: s.radius, dps: st.zoneDps, time: st.zoneTime, sprite: 'fx/smoke', ...(st.zoneEffect ? { effect: st.zoneEffect, effectT: 0 } : {}) });
  }
  s.ttl = -1;
}

function updateLob(c: Ctx, s: Projectile): void {
  s.t += c.dt;
  s.x += s.vx * c.dt;
  s.y += s.vy * c.dt;
  const u = Math.min(1, s.t / s.ttl);
  s.z = 4 * u * (1 - u);
  if (s.t >= s.ttl) land(c, s);
}

/** Wave bar: its leading edge sweeps y0..y1 this step (never past ty = range). Every enemy in line with it whose reach
 *  window (radius + WAVE_REACH) the edge crosses is hit once, in the order the edge reaches them. */
function flyWave(c: Ctx, s: Projectile, dt: number): void {
  const st = s.stats as BreadStats;
  const y0 = s.y;
  const y1 = Math.min(y0 + s.vy * dt, s.ty);
  for (;;) {
    let best: Enemy | null = null;
    let bt = Infinity;
    for (const e of c.w.enemies) {
      if (!alive(e) || s.hit.includes(e.uid)) continue;
      const reach = e.def.radius + WAVE_REACH;
      if (Math.abs(e.x - s.x) > s.radius + e.def.radius || e.y - reach > y1 || e.y + reach < y0) continue;
      const t = Math.max(0, e.y - reach - y0);
      if (t < bt) {
        best = e;
        bt = t;
      }
    }
    if (!best) break;
    s.hit.push(best.uid);
    hitEnemy(c, best, s.dmg, st, false, s.guaranteedCrit, s.breadId);
  }
  s.t += (y1 - y0) / s.vy;
  s.y = y1;
  if (y1 >= s.ty - TIME_EPS) s.ttl = -1;
}

/** Boomerang: out along its heading for ty (= range) u, then home to Kannan's current spot until it is within CATCH_RADIUS.
 *  Each leg is flown in slices that end exactly at the turn / the catch point, and a slice's hits are resolved before the
 *  turn clears the hit list or the catch removes the projectile. An enemy is hit once per direction. */
function flyBoomerang(c: Ctx, s: Projectile, dt: number): void {
  const { p } = c;
  const st = s.stats as BreadStats;
  const speed = hyp(s.vx, s.vy);
  let left = dt;
  while (left > TIME_EPS && s.ttl >= 0) {
    let reach: number; // how far this leg still goes before it turns / is caught
    if (!s.returning) {
      reach = s.ty - speed * s.t;
    } else {
      const dx = p.x - s.x;
      const dy = -s.y;
      const d = hyp(dx, dy);
      if (d <= CATCH_RADIUS) {
        s.ttl = -1;
        return;
      }
      s.vx = (dx / d) * speed;
      s.vy = (dy / d) * speed;
      reach = d - CATCH_RADIUS;
    }
    const toEvent = Math.max(0, reach) / speed;
    const slice = Math.min(left, toEvent);
    const ax = s.x;
    const ay = s.y;
    const bx = ax + s.vx * slice;
    const by = ay + s.vy * slice;
    for (let e = firstTouched(c, s, ax, ay, bx, by); e; e = firstTouched(c, s, ax, ay, bx, by)) {
      s.hit.push(e.uid);
      if (hitEnemy(c, e, s.dmg, st, true, s.guaranteedCrit, s.breadId)) {
        s.ttl = -1;
        return;
      }
    }
    s.x = bx;
    s.y = by;
    s.t += slice;
    const arrived = toEvent <= left;
    left -= slice;
    if (arrived) {
      if (s.returning) {
        s.ttl = -1;
        return;
      }
      s.returning = true;
      s.hit.length = 0;
    }
  }
  if (s.t >= s.ttl) s.ttl = -1;
}

/** Orbit: the orb rides its ring and bites anything it touches. s.hit is a flat list [uid, time of last bite, ...]: an enemy
 *  that is still cooling down (less than orbitHitGap since this orb bit it) is skipped, so each orb has its own clock per enemy. */
function updateOrbit(c: Ctx, s: Projectile): void {
  const st = s.stats as BreadStats;
  s.t += c.dt;
  placeOrb(c, s);
  const gap = st.orbitHitGap > 0 ? st.orbitHitGap : 0.5;
  const now = c.w.time;
  const h = s.hit;
  for (let i = h.length - 2; i >= 0; i -= 2) if (now - h[i + 1] >= gap - TIME_EPS) h.splice(i, 2);
  for (let i = 0; i < c.w.enemies.length; i++) {
    const e = c.w.enemies[i];
    if (!alive(e) || dist(s.x, s.y, e.x, e.y) >= s.radius + e.def.radius) continue;
    let cooling = false;
    for (let k = 0; k < h.length; k += 2) if (h[k] === e.uid) cooling = true;
    if (cooling) continue;
    h.push(e.uid, now);
    hitEnemy(c, e, s.dmg, st, false, s.guaranteedCrit, s.breadId);
  }
}

export function updatePlayerShots(c: Ctx): void {
  const list = c.w.projectiles;
  const n = list.length; // fragments born during the pass already flew their share of it
  for (let i = 0; i < n; i++) {
    const s = list[i];
    if (s.owner !== 'player' || s.ttl < 0) continue;
    s.spin += SPIN_RATE * c.dt;
    switch (s.motion) {
      case 'straight':
        flyStraight(c, s, c.dt);
        break;
      case 'lob':
        updateLob(c, s);
        break;
      case 'wave':
        flyWave(c, s, c.dt);
        break;
      case 'boomerang':
        flyBoomerang(c, s, c.dt);
        break;
      case 'orbit':
        updateOrbit(c, s);
        break;
      default:
        break;
    }
  }
}

/** Zones burn everything inside them (no crit); expired ones are dropped. */
export function updateZones(c: Ctx): void {
  const { w, dt } = c;
  let keep = 0;
  for (let i = 0; i < w.zones.length; i++) {
    const z = w.zones[i];
    const live = Math.min(dt, z.time);
    z.time -= dt;
    const dmg = z.dps * (1 + c.p.stats.dotPct) * live;
    if (z.effect) {
      z.effectT = (z.effectT ?? 0) - live;
      if (z.effectT <= 0) {
        z.effectT += 1;
        const targets = w.enemies.filter(e => alive(e) && dist(z.x, z.y, e.x, e.y) <= z.radius + e.def.radius);
        if (z.effect.type === 'chain') {
          if (targets[0]) chain(c, targets[0], z.effect, w.content.dips.masala.color);
        } else for (const e of targets) for (const ev of applyHitEffect(z.effect, e)) emit(c, ev);
      }
    }
    if (dmg > 0) {
      for (let k = 0; k < w.enemies.length; k++) {
        const e = w.enemies[k];
        if (!alive(e) || dist(z.x, z.y, e.x, e.y) > z.radius + e.def.radius) continue;
        dotDamage(e, dmg, DOT_ZONE);
        if (e.hp <= 0) killEnemy(c, e);
      }
    }
    if (z.time > 0) w.zones[keep++] = z;
  }
  w.zones.length = keep;
}
