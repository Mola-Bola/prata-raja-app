// Damage rules: a bread hit on an enemy, dip chain/sambal side effects, DoT bookkeeping, kills, XP and gold.
import { rollHit, xpToNext } from '../stats';
import { applyHitEffect, dmgTakenMul, hasStatus, onBreadHit } from '../status';
import type { BreadStats, Enemy, HitEffect } from '../types';
import { cdGet, clamp, dirtyMods, dist, emit, HIT_FLASH, hurtable, mods, type Ctx } from './ctx';
import { spawnEnemy } from './spawn';

/** Where a DoT number comes from (picks its colour). */
export const DOT_BURN = 0;
export const DOT_SUGAR = 1;
export const DOT_ZONE = 2;
const DOT_EVERY = 0.5;
const ZONE_COLOR = '#C9D98C';

function stun(c: Ctx, e: Enemy, time: number): void {
  const s = e.statuses.find((x) => x.id === 'stun');
  if (s) s.time = Math.max(s.time, time);
  else {
    e.statuses.push({ id: 'stun', time, stacks: 1, dps: 0, amount: 0 });
    emit(c, { t: 'status', uid: e.uid, status: 'stun' });
  }
}

/** A bread hit lands on e. `shieldable` = a straight/boomerang shot without pierce left: a front shield eats the hit
 *  (no dips, no crit) and the caller must stop the projectile. The bread's armourPierce share of that hit skips the
 *  shield and goes to hp. Returns true when the shield blocked.
 *  Otherwise: damage (crit roll), stun/knockback from the bread, every owned dip, Kannan's hit-buffs, kill check. */
export function hitEnemy(c: Ctx, e: Enemy, dmg: number, st: BreadStats | null, shieldable: boolean, guaranteedCrit = false): boolean {
  const { w, p } = c;
  if (shieldable && e.shield > 0) {
    const ap = clamp(st ? st.armourPierce : 0, 0, 1);
    const d = rollHit(dmg, p.stats, mods(c), 1, c.rng, false).dmg;
    e.shield = Math.max(0, e.shield - d * (1 - ap));
    e.flash = HIT_FLASH;
    emit(c, { t: 'shieldHit', uid: e.uid, x: e.x, y: e.y });
    if (e.shield <= 0) emit(c, { t: 'shieldBreak', uid: e.uid, x: e.x, y: e.y });
    if (ap > 0) {
      const through = d * ap * dmgTakenMul(e);
      e.hp -= through;
      emit(c, { t: 'hit', uid: e.uid, x: e.x, y: e.y, dmg: through, crit: false, color: null });
      if (e.hp <= 0) killEnemy(c, e);
    }
    return true;
  }
  const r = rollHit(dmg, guaranteedCrit ? { ...p.stats, critChance: 1 } : p.stats, mods(c), dmgTakenMul(e), c.rng);
  e.hp -= r.dmg;
  e.flash = HIT_FLASH;
  emit(c, { t: 'hit', uid: e.uid, x: e.x, y: e.y, dmg: r.dmg, crit: r.crit, color: null });
  if (st) {
    if (st.healOnHit) {
      const hp = Math.min(st.healOnHit, p.stats.maxHp - p.hp);
      p.hp += hp;
      if (hp > 0) emit(c, { t: 'heal', hp });
    }
    if (st.pull) {
      const dx = -Math.sign(e.x) * Math.min(Math.abs(e.x), st.pull);
      e.x += dx;
      e.cooldowns.bx = (e.cooldowns.bx ?? e.x - dx) + dx;
    }
    if (st.stun > 0) stun(c, e, st.stun);
    if (st.knockback > 0) e.knock += st.knockback * (e.def.knockbackTaken ?? 1) * (e.boss ? 0.1 : 1);
  }
  for (const d of p.dips) {
    if (e.state === 'dead') break; // a cascade (chain -> sambal) already finished it: no effects on a corpse
    const def = w.content.dips[d.id];
    const fx = def.levels[d.level - 1];
    for (const ev of applyHitEffect(fx, e)) emit(c, ev);
    if (fx.type === 'chain') chain(c, e, fx, def.color);
  }
  onBreadHit(p, w.content);
  dirtyMods(c);
  if (e.hp <= 0) killEnemy(c, e);
  return false;
}

/** Masala: from the hit enemy the spark hops up to `jumps` times, each time to the nearest enemy within `range`
 *  of the last one it touched. Chain damage never crits. */
export function chain(c: Ctx, src: Enemy, fx: { dmg: number; jumps: number; range: number }, color: string): void {
  const { w, p } = c;
  const points = [{ x: src.x, y: src.y }];
  const hit: Enemy[] = [];
  let cur = src;
  for (let j = 0; j < fx.jumps; j++) {
    let best: Enemy | null = null;
    let bd = fx.range * fx.range;
    for (const o of w.enemies) {
      if (!hurtable(o) || o === src || hit.includes(o)) continue;
      const dx = o.x - cur.x;
      const dy = o.y - cur.y;
      const d = dx * dx + dy * dy;
      if (d <= bd) {
        best = o;
        bd = d;
      }
    }
    if (!best) break;
    hit.push(best);
    points.push({ x: best.x, y: best.y });
    const r = rollHit(fx.dmg, p.stats, mods(c), dmgTakenMul(best), c.rng, false);
    best.hp -= r.dmg;
    best.flash = HIT_FLASH;
    emit(c, { t: 'hit', uid: best.uid, x: best.x, y: best.y, dmg: r.dmg, crit: false, color });
    cur = best;
  }
  if (points.length > 1) emit(c, { t: 'chain', points });
  for (const o of hit) if (o.hp <= 0) killEnemy(c, o);
}

/** Sambal: a burning enemy dies in a blast that hurts and ignites its neighbours (which may chain-explode). */
function sambalBlast(c: Ctx, src: Enemy, fx: { dmg: number; radius: number }, color: string): void {
  const { w, p } = c;
  emit(c, { t: 'blast', x: src.x, y: src.y, radius: fx.radius, color });
  const fish = p.dips.find((d) => d.id === 'fish-curry');
  const burn: HitEffect = fish ? w.content.dips['fish-curry'].levels[fish.level - 1] : { type: 'burn', dps: 3, time: 2 };
  for (let i = 0; i < w.enemies.length; i++) {
    const o = w.enemies[i];
    if (o === src || !hurtable(o) || dist(src.x, src.y, o.x, o.y) > fx.radius + o.def.radius) continue;
    const r = rollHit(fx.dmg, p.stats, mods(c), dmgTakenMul(o), c.rng, false);
    o.hp -= r.dmg;
    o.flash = HIT_FLASH;
    emit(c, { t: 'hit', uid: o.uid, x: o.x, y: o.y, dmg: r.dmg, crit: false, color });
    for (const ev of applyHitEffect(burn, o)) emit(c, ev);
    if (o.hp <= 0) killEnemy(c, o);
  }
}

// ── DoT bookkeeping ──────────────────────────────────────────────────────────

/** Subtract DoT damage now; the number shown is batched per enemy (Enemy.cooldowns _da amount, _dt timer, _ds source). */
export function dotDamage(e: Enemy, amount: number, src: number): void {
  e.hp -= amount;
  e.cooldowns._da = cdGet(e, '_da') + amount;
  e.cooldowns._ds = src;
}

/** Emit the batched DoT number every 0.5 s (or at once with force, e.g. on death). */
export function flushDot(c: Ctx, e: Enemy, force = false): void {
  const acc = cdGet(e, '_da');
  e.cooldowns._dt = cdGet(e, '_dt') + c.dt;
  if (!force && e.cooldowns._dt < DOT_EVERY) return;
  e.cooldowns._dt = 0;
  if (acc <= 0) return;
  e.cooldowns._da = 0;
  const src = cdGet(e, '_ds');
  const dips = c.w.content.dips;
  const color = src === DOT_BURN ? dips['fish-curry']?.color : src === DOT_SUGAR ? dips['condensed-milk']?.color : ZONE_COLOR;
  emit(c, { t: 'dot', uid: e.uid, x: e.x, y: e.y, dmg: acc, color: color ?? '#FFFFFF' });
}

// ── Kills, XP, gold ──────────────────────────────────────────────────────────

/** Add XP; every threshold crossed is a level-up waiting for a card pick. */
function addXp(c: Ctx, amount: number): void {
  const { p, w } = c;
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = xpToNext(p.level);
    w.pendingLevelUps++;
    emit(c, { t: 'levelUp', level: p.level });
    const heal = Math.min(p.stats.healOnLevelUpPct * p.stats.maxHp, p.stats.maxHp - p.hp);
    if (heal > 0 && p.hp > 0) {
      p.hp += heal;
      emit(c, { t: 'heal', hp: heal });
    }
  }
}

/** Kill an enemy (once): rewards, dhal, sambal, splitting. `wasBurning` lets a DoT that just ran out still count. */
export function killEnemy(c: Ctx, e: Enemy, wasBurning?: boolean): void {
  if (e.state === 'dead') return;
  const { w, p } = c;
  const burning = wasBurning ?? hasStatus(e, 'burn');
  e.state = 'dead';
  flushDot(c, e, true);
  w.kills++;
  if (e.boss) w.bossKills++;
  const xp = e.def.xp * (e.elite ? 3 : 1) * (1 + p.stats.xpPct);
  emit(c, { t: 'kill', uid: e.uid, x: e.x, y: e.y, enemyId: e.def.id, xp, boss: e.boss, elite: e.elite });
  emit(c, { t: 'xp', amount: xp, x: e.x, y: e.y });
  addXp(c, xp);
  for (const d of p.dips) {
    const def = w.content.dips[d.id];
    const fx = def.levels[d.level - 1];
    if (fx.type === 'healOnKill' && p.hp > 0) {
      const h = Math.min(fx.hp, p.stats.maxHp - p.hp);
      if (h > 0) {
        p.hp += h;
        emit(c, { t: 'heal', hp: h });
      }
    } else if (fx.type === 'deathBlast' && burning) sambalBlast(c, e, fx, def.color);
  }
  const split = e.def.split;
  const into = split ? w.content.enemies[split.into] : undefined;
  if (split && into) {
    for (let i = 0; i < split.count; i++) {
      const x = e.x + c.rng.range(-30, 30);
      spawnEnemy(c, into, x, { y: Math.max(e.y + c.rng.range(-15, 15), 40) });
    }
  }
  const gold = (e.elite ? 5 : 0) + (e.boss ? 50 : 0) + (c.rng.chance(0.15) ? 1 : 0);
  w.gold += gold * (1 + p.stats.goldPct);
}
