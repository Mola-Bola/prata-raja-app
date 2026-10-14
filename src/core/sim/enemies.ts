// Enemy behaviour per step: statuses and knockback, the walk/hold/attack state machine for every archetype, and enemy shots.
import { isDisabled, speedMul, tickStatuses } from '../status';
import { remainingKnockback } from '../knockback';
import { FIELD, type Enemy } from '../types';
import { bossPhase, updateBoss } from './boss';
import { alive, cdGet, clamp, dist, ELITE_CONTACT, emit, enemyShot, enemySpeed, hurtPlayer, hyp, MAX_ENEMY_Y, type Ctx } from './ctx';
import { DOT_BURN, DOT_SUGAR, dotDamage, flushDot, killEnemy } from './hit';
import { FREE, isFree } from './free';
import { spawnEnemy } from './spawn';

/** Slack for "at the counter" (the walk clamps enemies to reachY; a shove moves them well off it). */
const AT_COUNTER = 0.5;
const CONTACT_EVERY = 0.5;
const PI2 = Math.PI * 2;

/** Sideways drift while walking: a small wobble, a quick jitter for swarms, the zigzag for flyers (centred on bx). */
function wobble(e: Enemy, mt: number): number {
  const ph = cdGet(e, 'ph');
  const z = e.def.zigzag;
  if (z && e.def.kind === 'flyer') return z.amp * Math.sin((PI2 * mt) / z.period);
  if (e.def.kind === 'swarm') return 10 * Math.sin(mt * 5 + ph) + 6 * Math.sin(mt * 8.3 + 2 * ph);
  return 8 * Math.sin(mt * 1.7 + ph);
}
function lateralX(e: Enemy): number {
  return clamp(cdGet(e, 'bx') + wobble(e, cdGet(e, '_mt')), -FIELD.halfWidth, FIELD.halfWidth);
}

// ── Free mode: pests chase Kannan's (x, y) ───────────────────────────────────

/** Distance between centres at which a pest touches Kannan. */
const touchR = (e: Enemy): number => e.def.radius * FREE.contactScale + FIELD.kannanRadius;

/** Move toward (or, with a negative step, away from) Kannan by `step`, never past `stopAt` from him, plus the wobble as a sideways shuffle. */
function chase(c: Ctx, e: Enemy, step: number, stopAt: number, mtOld: number): void {
  const { p } = c;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = hyp(dx, dy) || 1;
  const go = Math.min(step, Math.max(0, d - stopAt));
  const wob = e.def.speed > 0 ? wobble(e, cdGet(e, '_mt')) - wobble(e, mtOld) : 0;
  e.x = clamp(e.x + (dx / d) * go - (dy / d) * wob, -FIELD.halfWidth, FIELD.halfWidth);
  e.y = clamp(e.y + (dy / d) * go + (dx / d) * wob, -40, MAX_ENEMY_Y);
}

function walkFree(c: Ctx, e: Enemy): void {
  const { p } = c;
  const reach = touchR(e);
  if (e.state === 'attack') {
    if (hyp(p.x - e.x, p.y - e.y) <= reach + 4) {
      contact(c, e);
      return;
    }
    e.state = 'walk';
  }
  const slow = speedMul(e);
  const mt = cdGet(e, '_mt');
  e.cooldowns._mt = mt + c.dt * slow;
  if (e.def.dash) e.t += c.dt;
  const sp = enemySpeed(e, slow) * FREE.pestSpeed * (e.def.kind === 'swarm' ? 1 + 0.1 * Math.sin(mt * 3 + cdGet(e, 'ph')) : 1);
  chase(c, e, sp * c.dt, reach, mt);
  if (hyp(p.x - e.x, p.y - e.y) <= reach + 1) e.state = 'attack';
}

/** Contact damage while at the counter. Aggregated into one 'playerHit' per CONTACT_EVERY (flushContact). */
function contact(c: Ctx, e: Enemy): void {
  const dmg = e.def.contactDps * (e.elite ? ELITE_CONTACT : 1) * (1 + c.p.stats.dmgTakenPct) * c.dt;
  if (dmg <= 0 || c.p.dashT > 0) return;
  if (!c.w.god) c.p.hp -= dmg;
  c.p.hurtAnim = 0.2;
  c.w.contactAcc = (c.w.contactAcc ?? 0) + dmg;
}

export function flushContact(c: Ctx, force = false): void {
  const { w } = c;
  w.contactT = (w.contactT ?? 0) + c.dt;
  if (!force && w.contactT < CONTACT_EVERY) return;
  w.contactT = force ? 0 : w.contactT - CONTACT_EVERY;
  const acc = w.contactAcc ?? 0;
  if (acc > 0) emit(c, { t: 'playerHit', dmg: acc, source: 'contact' });
  w.contactAcc = 0;
}

/** Plain walk toward the counter (walker, tank, splitter, shielded, runner, flyer, swarm and the walking half of the rest). */
function walk(c: Ctx, e: Enemy): void {
  if (isFree(c)) return walkFree(c, e);
  if (e.state === 'attack') {
    if (e.y <= FIELD.reachY + AT_COUNTER) {
      contact(c, e);
      return;
    }
    e.state = 'walk';
  }
  const slow = speedMul(e);
  e.cooldowns._mt = cdGet(e, '_mt') + c.dt * slow;
  if (e.def.dash) e.t += c.dt;
  e.y -= enemySpeed(e, slow) * c.dt * (e.def.kind === 'swarm' ? 1 + 0.1 * Math.sin(cdGet(e, '_mt') * 3 + cdGet(e, 'ph')) : 1);
  if (e.def.speed > 0) e.x = lateralX(e);
  if (e.y <= FIELD.reachY) {
    e.y = FIELD.reachY;
    e.state = 'attack';
  }
}

/** A mynah raids the tip jar once, then flies back up the street; it can still be killed in flight. */
function updateThief(c: Ctx, e: Enemy): void {
  if (e.state === 'escape') {
    e.y += enemySpeed(e) * 1.5 * c.dt;
    e.cooldowns._mt = cdGet(e, '_mt') + c.dt * speedMul(e);
    e.x = lateralX(e);
    if (e.y >= MAX_ENEMY_Y) e.state = 'dead'; // escaped: no kill, XP or refund
    return;
  }
  // Never run contact(), even if an old state already has it at the counter.
  if (e.state !== 'attack') walk(c, e);
  if (e.state === 'attack') {
    const gold = Math.min(c.w.gold, e.def.stealGold ?? 0);
    c.w.gold -= gold;
    e.cooldowns._stolenGold = gold;
    e.state = 'escape';
    emit(c, { t: 'theft', uid: e.uid, x: e.x, y: e.y, gold });
  }
}

/** Shooters and healers walk to their holdY, then park. True once parked. */
function holdAt(c: Ctx, e: Enemy): boolean {
  if (isFree(c)) {
    const hold = e.holdY * FREE.holdScale;
    const d = hyp(c.p.x - e.x, c.p.y - e.y);
    if (d > hold) {
      const slow = speedMul(e);
      const mt = cdGet(e, '_mt');
      e.cooldowns._mt = mt + c.dt * slow;
      chase(c, e, enemySpeed(e, slow) * FREE.pestSpeed * c.dt, hold, mt);
    }
    e.state = hyp(c.p.x - e.x, c.p.y - e.y) <= hold + 0.5 ? 'hold' : 'walk';
    return e.state === 'hold';
  }
  if (e.y > e.holdY) {
    const slow = speedMul(e);
    e.cooldowns._mt = cdGet(e, '_mt') + c.dt * slow;
    e.y = Math.max(e.holdY, e.y - enemySpeed(e, slow) * c.dt);
    if (e.def.speed > 0) e.x = lateralX(e);
    e.state = e.y <= e.holdY ? 'hold' : 'walk';
  } else {
    e.state = 'hold';
  }
  return e.state === 'hold';
}

function fireEnemyShot(c: Ctx, e: Enemy, tx: number, ty = 0): void {
  const r = e.def.ranged;
  if (!r) return;
  c.w.projectiles.push(enemyShot(c, e.x, e.y, tx, r.dmg, r.projSpeed, r.projSprite, false, ty));
  emit(c, { t: 'enemyShot', uid: e.uid });
}

function updateShooter(c: Ctx, e: Enemy): void {
  const r = e.def.ranged;
  if (!r) return walk(c, e);
  if (!holdAt(c, e)) return;
  const cd = e.cooldowns;
  if (cdGet(e, '_aim') === 1) {
    e.t -= c.dt;
    if (e.t <= 0) {
      fireEnemyShot(c, e, cdGet(e, '_tx'), cdGet(e, '_ty'));
      cd._aim = 0;
      cd._cd = r.cooldown;
    }
  } else {
    cd._cd = cdGet(e, '_cd') - c.dt;
    if (cd._cd <= 0) {
      cd._aim = 1;
      cd._tx = c.p.x;
      cd._ty = isFree(c) ? c.p.y : 0;
      e.t = r.aimTime;
      emit(c, { t: 'aim', uid: e.uid, x: e.x, y: e.y, tx: c.p.x, time: r.aimTime, ...(isFree(c) ? { ty: c.p.y } : {}) });
    }
  }
}

function updateHealer(c: Ctx, e: Enemy): void {
  const h = e.def.heal;
  if (!h) return walk(c, e);
  if (!holdAt(c, e)) return;
  const amount = h.hps * c.dt;
  for (const o of c.w.enemies) {
    if (o === e || !alive(o) || o.hp >= o.maxHp || dist(e.x, e.y, o.x, o.y) > h.radius) continue;
    o.hp = Math.min(o.maxHp, o.hp + amount);
  }
}

function updateSummoner(c: Ctx, e: Enemy): void {
  const s = e.def.summon;
  walk(c, e);
  if (!s) return;
  e.t -= c.dt;
  if (e.t > 0) return;
  e.t = s.every;
  const def = c.w.content.enemies[s.id];
  if (!def) return;
  let near = 0;
  for (const o of c.w.enemies) if (alive(o) && o.def.id === s.id && dist(e.x, e.y, o.x, o.y) <= 250) near++;
  if (near >= s.max) return;
  const side = c.rng.chance(0.5) ? -1 : 1;
  const x = clamp(e.x + side * c.rng.range(30, 60), -FIELD.halfWidth, FIELD.halfWidth);
  spawnEnemy(c, def, x, { y: e.y });
}

function updateExploder(c: Ctx, e: Enemy): void {
  const x = e.def.explode;
  if (!x) return walk(c, e);
  if (e.state === 'fuse') {
    e.t -= c.dt;
    if (e.t <= 0) {
      emit(c, { t: 'blast', x: e.x, y: e.y, radius: x.radius, color: null });
      // it only hurts Kannan if it is still at the counter and he stands inside the blast
      if (isFree(c) ? hyp(c.p.x - e.x, c.p.y - e.y) <= x.radius : e.y <= FIELD.reachY + AT_COUNTER && Math.abs(c.p.x - e.x) <= x.radius) hurtPlayer(c, x.dmg, 'explode');
      e.state = 'dead'; // blows up without a kill: no xp, no gold
    }
    return;
  }
  walk(c, e);
  if (e.state === 'attack') {
    e.state = 'fuse';
    e.t = x.fuse;
  }
}

/** Which dip colours a DoT number: whichever of burn / sugar hurts more right now. */
function dotSource(e: Enemy): number {
  let burn = 0;
  let sugar = 0;
  for (const s of e.statuses) {
    if (s.id === 'burn') burn = s.dps;
    else if (s.id === 'sugar') sugar = s.dps * s.stacks;
  }
  return burn >= sugar ? DOT_BURN : DOT_SUGAR;
}

export function updateEnemies(c: Ctx): void {
  const { w, dt } = c;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    if (!alive(e)) continue;
    e.age += dt;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
    if (e.knock > 0) {
      const remaining = remainingKnockback(e.knock, dt);
      const move = e.knock - remaining;
      if (isFree(c)) {
        const dx = e.x - c.p.x;
        const dy = e.y - c.p.y;
        const d = hyp(dx, dy) || 1;
        e.x = clamp(e.x + (dx / d) * move, -FIELD.halfWidth, FIELD.halfWidth);
        e.y = Math.min(e.y + (dy / d) * move, MAX_ENEMY_Y);
      } else e.y = Math.min(e.y + move, MAX_ENEMY_Y);
      e.knock = remaining;
    }
    if (e.statuses.length > 0 || cdGet(e, '_da') > 0) {
      const burning = e.statuses.some((s) => s.id === 'burn');
      const immune = e.statuses.some((s) => s.id === 'ccImmune');
      const src = dotSource(e);
      const dot = tickStatuses(e, dt, c.p.stats.dotPct);
      // A freeze or stun just ran out: the enemy shrugs off the next for a while (the renderer outlines it).
      if (!immune && e.statuses.some((s) => s.id === 'ccImmune')) emit(c, { t: 'status', uid: e.uid, status: 'ccImmune' });
      if (dot > 0) dotDamage(e, dot, src);
      flushDot(c, e);
      if (e.hp <= 0) {
        killEnemy(c, e, burning);
        continue;
      }
    }
    if (e.boss) bossPhase(c, e);
    if (isDisabled(e)) continue;
    if (e.boss) {
      updateBoss(c, e);
      continue;
    }
    if (e.def.stealGold) {
      updateThief(c, e);
      continue;
    }
    switch (e.def.kind) {
      case 'shooter':
        updateShooter(c, e);
        break;
      case 'healer':
        updateHealer(c, e);
        break;
      case 'summoner':
        updateSummoner(c, e);
        break;
      case 'exploder':
        updateExploder(c, e);
        break;
      default:
        walk(c, e);
    }
  }
  flushContact(c);
}

/** Enemy projectiles fly to (tx, 0). On arrival they hit Kannan if he stands within kannanHitHalfWidth of it. */
export function updateEnemyShots(c: Ctx): void {
  const list = c.w.projectiles;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.owner !== 'enemy' || s.ttl < 0) continue;
    s.t += c.dt;
    s.spin += 10 * c.dt;
    s.x += s.vx * c.dt;
    s.y += s.vy * c.dt;
    if (isFree(c)) {
      // flies straight on and hits Kannan if it touches him; a dash lets it through (hurtPlayer)
      if (c.p.dashT <= 0 && dist(s.x, s.y, c.p.x, c.p.y) <= s.radius + FREE.shotHit) {
        s.ttl = -1;
        hurtPlayer(c, s.dmg, s.hopsLeft === 1 ? 'boss' : 'shot');
      } else if (s.t >= s.ttl - 0.5 || s.y < -80 || s.y > MAX_ENEMY_Y + 40 || Math.abs(s.x) > FIELD.halfWidth + 80) s.ttl = -1;
    } else if (s.y <= 0) {
      s.ttl = -1;
      if (Math.abs(s.tx - c.p.x) <= FIELD.kannanHitHalfWidth) hurtPlayer(c, s.dmg, s.hopsLeft === 1 ? 'boss' : 'shot');
      else emit(c, { t: 'splat', x: s.tx });
    } else if (s.t >= s.ttl) {
      s.ttl = -1;
    }
  }
}
