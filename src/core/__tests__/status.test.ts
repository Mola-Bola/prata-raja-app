import { describe, expect, it } from 'vitest';
import type { Buff, Content, DipId, Enemy, HitEffect, OwnedDip, Player, Status, StatusId } from '../types';
import { applyHitEffect, dmgTakenMul, hasStatus, isDisabled, onBreadHit, speedMul, tickBuffs, tickStatuses } from '../status';

// Minimal fixtures: only the fields status.ts reads. Cast, because the rest of Enemy/Player/Content is not needed here.
function enemy(o: { statuses?: Status[]; boss?: boolean; knockbackTaken?: number } = {}): Enemy {
  return {
    uid: 7,
    def: { id: 'walker', knockbackTaken: o.knockbackTaken },
    boss: o.boss ?? false,
    statuses: o.statuses ?? [],
    knock: 0,
  } as unknown as Enemy;
}
const st = (id: StatusId, o: Partial<Status> = {}): Status => ({ id, time: 1, stacks: 1, dps: 0, amount: 0, ...o });
const get = (e: Enemy, id: StatusId) => e.statuses.find((s) => s.id === id);
const evt = (status: StatusId) => ({ t: 'status', uid: 7, status });
function player(dips: OwnedDip[] = [], buffs: Buff[] = []): Player {
  return { dips, buffs } as unknown as Player;
}
/** content.dips[id].levels: index 0 is level 1. */
function content(dips: Record<string, HitEffect[]>): Content {
  return { dips: Object.fromEntries(Object.entries(dips).map(([id, levels]) => [id, { id, levels }])) } as unknown as Content;
}
const owned = (id: DipId, level = 1): OwnedDip => ({ id, level });

const SUGAR = { type: 'sugar', slowPct: 0.3, slowTime: 4, dpsPerStack: 2, stackTime: 5, crashAt: 3, crashStun: 1.5 } satisfies HitEffect;
const CHILL = { type: 'chill', slowPerStack: 0.1, time: 2, freezeAt: 3, freezeTime: 1.5 } satisfies HitEffect;
const TENDER = { type: 'tender', knockback: 10, dmgTakenPct: 0.2, time: 3 } satisfies HitEffect;
const HASTE = { type: 'haste', everyHits: 3, throwSpeedPct: 0.2, time: 4 } satisfies HitEffect;
const SPIN = { type: 'spin', projSpeedPct: 0.1, critDmgPct: 0.5, time: 2 } satisfies HitEffect;
const STACK = { type: 'stackDmg', pctPerStack: 0.05, maxStacks: 3, time: 2, critAtMax: 0.1 } satisfies HitEffect;

describe('applyHitEffect: burn', () => {
  it('first application emits one event; refresh takes max time and max dps and emits nothing', () => {
    const e = enemy();
    expect(applyHitEffect({ type: 'burn', time: 2, dps: 3 }, e)).toEqual([evt('burn')]);
    expect(applyHitEffect({ type: 'burn', time: 1, dps: 5 }, e)).toEqual([]);
    expect(applyHitEffect({ type: 'burn', time: 4, dps: 1 }, e)).toEqual([]);
    expect(e.statuses).toHaveLength(1);
    expect(get(e, 'burn')).toMatchObject({ time: 4, dps: 5 });
  });
});

describe('applyHitEffect: sugar', () => {
  it('stacks to crashAt, then crashes: sugar cleared, stun added, sugarSlow kept', () => {
    const e = enemy();
    // Newly added statuses emit: sugarSlow, then sugar.
    expect(applyHitEffect(SUGAR, e)).toEqual([evt('sugarSlow'), evt('sugar')]);
    expect(applyHitEffect(SUGAR, e)).toEqual([]);
    expect(get(e, 'sugar')).toMatchObject({ stacks: 2, dps: 2, time: 5, amount: 0 });
    expect(applyHitEffect(SUGAR, e)).toEqual([evt('stun')]);
    expect(hasStatus(e, 'sugar')).toBe(false);
    expect(get(e, 'stun')).toMatchObject({ time: 1.5 });
    expect(get(e, 'sugarSlow')).toMatchObject({ amount: 0.3, time: 4 });
    // The next hit starts a fresh sugar stack.
    expect(applyHitEffect(SUGAR, e)).toEqual([evt('sugar')]);
    expect(get(e, 'sugar')).toMatchObject({ stacks: 1 });
  });

  it('sugarSlow refresh sets amount and keeps the longer time', () => {
    const long = enemy({ statuses: [st('sugarSlow', { time: 10, amount: 0.1 })] });
    applyHitEffect(SUGAR, long);
    expect(get(long, 'sugarSlow')).toMatchObject({ time: 10, amount: 0.3 });
    const short = enemy({ statuses: [st('sugarSlow', { time: 1, amount: 0.1 })] });
    applyHitEffect(SUGAR, short);
    expect(get(short, 'sugarSlow')).toMatchObject({ time: 4, amount: 0.3 });
  });

  it('crash refreshes an existing stun to the longer time and emits even when already stunned', () => {
    const e = enemy({ statuses: [st('sugar', { stacks: 2, dps: 2, time: 5 }), st('sugarSlow', { time: 4 }), st('stun', { time: 1 })] });
    expect(applyHitEffect(SUGAR, e)).toEqual([evt('stun')]);
    expect(get(e, 'stun')).toMatchObject({ time: 1.5 });
  });
});

describe('applyHitEffect: chill', () => {
  it('stacks chill and freezes at freezeAt, clearing chill', () => {
    const e = enemy();
    expect(applyHitEffect(CHILL, e)).toEqual([evt('chill')]);
    expect(applyHitEffect(CHILL, e)).toEqual([]);
    expect(get(e, 'chill')).toMatchObject({ stacks: 2, amount: 0.1, time: 2 });
    expect(applyHitEffect(CHILL, e)).toEqual([evt('freeze')]);
    expect(hasStatus(e, 'chill')).toBe(false);
    expect(get(e, 'freeze')).toMatchObject({ time: 1.5 });
  });

  it('freeze refresh sets time to freezeTime and still emits', () => {
    const e = enemy({ statuses: [st('freeze', { time: 5 }), st('chill', { stacks: 2, amount: 0.1 })] });
    expect(applyHitEffect(CHILL, e)).toEqual([evt('freeze')]);
    expect(get(e, 'freeze')).toMatchObject({ time: 1.5 });
  });
});

describe('applyHitEffect: tender', () => {
  it('marks dmg-taken and emits only when new', () => {
    const e = enemy();
    expect(applyHitEffect(TENDER, e)).toEqual([evt('tender')]);
    expect(get(e, 'tender')).toMatchObject({ amount: 0.2, time: 3 });
    expect(applyHitEffect({ ...TENDER, dmgTakenPct: 0.4, time: 5 }, e)).toEqual([]);
    expect(get(e, 'tender')).toMatchObject({ amount: 0.4, time: 5 });
  });

  it('knock scales by knockbackTaken, and by 0.1 for bosses', () => {
    const knockOf = (e: Enemy) => {
      applyHitEffect(TENDER, e);
      return e.knock;
    };
    expect(knockOf(enemy())).toBeCloseTo(10);
    expect(knockOf(enemy({ knockbackTaken: 0.25 }))).toBeCloseTo(2.5);
    expect(knockOf(enemy({ boss: true }))).toBeCloseTo(1);
    expect(knockOf(enemy({ boss: true, knockbackTaken: 0.25 }))).toBeCloseTo(0.25);
  });
});

describe('applyHitEffect: non-status effects', () => {
  it('chain, deathBlast, haste, spin, stackDmg, healOnKill return [] and change nothing', () => {
    const effects: HitEffect[] = [
      { type: 'chain', dmg: 3, jumps: 2, range: 50 },
      { type: 'deathBlast', dmg: 5, radius: 40 },
      HASTE,
      SPIN,
      STACK,
      { type: 'healOnKill', hp: 2 },
    ];
    for (const eff of effects) {
      const e = enemy({ statuses: [st('burn', { time: 2, dps: 3 })] });
      const before = JSON.parse(JSON.stringify(e));
      expect(applyHitEffect(eff, e)).toEqual([]);
      expect(e).toEqual(before);
    }
  });
});

describe('tickStatuses', () => {
  it('burn deals dps x (1 + dotPct) x dt', () => {
    const e = enemy({ statuses: [st('burn', { time: 1, dps: 10 })] });
    expect(tickStatuses(e, 0.25, 0)).toBeCloseTo(2.5);
    expect(tickStatuses(e, 0.25, 0.5)).toBeCloseTo(3.75);
    expect(get(e, 'burn')).toMatchObject({ time: 0.5 });
  });

  it('sugar deals dps x stacks x (1 + dotPct) x dt', () => {
    const e = enemy({ statuses: [st('sugar', { time: 5, stacks: 3, dps: 2 })] });
    expect(tickStatuses(e, 1, 0.1)).toBeCloseTo(6.6);
  });

  it('partial final tick: 0.1 s left ticks for min(dt, 0.1) and expires', () => {
    const e = enemy({ statuses: [st('burn', { time: 0.1, dps: 10 })] });
    expect(tickStatuses(e, 0.25, 0)).toBeCloseTo(1);
    expect(e.statuses).toEqual([]);
  });

  it('expired statuses are removed, the rest keep ticking; non-DoT statuses deal no damage', () => {
    const e = enemy({ statuses: [st('stun', { time: 0.5 }), st('sugarSlow', { time: 0.2, amount: 0.3 }), st('chill', { time: 2, stacks: 2, amount: 0.1 })] });
    expect(tickStatuses(e, 0.25, 0)).toBe(0);
    expect(e.statuses.map((s) => s.id)).toEqual(['stun', 'chill']);
    expect(get(e, 'stun')).toMatchObject({ time: 0.25 });
    expect(get(e, 'chill')).toMatchObject({ time: 1.75 });
  });

  it('float residue from repeated dt does not keep an expired status alive', () => {
    // 0.5 minus five 0.1s leaves ~3e-17 in doubles; without EPS the stun would survive a sixth tick.
    const e = enemy({ statuses: [st('stun', { time: 0.5 })] });
    for (let i = 0; i < 5; i++) tickStatuses(e, 0.1, 0);
    expect(hasStatus(e, 'stun')).toBe(false);
  });
});

describe('speedMul, dmgTakenMul, isDisabled', () => {
  it('stun and freeze stop the enemy (speed 0) regardless of slows', () => {
    for (const id of ['stun', 'freeze'] as const) {
      const e = enemy({ statuses: [st(id), st('sugarSlow', { amount: 0.3 })] });
      expect(speedMul(e)).toBe(0);
      expect(isDisabled(e)).toBe(true);
    }
  });

  it('sugarSlow and chill multiply; chill uses amount x stacks', () => {
    // (1 - 0.3) * (1 - 0.1 * 2) = 0.56
    const e = enemy({ statuses: [st('sugarSlow', { amount: 0.3 }), st('chill', { stacks: 2, amount: 0.1 })] });
    expect(speedMul(e)).toBeCloseTo(0.56);
    expect(isDisabled(e)).toBe(false);
  });

  it('floors speed at 0.15', () => {
    expect(speedMul(enemy({ statuses: [st('sugarSlow', { amount: 0.9 })] }))).toBeCloseTo(0.15);
    expect(speedMul(enemy({ statuses: [st('sugarSlow', { amount: 0.9 }), st('chill', { stacks: 2, amount: 0.5 })] }))).toBe(0.15);
  });

  it('no statuses: full speed and normal damage; tender raises damage taken', () => {
    expect(speedMul(enemy())).toBe(1);
    expect(dmgTakenMul(enemy())).toBe(1);
    expect(dmgTakenMul(enemy({ statuses: [st('tender', { amount: 0.2 })] }))).toBeCloseTo(1.2);
  });
});

describe('onBreadHit', () => {
  it('teh-tarik: haste fires every N hits of the owned level; entry starts at time 0', () => {
    const c = content({ 'teh-tarik': [HASTE, { ...HASTE, everyHits: 2, time: 6 }] });
    const p = player([owned('teh-tarik', 2)]);
    onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'haste', time: 0, stacks: 0, hitCount: 1 }]);
    onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'haste', time: 6, stacks: 0, hitCount: 0 }]);
    onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'haste', time: 6, stacks: 0, hitCount: 1 }]);
  });

  it('ghee: spin is created on the first hit, then refreshed to effect.time', () => {
    const c = content({ ghee: [SPIN] });
    const p = player([owned('ghee')]);
    onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'spin', time: 2, stacks: 0, hitCount: 0 }]);
    tickBuffs(p, 1.5);
    onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'spin', time: 2, stacks: 0, hitCount: 0 }]);
  });

  it('chicken-curry: stacks grow one per hit and cap at maxStacks; time refreshed', () => {
    const c = content({ 'chicken-curry': [STACK] });
    const p = player([owned('chicken-curry')]);
    for (let i = 0; i < 4; i++) onBreadHit(p, c);
    expect(p.buffs).toEqual([{ id: 'stackDmg', time: 2, stacks: 3, hitCount: 0 }]);
  });

  it('dips whose effect is not a buff create no buff entries', () => {
    const p = player([owned('fish-curry')]);
    onBreadHit(p, content({ 'fish-curry': [{ type: 'burn', time: 2, dps: 3 }] }));
    expect(p.buffs).toEqual([]);
  });
});

describe('tickBuffs', () => {
  it('counts timers down and never below 0; haste stays at time 0 until triggered', () => {
    const p = player([], [{ id: 'spin', time: 1, stacks: 0, hitCount: 0 }, { id: 'haste', time: 0, stacks: 0, hitCount: 2 }]);
    tickBuffs(p, 0.4);
    expect(p.buffs[0].time).toBeCloseTo(0.6);
    tickBuffs(p, 1);
    expect(p.buffs).toEqual([{ id: 'spin', time: 0, stacks: 0, hitCount: 0 }, { id: 'haste', time: 0, stacks: 0, hitCount: 2 }]);
  });

  it('stackDmg loses all stacks when its time runs out', () => {
    const p = player([], [{ id: 'stackDmg', time: 0.5, stacks: 3, hitCount: 0 }]);
    tickBuffs(p, 0.3);
    expect(p.buffs[0]).toMatchObject({ stacks: 3 });
    expect(p.buffs[0].time).toBeCloseTo(0.2);
    tickBuffs(p, 0.3);
    expect(p.buffs[0]).toMatchObject({ time: 0, stacks: 0 });
  });
});
