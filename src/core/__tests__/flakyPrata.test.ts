import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { createKitchenRun, type KitchenConfig } from '../kitchen';
import { makeRng } from '../rng';
import { createRun, step } from '../sim';
import type { Ctx } from '../sim/ctx';
import { spawnEnemy } from '../sim/spawn';
import { updatePlayerShots } from '../sim/shots';
import type { BreadStats, DipId, Projectile } from '../types';

const config = (flakyKosong?: boolean): KitchenConfig => ({ seed: 123, chapterId: CONTENT.chapters[0].id,
  wave: 1, breads: [{ id: 'kosong', level: 5 }], dips: [], flakyKosong });
function fixture(enabled = true, dips: DipId[] = [], hops = 0): Ctx {
  const w = createKitchenRun({ ...config(enabled), tuning: { crit: 0 }, dips: dips.map(id => ({ id, level: 5,
    ...(id !== 'teh-tarik' ? { linkedBread: 'kosong' as const } : {}) })) }, CONTENT);
  w.enemies = []; w.events = []; w.projectiles = [];
  const st: BreadStats = { ...CONTENT.breads.kosong.levels[4], dmg: 100, radius: 4, knockback: 0,
    homing: 0, hops, hopRange: 200, hopFalloff: 0.2 };
  const shot: Projectile = { uid: w.nextUid++, owner: 'player', breadId: 'kosong', sprite: CONTENT.breads.kosong.sprite,
    motion: 'straight', x: 0, y: 0, vx: 0, vy: 600, z: 0, t: 0, ttl: 2, dmg: st.dmg, radius: 4,
    pierceLeft: 0, hopsLeft: hops, hit: [], returning: false, targetUid: null, tx: 0, ty: 0, stats: st, spin: 0 };
  w.projectiles.push(shot);
  return { w, p: w.player, rng: makeRng(123), dt: 0, m: null };
}
function enemy(c: Ctx, x: number, y: number, shield = 0) {
  spawnEnemy(c, { ...Object.values(CONTENT.enemies)[0], radius: 4, hp: 10000, speed: 0, shield }, x, { y });
  return c.w.enemies.at(-1)!;
}
function fly(c: Ctx, total: number, dt = total) {
  for (let t = 0; t < total - 1e-9; t += dt) {
    c.dt = Math.min(dt, total - t); c.w.time += c.dt; updatePlayerShots(c);
  }
}
function fanTargets(c: Ctx) {
  enemy(c, 0, 100);
  enemy(c, -Math.sin(0.35) * 70, 100 + Math.cos(0.35) * 70);
  enemy(c, Math.sin(0.35) * 70, 100 + Math.cos(0.35) * 70);
}
function measure(enabled: boolean, dip?: DipId) {
  const c = fixture(enabled, dip ? [dip] : []); fanTargets(c); fly(c, 0.4, 0.01);
  const hits = c.w.events.filter(e => e.t === 'hit');
  const fx = dip ? CONTENT.dips[dip].levels[4] : null;
  return { directDamage: hits.reduce((n, e) => n + e.dmg, 0), successfulHits: hits.length,
    dipApplications: dip ? hits.length : 0, newStatusEvents: c.w.events.filter(e => e.t === 'status').length,
    tehActivations: fx?.type === 'haste' ? Math.floor(hits.length / fx.everyHits) : 0,
    tehHitCount: c.p.buffs.find(b => b.id === 'haste')?.hitCount ?? 0,
    peakProjectiles: c.w.projectiles.length, // This fixture retains expired objects; one throw, no sweep.
  };
}

describe('Flaky Kosong Kitchen experiment', () => {
  it('omitted/false settings are exactly the previous Kitchen outcome; ordinary runs have no experiment state', () => {
    const a = createKitchenRun(config(), CONTENT), b = createKitchenRun(config(false), CONTENT);
    expect(a).toEqual(b); expect(a).not.toHaveProperty('flakyKosong');
    const ordinary = createRun({ seed: 123, content: CONTENT });
    expect(ordinary).not.toHaveProperty('flakyKosong');
    for (let i = 0; i < 500; i++) { step(a, 0.05, { targetX: null, moving: false }); step(b, 0.05, { targetX: null, moving: false }); }
    expect(a).toEqual(b); expect(a.projectiles.some(s => s.flake || s.flakesShed)).toBe(false);
    const baseline = fixture(false); fanTargets(baseline); fly(baseline, 0.4);
    expect(baseline.w.events.filter(e => e.t === 'hit').map(e => e.dmg)).toEqual([100]);
    expect(baseline.w.projectiles).toHaveLength(1);
  });

  it('emits two forward pieces at 10% base impact damage, excludes the parent victim, and cannot recurse or hop', () => {
    const c = fixture(); fanTargets(c); fly(c, 0.4);
    const parent = c.w.projectiles[0], flakes = c.w.projectiles.slice(1);
    expect(flakes).toHaveLength(2); expect(parent.flakesShed).toBe(2);
    expect(flakes.every(s => s.flake && s.breadId === 'kosong' && s.stats?.fragments === 0 && s.hopsLeft === 0 && s.pierceLeft === 0)).toBe(true);
    expect(flakes.map(s => s.dmg)).toEqual([10, 10]);
    expect(c.w.events.filter(e => e.t === 'hit').map(e => e.dmg)).toEqual([100, 10, 10]);
    expect(c.w.events.filter(e => e.t === 'hit' && e.uid === c.w.enemies[0].uid)).toHaveLength(1);
    expect(flakes.every(s => s.vy > 0)).toBe(true);
  });

  it('clips pieces to 120 world units even on a coarse step', () => {
    const c = fixture(); enemy(c, 0, 100); fly(c, 1);
    for (const s of c.w.projectiles.slice(1)) {
      expect(Math.hypot(s.x, s.y - 100)).toBeCloseTo(120, 9);
      expect(s.t).toBeCloseTo(0.2, 9); expect(s.ttl).toBe(-1);
    }
  });

  it('blocked impacts shed nothing; pieces also respect shields', () => {
    const c = fixture(); const blocked = enemy(c, 0, 100, 1000); fly(c, 0.4);
    expect(blocked.hp).toBe(10000); expect(c.w.projectiles).toHaveLength(1);
    const d = fixture(); fanTargets(d); d.w.enemies[1].shield = 1000; fly(d, 0.4);
    expect(d.w.enemies[1].hp).toBe(10000); expect(d.w.enemies[1].shield).toBe(990);
    expect(d.w.projectiles).toHaveLength(3);
  });

  it('keeps ricochets and caps pieces at six even with artificially increased hops', () => {
    const c = fixture(true, [], 8);
    for (let y = 100; y <= 700; y += 100) enemy(c, 0, y);
    fly(c, 1.5);
    expect(c.w.projectiles[0].hit).toHaveLength(7);
    expect(c.w.projectiles[0].flakesShed).toBe(6);
    expect(c.w.projectiles.filter(s => s.flake)).toHaveLength(6);
    expect(c.w.projectiles.filter(s => s.flake).map(s => s.dmg)).toEqual([10, 10, 8, 8, 6.4, 6.4]);
  });

  it('has equal contacts, damage, child travel and RNG for fine/coarse stepping', () => {
    const a = fixture(), b = fixture(); fanTargets(a); fanTargets(b); fly(a, 0.4); fly(b, 0.4, 0.01);
    expect(a.w.events).toEqual(b.w.events); expect(a.rng.state).toBe(b.rng.state);
    expect(a.w.enemies.map(e => e.hp)).toEqual(b.w.enemies.map(e => e.hp));
    for (let i = 0; i < a.w.projectiles.length; i++) {
      const x = a.w.projectiles[i], y = b.w.projectiles[i];
      expect(x.hit).toEqual(y.hit); expect(x.ttl).toBe(y.ttl);
      expect(x.x).toBeCloseTo(y.x, 9); expect(x.y).toBeCloseTo(y.y, 9); expect(x.t).toBeCloseTo(y.t, 9);
    }
    const c = fixture(true, [], 2), d = fixture(true, [], 2);
    for (const ctx of [c, d]) for (const y of [100, 280, 460]) enemy(ctx, 0, y);
    fly(c, 1); fly(d, 1, 0.01);
    expect(c.w.events).toEqual(d.w.events); expect(c.rng.state).toBe(d.rng.state);
    expect(c.w.projectiles[0].hit).toEqual(d.w.projectiles[0].hit);
    expect(c.w.projectiles.map(s => s.hit)).toEqual(d.w.projectiles.map(s => s.hit));
    const off = fixture(false, [], 2);
    for (const y of [100, 280, 460]) enemy(off, 0, y);
    fly(off, 1);
    expect(c.w.events).toEqual(off.w.events);
    expect(c.w.events.filter(e => e.t === 'hit').map(e => e.dmg)).toEqual([100, 80, 64]);
    expect(c.w.projectiles.filter(s => s.flake)).toHaveLength(6);
  });

  it.each<DipId>(['fish-curry', 'condensed-milk', 'mint-chutney', 'teh-tarik'])('retains %s proc identity and measures extra applications', dip => {
    const off = measure(false, dip), on = measure(true, dip);
    expect(off.successfulHits).toBe(1); expect(on.successfulHits).toBe(3);
    expect(on.directDamage).toBe(120); expect(on.dipApplications).toBe(3);
    expect(on.peakProjectiles).toBe(3);
    if (dip !== 'teh-tarik') expect(on.newStatusEvents).toBeGreaterThan(off.newStatusEvents);
    const wrong = fixture(true, [dip]); fanTargets(wrong);
    if (dip !== 'teh-tarik') wrong.p.dips[0].linkedBread = 'tissue';
    fly(wrong, 0.4);
    if (dip !== 'teh-tarik') expect(wrong.w.events.filter(e => e.t === 'status')).toEqual([]);
  });

  it('accelerates Teh activation as well as its hit counter', () => {
    const off = fixture(false, ['teh-tarik']), on = fixture(true, ['teh-tarik']);
    for (const c of [off, on]) {
      fanTargets(c); fly(c, 0.4, 0.01);
      const original = c.w.projectiles[0];
      c.w.projectiles.push({ ...original, uid: c.w.nextUid++, x: 0, y: 0, t: 0, ttl: 2, hit: [], flakesShed: undefined });
      fly(c, 0.4, 0.01);
    }
    expect(off.p.buffs.find(b => b.id === 'haste')).toMatchObject({ hitCount: 2, time: 0 });
    expect(on.p.buffs.find(b => b.id === 'haste')).toMatchObject({ hitCount: 1, time: 3 });
    expect(on.w.events.filter(e => e.t === 'hit')).toHaveLength(6);
  });

  it('prints a reproducible paired impact comparison when FLAKY_COMPARE=1', () => {
    const rows = [undefined, 'fish-curry', 'condensed-milk', 'mint-chutney', 'teh-tarik'].map(dip => ({
      dip: dip ?? 'none', baseline: measure(false, dip as DipId | undefined), experiment: measure(true, dip as DipId | undefined),
    }));
    expect(rows).toHaveLength(5);
    if (process.env.FLAKY_COMPARE === '1') console.log(JSON.stringify(rows, null, 2));
  });
});
