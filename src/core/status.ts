// Enemy statuses from dips (burn, sugar/diabetes, chill/freeze, tender, stun) and Kannan's self-buffs.
// OWNER: swarm builder "status". Pure functions over the passed objects (mutate only what the JSDoc says).
import type { Buff, Content, Enemy, GameEvent, HitEffect, Player, Status, StatusId } from './types';

/** Repeated `time -= dt` leaves float residue (0.5 minus five 0.1s is ~3e-17); anything this small counts as expired. */
const EPS = 1e-9;

const find = (e: Enemy, id: StatusId): Status | undefined => e.statuses.find((s) => s.id === id);
const fresh = (id: StatusId, time: number, o: Partial<Status> = {}): Status => ({ id, time, stacks: 1, dps: 0, amount: 0, ...o });
function drop(e: Enemy, id: StatusId): void {
  const i = e.statuses.findIndex((s) => s.id === id);
  if (i >= 0) e.statuses.splice(i, 1);
}

/** Apply one dip effect to the enemy a bread just hit (mutates e.statuses / e.knock). Returns a 'status' event
 *  only when a status is newly added (not on refresh). Rules:
 *  - burn: one 'burn' status; refresh time = max(time, effect.time), dps = max(dps, effect.dps).
 *  - sugar: refresh 'sugarSlow' (amount = slowPct, time = max(time, slowTime)); 'sugar' stacks += 1
 *    (time = stackTime, dps = dpsPerStack, amount 0). When stacks reach crashAt: remove 'sugar',
 *    add/refresh 'stun' (time = max(time, crashStun)) and return a 'status' event for 'stun' (Sugar Crash).
 *  - chill: 'chill' stacks += 1 (time = effect.time, amount = slowPerStack). When stacks reach freezeAt:
 *    remove 'chill', add/refresh 'freeze' (time = freezeTime), event 'freeze'.
 *  - tender: refresh 'tender' (amount = dmgTakenPct, time); e.knock += knockback × (e.def.knockbackTaken ?? 1) × (e.boss ? 0.1 : 1).
 *  - chain, deathBlast, haste, spin, stackDmg, healOnKill: not statuses; return [] and change nothing. */
export function applyHitEffect(effect: HitEffect, e: Enemy): GameEvent[] {
  const out: GameEvent[] = [];
  const ev = (status: StatusId): void => {
    out.push({ t: 'status', uid: e.uid, status });
  };
  switch (effect.type) {
    case 'burn': {
      const b = find(e, 'burn');
      if (b) {
        b.time = Math.max(b.time, effect.time);
        b.dps = Math.max(b.dps, effect.dps);
      } else {
        e.statuses.push(fresh('burn', effect.time, { dps: effect.dps }));
        ev('burn');
      }
      break;
    }
    case 'sugar': {
      const slow = find(e, 'sugarSlow');
      if (slow) {
        slow.amount = effect.slowPct;
        slow.time = Math.max(slow.time, effect.slowTime);
      } else {
        e.statuses.push(fresh('sugarSlow', effect.slowTime, { amount: effect.slowPct }));
        ev('sugarSlow');
      }
      let sugar = find(e, 'sugar');
      if (!sugar) {
        sugar = fresh('sugar', effect.stackTime, { stacks: 0 });
        e.statuses.push(sugar);
        ev('sugar');
      }
      sugar.stacks += 1;
      sugar.time = effect.stackTime;
      sugar.dps = effect.dpsPerStack;
      if (sugar.stacks >= effect.crashAt) {
        drop(e, 'sugar');
        const stun = find(e, 'stun');
        if (stun) stun.time = Math.max(stun.time, effect.crashStun);
        else e.statuses.push(fresh('stun', effect.crashStun));
        ev('stun');
      }
      break;
    }
    case 'chill': {
      let chill = find(e, 'chill');
      if (!chill) {
        chill = fresh('chill', effect.time, { stacks: 0 });
        e.statuses.push(chill);
        ev('chill');
      }
      chill.stacks += 1;
      chill.time = effect.time;
      chill.amount = effect.slowPerStack;
      if (chill.stacks >= effect.freezeAt) {
        drop(e, 'chill');
        const freeze = find(e, 'freeze');
        if (freeze) freeze.time = effect.freezeTime;
        else e.statuses.push(fresh('freeze', effect.freezeTime));
        ev('freeze');
      }
      break;
    }
    case 'tender': {
      const t = find(e, 'tender');
      if (t) {
        t.amount = effect.dmgTakenPct;
        t.time = effect.time;
      } else {
        e.statuses.push(fresh('tender', effect.time, { amount: effect.dmgTakenPct }));
        ev('tender');
      }
      e.knock += effect.knockback * (e.def.knockbackTaken ?? 1) * (e.boss ? 0.1 : 1);
      break;
    }
    // chain, deathBlast, haste, spin, stackDmg, healOnKill: not statuses.
    default:
      break;
  }
  return out;
}

/** Advance e's statuses by dt; remove expired ones. Returns DoT damage dealt this tick (caller subtracts it):
 *  burn: dps × (1 + dotPct) × dt; sugar: dps × stacks × (1 + dotPct) × dt. (Expiry uses the time left
 *  before this tick: a status with 0.1 s left ticks for min(dt, 0.1).) */
export function tickStatuses(e: Enemy, dt: number, dotPct: number): number {
  let dot = 0;
  for (let i = e.statuses.length - 1; i >= 0; i--) {
    const s = e.statuses[i];
    const live = Math.min(dt, s.time);
    if (s.id === 'burn') dot += s.dps * (1 + dotPct) * live;
    else if (s.id === 'sugar') dot += s.dps * s.stacks * (1 + dotPct) * live;
    s.time -= dt;
    if (s.time <= EPS) e.statuses.splice(i, 1);
  }
  return dot;
}

/** 0 while stunned or frozen; otherwise (1 − sugarSlow.amount) × (1 − chill.amount × chill.stacks), never below 0.15. */
export function speedMul(e: Enemy): number {
  if (isDisabled(e)) return 0;
  const slow = find(e, 'sugarSlow')?.amount ?? 0;
  const chill = find(e, 'chill');
  const chillSlow = chill ? chill.amount * chill.stacks : 0;
  return Math.max(0.15, (1 - slow) * (1 - chillSlow));
}

/** 1 + tender.amount (1 without tender). */
export function dmgTakenMul(e: Enemy): number {
  return 1 + (find(e, 'tender')?.amount ?? 0);
}

/** True while stunned or frozen (no moving, no attacking). */
export function isDisabled(e: Enemy): boolean {
  return hasStatus(e, 'stun') || hasStatus(e, 'freeze');
}

export function hasStatus(e: Enemy, id: StatusId): boolean {
  return find(e, id) !== undefined;
}

/** Kannan's self-buffs after any bread hit, from his owned dips at their current level (content.dips[id].levels[level-1]):
 *  teh-tarik (haste): buff 'haste' hitCount += 1; when hitCount reaches everyHits -> hitCount = 0 and time = effect.time.
 *  ghee (spin): buff 'spin' time = effect.time (refresh).
 *  chicken-curry (stackDmg): buff 'stackDmg' stacks = min(maxStacks, stacks + 1), time = effect.time.
 *  Creates a buff entry on first use (time 0 until triggered for haste). Mutates player.buffs only. */
export function onBreadHit(player: Player, content: Content): void {
  for (const dip of player.dips) {
    const eff = content.dips[dip.id].levels[dip.level - 1];
    if (eff.type === 'haste') {
      const b = buff(player, 'haste');
      b.hitCount += 1;
      if (b.hitCount >= eff.everyHits) {
        b.hitCount = 0;
        b.time = eff.time;
      }
    } else if (eff.type === 'spin') {
      buff(player, 'spin').time = eff.time;
    } else if (eff.type === 'stackDmg') {
      const b = buff(player, 'stackDmg');
      b.stacks = Math.min(eff.maxStacks, b.stacks + 1);
      b.time = eff.time;
    }
  }
}

function buff(player: Player, id: Buff['id']): Buff {
  let b = player.buffs.find((x) => x.id === id);
  if (!b) {
    b = { id, time: 0, stacks: 0, hitCount: 0 };
    player.buffs.push(b);
  }
  return b;
}

/** Count buff timers down by dt (never below 0). stackDmg loses all stacks when its time runs out. Mutates player.buffs. */
export function tickBuffs(player: Player, dt: number): void {
  for (const b of player.buffs) {
    b.time = Math.max(0, b.time - dt);
    if (b.time <= EPS) {
      b.time = 0;
      if (b.id === 'stackDmg') b.stacks = 0;
    }
  }
}
