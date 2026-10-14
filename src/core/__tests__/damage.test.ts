import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { UNIQUES } from '../../meta/uniques';
import { CONVERT_CAP, damageOf, PIERCE_FLOOR } from '../damage';
import { makeRng } from '../rng';
import { createRun } from '../sim';
import type { Ctx } from '../sim/ctx';
import { hitEnemy } from '../sim/hit';
import { ENEMY_HARD_CAP, spawnEnemy } from '../sim/spawn';
import { BASE_STATS, rollHit } from '../stats';
import type { PlayerStats } from '../types';

const M = { throwSpeedPct: 0, projSpeedPct: 0, critMultAdd: 0.2, dmgPct: 0.1, critChance: 0 };
const old = (b: number, s: PlayerStats, crit: boolean, taken: number) => b * (1 + s.dmgPct + M.dmgPct) * (crit ? s.critMult + M.critMultAdd : 1) * taken;

describe('damage pipeline', () => {
  it('default stats give exactly the old per-hit numbers', () => {
    for (const [b, dp, crit, taken] of [[10, 0, false, 1], [7.5, 0.34, true, 1], [23, 1.2, true, 1.15], [3, 0.06, false, 0.5]] as const) {
      const s = { ...BASE_STATS, dmgPct: dp };
      expect(damageOf(b, s, M, taken, crit)).toBe(old(b, s, crit, taken));
    }
    const a = makeRng(5), b = makeRng(5);
    expect(rollHit(10, BASE_STATS, M, 1, a).dmg).toBe(old(10, BASE_STATS, b.next() < 0.05, 1));
  });
  it('conversion is capped, more multiplies after increased, pierce falls off with a floor', () => {
    const s = { ...BASE_STATS, dotPct: 1 };
    expect(damageOf(100, { ...s, convertPct: 5 }, M, 1, false)).toBeCloseTo(damageOf(100, { ...s, convertPct: CONVERT_CAP }, M, 1, false));
    expect(damageOf(100, { ...s, convertPct: 0.5 }, M, 1, false)).toBeCloseTo(50 * 1.1 + 50 * 2.1);
    expect(damageOf(100, { ...BASE_STATS, moreDmg: 0.5 }, M, 1, false)).toBeCloseTo(100 * 1.1 * 1.5);
    expect(damageOf(100, BASE_STATS, M, 1, false, 1)).toBeCloseTo(110 * 0.85);
    expect(damageOf(100, BASE_STATS, M, 1, false, 99)).toBeCloseTo(110 * PIERCE_FLOOR);
  });
});

function setup(hooks: any[]) {
  const w = createRun({ seed: 3, content: CONTENT });
  w.loadout = { hooks };
  const c = { w, p: w.player, rng: makeRng(3), dt: 0.016, m: null } as Ctx;
  const def = CONTENT.enemies[Object.keys(CONTENT.enemies)[0]];
  const mk = (x: number, y: number) => { const e = spawnEnemy(c, def, x, { y }); e.hp = 1000; return e; };
  return { w, c, mk };
}

describe('hard enemy cap', () => {
  it('never holds more than the cap of live non-boss enemies', () => {
    const { w, mk } = setup([]);
    for (let i = 0; i < ENEMY_HARD_CAP + 15; i++) mk(0, 300);
    expect(w.enemies.length).toBe(ENEMY_HARD_CAP);
  });
});

describe('unique hooks in a hit', () => {
  it('crit splash (towel): neighbours inside the radius take a share of the crit, others none', () => {
    const { c, mk } = setup(UNIQUES['ah-seng-golden-tawa-towel'].hooks as any[]);
    const t = mk(0, 300), near = mk(60, 300), far = mk(400, 300);
    hitEnemy(c, t, 10, null, false, true);
    expect(near.hp).toBeLessThan(1000);
    expect(far.hp).toBe(1000);
    expect(1000 - near.hp).toBeCloseTo((1000 - t.hp) * 0.5);
  });
  it('clogs: wider, softer splash reaches 140u at 30%', () => {
    const { c, mk } = setup(UNIQUES['uncle-kopi-clogs'].hooks as any[]);
    const t = mk(0, 300), mid = mk(120, 300);
    hitEnemy(c, t, 10, null, false, true);
    expect(1000 - mid.hp).toBeCloseTo((1000 - t.hp) * 0.3);
  });
  it('first-hit freeze: only the first hit on a foe freezes it; no hooks, no freeze', () => {
    const { c, mk } = setup(UNIQUES['auntie-steel-thali'].hooks as any[]);
    const e = mk(0, 300);
    hitEnemy(c, e, 1, null, false);
    expect(e.statuses.some(s => s.id === 'freeze')).toBe(true);
    e.statuses = [];
    hitEnemy(c, e, 1, null, false);
    expect(e.statuses.some(s => s.id === 'freeze')).toBe(false);
    const none = setup([]);
    const f = none.mk(0, 300);
    hitEnemy(none.c, f, 1, null, false);
    expect(f.statuses.length).toBe(0);
  });
});
