// Shared plumbing for the sim files: the per-step context, event helper, geometry and the player-damage rule.
import type { Rng } from '../rng';
import { buffMods, type BuffMods } from '../stats';
import { speedMul } from '../status';
import type { Enemy, GameEvent, Player, Projectile, World } from '../types';

export type Ctx = {
  w: World;
  p: Player;
  rng: Rng;
  dt: number;
  /** Cached buff modifiers; null after anything that changes buffs (see dirtyMods). */
  m: BuffMods | null;
};

export const HIT_FLASH = 0.08;
export const SPAWN_Y = 1000;
/** Enemies knocked back never rise above this y. */
export const MAX_ENEMY_Y = 1060;
/** Elite stat multipliers (hp x3 and xp x3 live where they apply). */
export const ELITE_SPEED = 1.1;
export const ELITE_CONTACT = 1.5;

export const emit = (c: Ctx, e: GameEvent): void => {
  c.w.events.push(e);
};
export const newUid = (c: Ctx): number => c.w.nextUid++;
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
/** Math.hypot is several times slower than this in V8, and these run in the hot loops. */
export const hyp = (x: number, y: number): number => Math.sqrt(x * x + y * y);
export const dist = (ax: number, ay: number, bx: number, by: number): number => hyp(ax - bx, ay - by);
export const alive = (e: Enemy): boolean => e.state !== 'dead';
/** Alive and not already lethally damaged: the only enemies a side effect (chain, blast) may still hurt. */
export const hurtable = (e: Enemy): boolean => e.state !== 'dead' && e.hp > 0;
/** Scratch numbers in Enemy.cooldowns default to 0. */
export const cdGet = (e: Enemy, key: string): number => e.cooldowns[key] ?? 0;

/** Buff modifiers for the current moment (cached until dirtyMods). */
export function mods(c: Ctx): BuffMods {
  if (c.m === null) c.m = buffMods(c.p.buffs, c.p.dips, c.w.content);
  return c.m;
}
export function dirtyMods(c: Ctx): void {
  c.m = null;
}

/** Speed (u/s) an enemy walks at right now, before it knows whether it is walking: def.speed x status slow x elite,
 *  and a runner's dash/rest rhythm (e.t is its cycle clock). */
export function enemySpeed(e: Enemy, slow = speedMul(e)): number {
  let s = e.def.speed * slow * (e.elite ? ELITE_SPEED : 1);
  const d = e.def.dash;
  if (d && d.go + d.rest > 0) s *= e.t % (d.go + d.rest) < d.go ? d.boost : 0;
  return s;
}
/** How fast an enemy is closing in along y (for aim leading). */
export const approachSpeed = (e: Enemy): number => e.state === 'escape' ? -enemySpeed(e) * 1.5 : e.state === 'walk' ? enemySpeed(e) * (e.boss ? 4 : 1) : 0;

/** Hurt Kannan with a shot, blast or boss attack. Shots can be dodged (stats.dodge). Returns true if it landed. */
export function hurtPlayer(c: Ctx, base: number, source: 'shot' | 'boss' | 'explode'): boolean {
  const { p } = c;
  if (p.dashT > 0) return false; // free mode: dash i-frames
  if (p.stats.dodge > 0 && c.rng.chance(p.stats.dodge)) {
    emit(c, { t: 'dodge' });
    return false;
  }
  const dmg = base * (1 + p.stats.dmgTakenPct);
  if (!c.w.god) p.hp -= dmg;
  p.hurtAnim = 0.2;
  emit(c, { t: 'playerHit', dmg, source });
  return true;
}

/** An enemy projectile flying from (x, y) to (tx, ty); counter mode lands on the counter (ty 0). tx = landing x; hopsLeft = 1 marks a boss shot.
 *  Free mode: the shot flies straight on past (tx, ty) and hits whatever of Kannan it touches (enemies.ts updateEnemyShots). */
export function enemyShot(c: Ctx, x: number, y: number, tx: number, dmg: number, speed: number, sprite: string, boss: boolean, ty = 0): Projectile {
  const d = hyp(tx - x, ty - y) || 1;
  return {
    uid: newUid(c), owner: 'enemy', sprite, motion: 'enemy', x, y, vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, z: 0, t: 0,
    ttl: d / speed + 1, dmg, radius: 8, pierceLeft: 0, hopsLeft: boss ? 1 : 0, hit: [], returning: false, targetUid: null, tx, ty,
    stats: null, spin: 0,
  };
}
