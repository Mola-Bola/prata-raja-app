import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { advanceContactAttack, contactAttackPhase, normalContactEnemy } from '../contactAttack';
import { makeRng } from '../rng';
import { createRun, step } from '../sim';
import { updateEnemies } from '../sim/enemies';
import type { Ctx } from '../sim/ctx';
import type { Enemy, EnemyDef, Status } from '../types';

function context(): Ctx {
  const w = createRun({ seed: 17, content: CONTENT });
  w.player.breads = [];
  w.player.stats.maxHp = 1000; w.player.hp = 1000;
  return { w, p: w.player, rng: makeRng(17), dt: 0, m: null };
}
function enemy(c: Ctx, over: Partial<Enemy> = {}): Enemy {
  const def: EnemyDef = { id: 'fixture', kind: 'walker', name: 'Walker', hp: 100, speed: 100, contactDps: 5, radius: 18, xp: 0, sprite: 'enemies/roach' };
  const e: Enemy = { uid: c.w.nextUid++, def, boss: false, elite: false, x: 0, y: 30, hp: 100, maxHp: 100, shield: 0, statuses: [], state: 'attack', t: 7, age: 0, knock: 0, flash: 0, cooldowns: { bx: 0, ph: 0 }, phase: 0, holdY: 600, ...over };
  c.w.enemies.push(e);
  return e;
}
function tick(c: Ctx, dt: number) { c.dt = dt; c.w.time += dt; updateEnemies(c); }
const cc = (id: 'stun' | 'freeze', time: number): Status => ({ id, time, stacks: 1, dps: 0, amount: 0 });

describe('normal counter attack clock', () => {
  it('first arrival starts a full .30s preparation before a .20s strike and .50s recovery', () => {
    const c = context(); const e = enemy(c, { state: 'walk', y: 130 });
    tick(c, 1.1);
    expect(e).toMatchObject({ state: 'attack', y: 30, contactClock: 0, t: 7 });
    expect(c.p.hp).toBe(1000);
    tick(c, .3); expect(c.p.hp).toBe(1000); expect(contactAttackPhase(e)?.phase).toBe('strike');
    tick(c, .1); expect(c.p.hp).toBeCloseTo(997.5);
    tick(c, .1); expect(c.p.hp).toBeCloseTo(995); expect(contactAttackPhase(e)?.phase).toBe('recovery');
    tick(c, .5); expect(c.p.hp).toBeCloseTo(995); expect(contactAttackPhase(e)).toEqual({ phase: 'windup', progress: 0 });
  });

  it('integrates exact partial windows and several cycles in one update', () => {
    const c = context(); const e = enemy(c);
    tick(c, .35); expect(c.p.hp).toBeCloseTo(998.75);
    tick(c, .9); expect(c.p.hp).toBeCloseTo(995);
    tick(c, 2.25); expect(c.p.hp).toBeCloseTo(980);
    expect(e.contactClock).toBeCloseTo(.5);
    expect(e.t).toBe(7);
  });

  it('damage and final clock are partition invariant across boundaries and multiple cycles', () => {
    const partitions = [[4.87], [0.3, 0.2, 0.5, 1.31, 2.56], Array(487).fill(.01), Array(292).fill(1 / 60).concat(4.87 - 292 / 60)];
    for (const parts of partitions) {
      const c = context(); const e = enemy(c);
      for (const dt of parts) tick(c, dt);
      expect(c.p.hp).toBeCloseTo(975, 8);
      expect(e.contactClock).toBeCloseTo(.87, 8);
      expect(c.rng.state).toBe(17);
    }
  });

  it('keeps complete uninterrupted cycles at the old DPS budget including elites and incoming damage multiplier', () => {
    const c = context(); c.p.stats.dmgTakenPct = .5;
    enemy(c); enemy(c, { elite: true, x: 200 });
    tick(c, 3);
    expect(c.p.hp).toBeCloseTo(1000 - 3 * (5 + 7.5) * 1.5);
    expect(c.w.contactAcc).toBe(0);
    expect(c.w.events.filter(e => e.t === 'playerHit').reduce((sum, e) => sum + (e.t === 'playerHit' ? e.dmg : 0), 0)).toBeCloseTo(3 * 12.5 * 1.5);
  });

  it('stacks independent enemy phases without an attacker cap or horizontal dodge', () => {
    const c = context(); c.p.x = -200;
    const a = enemy(c, { x: 200, contactClock: .2 }); const b = enemy(c, { x: -100, contactClock: .4 });
    tick(c, .2);
    expect(c.p.hp).toBeCloseTo(995);
    expect(a.contactClock).toBeCloseTo(.4); expect(b.contactClock).toBeCloseTo(.6);
    expect(contactAttackPhase(a)?.phase).toBe('strike'); expect(contactAttackPhase(b)?.phase).toBe('recovery');
  });

  it.each(['stun', 'freeze'] as const)('%s pauses the clock, including exact expiry inside a step', id => {
    const run = (parts: number[]) => {
      const c = context(); const e = enemy(c, { contactClock: .25, statuses: [cc(id, .4)] });
      for (const dt of parts) tick(c, dt);
      return { c, e };
    };
    const paused = run([.2]);
    expect(paused.e.contactClock).toBe(.25); expect(paused.c.p.hp).toBe(1000); expect(contactAttackPhase(paused.e)).toBeNull();
    for (const parts of [[.6], [.2, .2, .2], Array(60).fill(.01)]) {
      const { c, e } = run(parts);
      expect(e.contactClock).toBeCloseTo(.45, 8); expect(c.p.hp).toBeCloseTo(996.25, 8);
    }
  });

  it.each(['windup', 'strike', 'recovery'] as const)('knockback cancels %s, even during control, and return starts at zero', phase => {
    const c = context(); const clock = phase === 'windup' ? .2 : phase === 'strike' ? .4 : .7;
    const e = enemy(c, { contactClock: clock, knock: 100, statuses: [cc('freeze', 1)] });
    tick(c, .1);
    expect(e.y).toBeGreaterThan(30.5); expect(e.state).toBe('walk'); expect(e.contactClock).toBeUndefined();
    expect(contactAttackPhase(e)).toBeNull(); expect(c.p.hp).toBe(1000);
    e.statuses = []; e.knock = 0; e.y = 31;
    tick(c, .1); expect(e.state).toBe('attack'); expect(e.contactClock).toBe(0);
    tick(c, .3); expect(c.p.hp).toBe(1000);
    tick(c, .02); expect(c.p.hp).toBeCloseTo(999.5);
  });

  it('does not restart an in-reach clock for tiny displacements, and kills cannot strike', () => {
    const c = context(); const e = enemy(c, { contactClock: .3, y: 30.25 });
    tick(c, .1); expect(c.p.hp).toBeCloseTo(997.5);
    e.state = 'dead'; tick(c, .3); expect(c.p.hp).toBeCloseTo(997.5); expect(contactAttackPhase(e)).toBeNull();
  });

  it('does not reuse summoner/dash timers and keeps special archetypes outside the clock', () => {
    const c = context(); const e = enemy(c, { t: 2 });
    e.def = { ...e.def, kind: 'summoner', summon: { id: 'missing', every: 5, max: 1 } };
    tick(c, .4); expect(e.t).toBeCloseTo(1.6); expect(e.contactClock).toBeCloseTo(.4);
    e.def = { ...e.def, kind: 'runner', dash: { go: .5, rest: .5, boost: 2 } };
    tick(c, .1); expect(e.t).toBeCloseTo(1.6);
    for (const over of [{ boss: true }, { def: { ...e.def, kind: 'exploder' as const } }, { def: { ...e.def, kind: 'healer' as const } }, { def: { ...e.def, stealGold: 5 } }, { def: { ...e.def, kind: 'shooter' as const, ranged: { minY: 400, maxY: 600, aimTime: 1, cooldown: 2, dmg: 4, projSpeed: 100, projSprite: 'shots/test' } } }]) {
      expect(normalContactEnemy({ ...e, ...over })).toBe(false);
    }
    expect(normalContactEnemy({ ...e, def: { ...e.def, kind: 'shooter', ranged: undefined } })).toBe(true);
  });

  it('world pause does not advance attack timing and seeded replay reproduces all state/events', () => {
    const a = context().w; a.time = -100; const c: Ctx = { w: a, p: a.player, rng: makeRng(17), dt: 0, m: null };
    enemy(c); const b = structuredClone(a);
    const still = { targetX: null, moving: false };
    for (let n = 0; n < 180; n++) { step(a, 1 / 60, still); step(b, 1 / 60, still); }
    expect(a).toEqual(b);
    const clock = a.enemies[0].contactClock;
    a.phase = 'levelup'; step(a, .5, still); expect(a.enemies[0].contactClock).toBe(clock);
    expect(advanceContactAttack({ ...a.enemies[0], contactClock: .9 }, 2.6)).toBeCloseTo(.6);
  });
});
