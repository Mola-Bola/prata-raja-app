// Kannan's projectiles in flight (straight, lob, wave, boomerang, orbit) and the lingering zones they leave.
// A projectile is removed by setting ttl = -1; sim.ts sweeps them out at the end of the step.
import type { BreadStats, Enemy, Projectile } from '../types';
import { alive, clamp, dist, emit, hyp, newUid, type Ctx } from './ctx';
import { DOT_ZONE, dotDamage, hitEnemy, killEnemy } from './hit';
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

/** Closest approach of the segment a->b to a circle at e: the segment parameter (0..1) when it touches, else -1. */
function sweep(ax: number, ay: number, bx: number, by: number, ex: number, ey: number, r: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? clamp(((ex - ax) * dx + (ey - ay) * dy) / len2, 0, 1) : 0;
  const cx = ax + dx * t - ex;
  const cy = ay + dy * t - ey;
  return cx * cx + cy * cy < r * r ? t : -1;
}

/** The first un-hit enemy the projectile's last move touched, or null. */
function firstTouched(c: Ctx, s: Projectile, px: number, py: number): Enemy | null {
  let best: Enemy | null = null;
  let bt = 2;
  for (const e of c.w.enemies) {
    if (!alive(e) || s.hit.includes(e.uid)) continue;
    const t = sweep(px, py, s.x, s.y, e.x, e.y, s.radius + e.def.radius);
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

/** Turn the velocity toward the nearest un-hit enemy, at most HOMING_TURN x homing rad/s. */
function steer(c: Ctx, s: Projectile, homing: number): void {
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
  const lim = HOMING_TURN * homing * c.dt;
  const a = cur + clamp(diff, -lim, lim);
  s.vx = Math.sin(a) * speed;
  s.vy = Math.cos(a) * speed;
}

/** Egg: a ring of small straight fragments from the hit enemy. They carry a stats copy with fragments 0 (no recursion). */
function spawnFragments(c: Ctx, s: Projectile, e: Enemy): void {
  const st = s.stats as BreadStats;
  const n = st.fragments;
  const fst: BreadStats = { ...st, fragments: 0, hops: 0, pierce: 0, stun: 0, knockback: 0, dmg: st.fragmentDmg };
  const a0 = c.rng.range(0, (2 * Math.PI) / n);
  for (let i = 0; i < n; i++) {
    const a = a0 + (2 * Math.PI * i) / n;
    c.w.projectiles.push({
      uid: newUid(c), owner: 'player', sprite: s.sprite, breadId: s.breadId, motion: 'straight', x: e.x, y: e.y,
      vx: Math.sin(a) * FRAGMENT_SPEED, vy: Math.cos(a) * FRAGMENT_SPEED, z: 0, t: 0, ttl: FRAGMENT_TTL, dmg: st.fragmentDmg,
      radius: FRAGMENT_RADIUS * (1 + c.p.stats.sizePct), pierceLeft: 0, hopsLeft: 0, hit: [e.uid], returning: false,
      targetUid: null, tx: 0, ty: 0, stats: fst, spin: 0,
    });
  }
}

/** One straight-shot hit: shield block / pierce / hop / fragments / done. Returns true when the shot flies on (pierced). */
function straightHit(c: Ctx, s: Projectile, e: Enemy): boolean {
  const st = s.stats as BreadStats;
  s.hit.push(e.uid);
  if (hitEnemy(c, e, s.dmg, st, s.pierceLeft <= 0)) {
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
      s.ttl = s.t + st.hopRange / speed + 0.25;
      return false;
    }
  }
  if (st.fragments > 0) spawnFragments(c, s, e);
  s.ttl = -1;
  return false;
}

function updateStraight(c: Ctx, s: Projectile): void {
  const st = s.stats as BreadStats;
  if (st.homing > 0 && st.fragments === 0) steer(c, s, st.homing);
  const px = s.x;
  const py = s.y;
  s.x += s.vx * c.dt;
  s.y += s.vy * c.dt;
  for (let e = firstTouched(c, s, px, py); e; e = firstTouched(c, s, px, py)) {
    if (!straightHit(c, s, e)) return;
  }
  if (s.t >= s.ttl || s.y > OUT_Y || s.y < OUT_NEAR_Y || Math.abs(s.x) > OUT_X) s.ttl = -1;
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
    if (alive(e) && dist(s.tx, s.ty, e.x, e.y) <= s.radius + e.def.radius) hitEnemy(c, e, s.dmg, st, false);
  }
  if (st.zoneTime > 0) {
    w.zones.push({ uid: newUid(c), x: s.tx, y: s.ty, radius: s.radius, dps: st.zoneDps, time: st.zoneTime, sprite: 'fx/smoke' });
  }
  s.ttl = -1;
}

function updateLob(c: Ctx, s: Projectile): void {
  s.x += s.vx * c.dt;
  s.y += s.vy * c.dt;
  const u = Math.min(1, s.t / s.ttl);
  s.z = 4 * u * (1 - u);
  if (s.t >= s.ttl) land(c, s);
}

function updateWave(c: Ctx, s: Projectile): void {
  const st = s.stats as BreadStats;
  s.y += s.vy * c.dt;
  for (let i = 0; i < c.w.enemies.length; i++) {
    const e = c.w.enemies[i];
    if (!alive(e) || s.hit.includes(e.uid)) continue;
    if (Math.abs(e.y - s.y) <= e.def.radius + WAVE_REACH && Math.abs(e.x - s.x) <= s.radius + e.def.radius) {
      s.hit.push(e.uid);
      hitEnemy(c, e, s.dmg, st, false);
    }
  }
  if (s.t >= s.ttl) s.ttl = -1;
}

/** Boomerang: out along its heading for ty (= range) u, then home to Kannan's current spot; each enemy once per direction. */
function updateBoomerang(c: Ctx, s: Projectile): void {
  const { p } = c;
  const st = s.stats as BreadStats;
  const speed = hyp(s.vx, s.vy);
  const px = s.x;
  const py = s.y;
  if (!s.returning) {
    s.x += s.vx * c.dt;
    s.y += s.vy * c.dt;
    if (s.t * speed >= s.ty) {
      s.returning = true;
      s.hit.length = 0;
    }
  } else {
    const dx = p.x - s.x;
    const dy = -s.y;
    const d = hyp(dx, dy);
    if (d < Math.max(30, speed * c.dt)) {
      s.ttl = -1;
      return;
    }
    s.vx = (dx / d) * speed;
    s.vy = (dy / d) * speed;
    s.x += s.vx * c.dt;
    s.y += s.vy * c.dt;
  }
  for (let e = firstTouched(c, s, px, py); e; e = firstTouched(c, s, px, py)) {
    s.hit.push(e.uid);
    if (hitEnemy(c, e, s.dmg, st, true)) {
      s.ttl = -1;
      return;
    }
  }
  if (s.t >= s.ttl) s.ttl = -1;
}

/** Orbit: the orb rides its ring and bites anything it touches, once per orbitHitGap (the hit list is cleared on a fixed beat). */
function updateOrbit(c: Ctx, s: Projectile): void {
  const st = s.stats as BreadStats;
  placeOrb(c, s);
  const gap = st.orbitHitGap > 0 ? st.orbitHitGap : 0.5;
  const window = Math.floor(c.w.time / gap);
  if (window !== s.hopsLeft) {
    s.hit.length = 0;
    s.hopsLeft = window;
  }
  for (let i = 0; i < c.w.enemies.length; i++) {
    const e = c.w.enemies[i];
    if (!alive(e) || s.hit.includes(e.uid)) continue;
    if (dist(s.x, s.y, e.x, e.y) < s.radius + e.def.radius) {
      s.hit.push(e.uid);
      hitEnemy(c, e, s.dmg, st, false);
    }
  }
}

export function updatePlayerShots(c: Ctx): void {
  const list = c.w.projectiles;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.owner !== 'player' || s.ttl < 0) continue;
    s.t += c.dt;
    s.spin += SPIN_RATE * c.dt;
    switch (s.motion) {
      case 'straight':
        updateStraight(c, s);
        break;
      case 'lob':
        updateLob(c, s);
        break;
      case 'wave':
        updateWave(c, s);
        break;
      case 'boomerang':
        updateBoomerang(c, s);
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
