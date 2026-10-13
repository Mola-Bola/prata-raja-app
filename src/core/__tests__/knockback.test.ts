import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { remainingKnockback } from '../knockback';
import { makeRng } from '../rng';
import { createRun } from '../sim';
import { applyHitEffect } from '../status';
import { MAX_ENEMY_Y, type Ctx } from '../sim/ctx';
import { updateEnemies } from '../sim/enemies';
import type { Enemy, EnemyDef } from '../types';

function consume(distance: number, dt: number, added = 0) {
  let pending = distance;
  let moved = 0;
  const moves: number[] = [];
  for (let frame = 0; pending > 0 && frame < 1000; frame++) {
    if (frame === 1) pending += added;
    const next = remainingKnockback(pending, dt);
    const move = pending - next;
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(pending);
    moves.push(move);
    moved += move;
    pending = next;
  }
  expect(pending).toBe(0);
  return { moved, moves };
}

function fixture(dt: number, overrides: Partial<Enemy> = {}) {
  const w = createRun({ seed: 1, content: CONTENT });
  const def: EnemyDef = { id: 'test', name: 'test', kind: 'walker', sprite: 'enemies/test', hp: 100, speed: 0, contactDps: 0, xp: 0, radius: 10 };
  const e: Enemy = { uid: 1, def, boss: false, elite: false, x: 0, y: 400, hp: 100, maxHp: 100, shield: 0,
    statuses: [], state: 'walk', t: 0, age: 0, knock: 0, flash: 0, cooldowns: {}, phase: 0, holdY: 0, ...overrides };
  w.enemies = [e];
  const c: Ctx = { w, p: w.player, dt, rng: makeRng(1), m: null };
  return { c, e };
}

describe('distance-based decelerating knockback', () => {
  for (const dt of [1 / 30, 1 / 60]) {
    for (const distance of [4, 12, 40, 120, 300]) {
      it(`consumes ${distance} exactly and eases to rest at dt=${dt}`, () => {
        const { moved, moves } = consume(distance, dt);
        expect(moved).toBeCloseTo(distance, 10);
        for (let i = 1; i < moves.length; i++) expect(moves[i]).toBeLessThanOrEqual(moves[i - 1] + 1e-10);
        expect(moves.at(-1)).toBeLessThan(moves[0]);
        if (moves.length > 2) expect(moves.at(-2)).toBeLessThan(moves[0]);
      });
    }
    it(`adds an impulse during the taper without losing distance at dt=${dt}`, () => {
      const { moved, moves } = consume(40, dt, 120);
      expect(moved).toBeCloseTo(160, 10);
      expect(moves[1]).toBeGreaterThan(moves[0]);
      expect(moves.at(-1)).toBeLessThan(moves[1]);
    });
    it(`moves the enemy by the entire pending distance at dt=${dt}`, () => {
      const { c, e } = fixture(dt, { knock: 120 });
      for (let frame = 0; e.knock > 0 && frame < 100; frame++) updateEnemies(c);
      expect(e.knock).toBe(0);
      expect(e.y).toBeCloseTo(520, 10);
    });
  }

  it('agrees at equal elapsed time across frame subdivisions, including cruise/taper crossover', () => {
    for (const pending of [4, 12, 40, 120, 300]) {
      const whole = remainingKnockback(pending, 1 / 30);
      const halves = remainingKnockback(remainingKnockback(pending, 1 / 60), 1 / 60);
      expect(halves).toBeCloseTo(whole, 10);
      let fine = pending;
      for (let i = 0; i < 15; i++) fine = remainingKnockback(fine, 1 / 60);
      expect(fine).toBeCloseTo(remainingKnockback(pending, 0.25), 10);
    }
  });

  it('handles zero/invalid dt and a finite step beyond the stop without overshoot', () => {
    for (const dt of [0, -1, NaN, Infinity]) expect(remainingKnockback(120, dt)).toBe(120);
    expect(remainingKnockback(0, 1 / 60)).toBe(0);
    expect(remainingKnockback(120, 10)).toBe(0);
  });

  it('keeps resistance and boss impulse multipliers at the existing application boundary', () => {
    for (const boss of [false, true]) {
      const { e } = fixture(1 / 60, { boss });
      e.def = { ...e.def, knockbackTaken: 0.25 };
      applyHitEffect({ type: 'tender', knockback: 120, dmgTakenPct: 0, time: 1 }, e);
      const expected = 120 * 0.25 * (boss ? 0.1 : 1);
      expect(e.knock).toBe(expected);
      expect(consume(e.knock, 1 / 60).moved).toBeCloseTo(expected, 10);
    }
  });

  it('keeps the arena clamp while consuming pending distance at the boundary', () => {
    const { c, e } = fixture(1 / 60, { y: MAX_ENEMY_Y - 5, knock: 120 });
    for (let frame = 0; e.knock > 0 && frame < 100; frame++) {
      updateEnemies(c);
      expect(e.y).toBeLessThanOrEqual(MAX_ENEMY_Y);
    }
    expect(e.knock).toBe(0);
    expect(e.y).toBe(MAX_ENEMY_Y);
  });

  it('a stunned walker receives the shove displacement without any walking contribution', () => {
    const { c, e } = fixture(1 / 60, { knock: 120,
      statuses: [{ id: 'stun', time: 1, stacks: 0, dps: 0, amount: 0 }] });
    e.def = { ...e.def, speed: 60 };
    let moved = 0;
    for (let frame = 0; e.knock > 0 && frame < 100; frame++) {
      const next = remainingKnockback(e.knock, c.dt);
      moved += e.knock - next;
      updateEnemies(c);
      expect(e.statuses.some(s => s.id === 'stun')).toBe(true);
      expect(e.y).toBeCloseTo(400 + moved, 10);
    }
    expect(e.knock).toBe(0);
    expect(e.y).toBeCloseTo(520, 10);
  });
});
