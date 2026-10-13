// Kannan's throwing: cooldowns, targeting, volleys and what each bread motion launches. Orbit breads keep their orbs alive here.
import { effectiveCooldown } from '../stats';
import { FIELD, type BreadDef, type BreadMotion, type BreadStats, type Enemy, type OwnedBread, type Projectile } from '../types';
import { alive, approachSpeed, clamp, emit, hyp, mods, newUid, type Ctx } from './ctx';

const RAD = Math.PI / 180;
/** extraProjectiles fan out this far apart. */
const FAN = 12 * RAD;
const THROW_ANIM = 0.18;
/** Orbit rings circle this field point in front of Kannan. */
const ORBIT_Y = 90;

function base(c: Ctx, def: BreadDef, st: BreadStats, motion: BreadMotion): Projectile {
  return {
    uid: newUid(c), owner: 'player', sprite: def.sprite, breadId: def.id, motion, x: c.p.x, y: 0, vx: 0, vy: 0, z: 0, t: 0, ttl: 1,
    dmg: st.dmg, radius: st.radius, pierceLeft: 0, hopsLeft: 0, hit: [], returning: false, targetUid: null, tx: 0, ty: 0, stats: st, spin: 0,
  };
}

// ── Targeting ────────────────────────────────────────────────────────────────

/** Is `a` the better thing to shoot than `b`? Whatever is at the counter hurting Kannan (state 'attack') comes first, however far
 *  along the counter it stands; then whatever is closest to the counter (lowest y); then whatever is nearest his lane. Equal
 *  in all three: false, so the first one found keeps its place. */
function shootFirst(a: Enemy, b: Enemy, px: number): boolean {
  const aAttacks = a.state === 'attack';
  if (aAttacks !== (b.state === 'attack')) return aAttacks;
  if (!aAttacks && a.y !== b.y) return a.y < b.y;
  return Math.abs(a.x - px) < Math.abs(b.x - px);
}

/** The enemy to shoot at: shootFirst's pick among the living ones within range of (player.x, 0). */
function nearestInRange(c: Ctx, range: number): Enemy | null {
  const { w, p } = c;
  const r2 = range * range;
  let best: Enemy | null = null;
  for (const e of w.enemies) {
    if (!alive(e)) continue;
    const dx = e.x - p.x;
    if (dx * dx + e.y * e.y > r2) continue;
    if (best === null || shootFirst(e, best, p.x)) best = e;
  }
  return best;
}

function anyInRange(c: Ctx, range: number): boolean {
  const r2 = range * range;
  for (const e of c.w.enemies) {
    const dx = e.x - c.p.x;
    if (alive(e) && dx * dx + e.y * e.y <= r2) return true;
  }
  return false;
}

/** The `n` best in-range enemies to bomb: a blast that catches the most attackers (enemies at the counter) first, then the most
 *  living neighbours within `blast`, then shootFirst's order. Later picks prefer enemies outside the blast of the earlier ones
 *  (so extra bombs find another cluster), then anything left. */
function clusterTargets(c: Ctx, range: number, blast: number, n: number): Enemy[] {
  const { w, p } = c;
  const r2 = range * range;
  const cands: Enemy[] = [];
  const score: number[] = [];
  const attackers: number[] = [];
  for (const e of w.enemies) {
    const dx = e.x - p.x;
    const d2 = dx * dx + e.y * e.y;
    if (!alive(e) || d2 > r2) continue;
    let s = 0;
    let a = e.state === 'attack' ? 1 : 0;
    for (const o of w.enemies) {
      if (o !== e && alive(o) && hyp(o.x - e.x, o.y - e.y) <= blast) {
        s++;
        if (o.state === 'attack') a++;
      }
    }
    cands.push(e);
    score.push(s);
    attackers.push(a);
  }
  const out: Enemy[] = [];
  const used = new Set<number>();
  const clear = (i: number): boolean => out.every((o) => hyp(o.x - cands[i].x, o.y - cands[i].y) > blast);
  const better = (i: number, j: number): boolean =>
    attackers[i] !== attackers[j] ? attackers[i] > attackers[j] : score[i] !== score[j] ? score[i] > score[j] : shootFirst(cands[i], cands[j], p.x);
  while (out.length < n && out.length < cands.length) {
    let bi = -1;
    for (const needClear of [true, false]) {
      for (let i = 0; i < cands.length; i++) {
        if (used.has(i) || (needClear && !clear(i))) continue;
        if (bi < 0 || better(i, bi)) bi = i;
      }
      if (bi >= 0) break;
    }
    used.add(bi);
    out.push(cands[bi]);
  }
  return out;
}

/** Where e will be after t seconds closing at vs: never past the reach line, and a boss never past where it parks. */
const predictY = (e: Enemy, vs: number, t: number): number =>
  Math.max(FIELD.reachY, e.boss ? e.holdY : -Infinity, e.y - vs * t);

/** Angle (0 = straight up the street, + = right) that meets the enemy: it walks toward Kannan while the shot flies. */
function aimAngle(c: Ctx, e: Enemy, speed: number): number {
  const px = c.p.x;
  const vs = approachSpeed(e);
  let ty = e.y;
  let t = hyp(e.x - px, ty) / speed;
  for (let i = 0; i < 3; i++) {
    ty = predictY(e, vs, t);
    t = hyp(e.x - px, ty) / speed;
  }
  return Math.atan2(e.x - px, ty);
}

// ── Launching ────────────────────────────────────────────────────────────────

function spawnStraight(c: Ctx, def: BreadDef, st: BreadStats, motion: 'straight' | 'boomerang', ang: number, speed: number, range: number, target: Enemy | null): void {
  const s = base(c, def, st, motion);
  s.vx = Math.sin(ang) * speed;
  s.vy = Math.cos(ang) * speed;
  s.radius = st.radius * (1 + c.p.stats.sizePct);
  s.targetUid = target ? target.uid : null;
  if (motion === 'straight') {
    s.pierceLeft = st.pierce;
    s.hopsLeft = st.hops;
    s.ttl = range / speed; // exactly the range: shots.ts clips the last bit of travel, so nothing lands beyond it
  } else {
    s.ty = range; // boomerang: how far out it flies before turning
    s.ttl = (2 * range) / speed + 3;
  }
  c.w.projectiles.push(s);
}

/** Thosai: a bar that rolls up the street. radius = half its width (extra projectiles widen it instead of multiplying it),
 *  ty = how far up it rolls (its range). */
function spawnWave(c: Ctx, def: BreadDef, st: BreadStats, speed: number, range: number): void {
  const s = base(c, def, st, 'wave');
  s.vy = speed;
  s.radius = (st.width * (1 + c.p.stats.sizePct) * (1 + 0.25 * c.p.stats.extraProjectiles)) / 2;
  s.ty = range;
  s.ttl = range / speed;
  c.w.projectiles.push(s);
}

/** Roti Bomb / Naan: arcs to where the enemy will be when it lands. radius = blast radius. */
function spawnLob(c: Ctx, def: BreadDef, st: BreadStats, target: Enemy): void {
  const s = base(c, def, st, 'lob');
  const time = Math.max(0.05, st.lobTime);
  s.tx = clamp(target.x, -FIELD.halfWidth, FIELD.halfWidth);
  s.ty = predictY(target, approachSpeed(target), time);
  s.vx = (s.tx - c.p.x) / time;
  s.vy = s.ty / time;
  s.ttl = time;
  s.radius = st.blast * (1 + c.p.stats.sizePct);
  s.targetUid = target.uid;
  c.w.projectiles.push(s);
}

/** Launch `members` volley members (numbers m0..m0+members-1 of st.count) at once. False when there is nothing to hit. */
function throwMembers(c: Ctx, def: BreadDef, st: BreadStats, m0: number, members: number): boolean {
  const { p } = c;
  const range = st.range * (1 + p.stats.rangePct);
  const extra = p.stats.extraProjectiles;
  const speed = Math.max(1, st.speed * (1 + mods(c).projSpeedPct));
  switch (def.motion) {
    case 'lob': {
      const n = members * (1 + extra);
      const targets = clusterTargets(c, range, def.target === 'cluster' ? st.blast * (1 + p.stats.sizePct) : 0, n);
      if (targets.length === 0) return false;
      for (let i = 0; i < n; i++) spawnLob(c, def, st, targets[i % targets.length]);
      return true;
    }
    case 'wave': {
      if (!anyInRange(c, range)) return false;
      for (let i = 0; i < members; i++) spawnWave(c, def, st, speed, range);
      return true;
    }
    case 'straight':
    case 'boomerang': {
      let target: Enemy | null = null;
      let a0 = 0;
      if (def.target === 'none') {
        if (!anyInRange(c, range)) return false;
      } else {
        target = nearestInRange(c, range);
        if (!target) return false;
        a0 = aimAngle(c, target, speed);
      }
      for (let m = 0; m < members; m++) {
        const vol = st.count > 1 ? (m0 + m - (st.count - 1) / 2) * st.spread * RAD : 0;
        for (let j = 0; j <= extra; j++) {
          spawnStraight(c, def, st, def.motion, a0 + vol + (j - extra / 2) * FAN, speed, range, target);
        }
      }
      return true;
    }
    default:
      return false;
  }
}

/** First shot of a throw. Volley members after the first follow every volleyGap (see continueVolley). */
function tryFire(c: Ctx, b: OwnedBread, def: BreadDef, st: BreadStats): boolean {
  const together = st.volleyGap <= 0 ? Math.max(1, st.count) : 1;
  if (!throwMembers(c, def, st, 0, together)) return false;
  if (st.volleyGap > 0 && st.count > 1) {
    b.volleyLeft = st.count - 1;
    b.volleyT = st.volleyGap;
  }
  return true;
}

/** Remaining volley members leave every volleyGap, even while Kannan moves; each re-aims. */
function continueVolley(c: Ctx, b: OwnedBread, def: BreadDef, st: BreadStats): void {
  b.volleyT -= c.dt;
  const gap = Math.max(st.volleyGap, 0.02);
  while (b.volleyLeft > 0 && b.volleyT <= 0) {
    const m = clamp(st.count - b.volleyLeft, 1, Math.max(1, st.count - 1));
    if (!throwMembers(c, def, st, m, 1)) {
      b.volleyLeft = 0;
      return;
    }
    b.volleyLeft--;
    b.volleyT += gap;
  }
}

// ── Orbit ────────────────────────────────────────────────────────────────────

/** Put an orb on its ring: evenly spaced, turning st.speed degrees per second (orb index in targetUid). */
export function placeOrb(c: Ctx, s: Projectile): void {
  const st = s.stats as BreadStats;
  const n = Math.max(1, st.count + c.p.stats.extraProjectiles);
  const ang = (2 * Math.PI * (s.targetUid ?? 0)) / n + st.speed * RAD * c.w.time;
  s.x = c.p.x + st.orbitRadius * Math.cos(ang);
  s.y = ORBIT_Y + st.orbitRadius * Math.sin(ang);
}

/** Keep exactly count + extraProjectiles orbs alive for an orbit bread; rebuild them when its level or size changes.
 *  Orb fields: targetUid = index on the ring, pierceLeft = bread level when built, hit = [uid, last bite time, ...] (shots.ts). */
function syncOrbs(c: Ctx, b: OwnedBread, def: BreadDef, st: BreadStats): void {
  const n = Math.max(1, st.count + c.p.stats.extraProjectiles);
  const radius = st.radius * (1 + c.p.stats.sizePct);
  let have = 0;
  let stale = false;
  for (const s of c.w.projectiles) {
    if (s.motion !== 'orbit' || s.breadId !== b.id || s.ttl < 0) continue;
    have++;
    if (s.pierceLeft !== b.level || s.radius !== radius) stale = true;
  }
  if (have === n && !stale) return;
  for (const s of c.w.projectiles) if (s.motion === 'orbit' && s.breadId === b.id) s.ttl = -1;
  for (let i = 0; i < n; i++) {
    const s = base(c, def, st, 'orbit');
    s.radius = radius;
    s.pierceLeft = b.level;
    s.targetUid = i;
    s.ttl = 1e9;
    placeOrb(c, s);
    c.w.projectiles.push(s);
  }
}

// ── Per-step entry ───────────────────────────────────────────────────────────

/** Count every bread's cooldown down and throw. Archero rule: cooldowns only run at throwWhileMoving x rate while Kannan moves. */
export function updateThrowing(c: Ctx): void {
  const { p, w } = c;
  const rate = p.moving ? p.stats.throwWhileMoving : 1;
  for (const b of p.breads) {
    const def = w.content.breads[b.id];
    const st = def.levels[b.level - 1];
    if (def.motion === 'orbit') {
      syncOrbs(c, b, def, st);
      continue;
    }
    if (b.volleyLeft > 0) continueVolley(c, b, def, st);
    if (b.volleyLeft > 0) {
      // a new throw waits for the unfinished volley; the cooldown that ran out meanwhile is not banked
      b.cd = Math.max(0, b.cd - c.dt * rate);
      continue;
    }
    b.cd -= c.dt * rate;
    if (b.cd > 0 || rate <= 0) continue;
    if (tryFire(c, b, def, st)) {
      b.cd += effectiveCooldown(st.cooldown, p.stats, mods(c));
      p.throwAnim = THROW_ANIM;
      emit(c, { t: 'throw', breadId: b.id, x: p.x });
    } else {
      b.cd = 0;
    }
  }
}
