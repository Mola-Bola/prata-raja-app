import { describe, expect, it } from 'vitest';

import { CONTENT } from '../../content';
import { makeRng } from '../rng';
import { createRun, drainEvents, step } from '../sim';
import { approachSpeed, type Ctx } from '../sim/ctx';
import { updateEnemies } from '../sim/enemies';
import { killEnemy } from '../sim/hit';
import { spawnEnemy } from '../sim/spawn';
import { FIELD } from '../types';
import { spawnTick, startWave } from '../waves';

function context(): Ctx {
  const w = createRun({ seed: 7, content: CONTENT });
  startWave(w, 3);
  return { w, p: w.player, rng: makeRng(7), dt: 1 / 60, m: null };
}

describe('Mynah thief', () => {
  it('steals once at the counter, never bites, and escapes without kill rewards', () => {
    const c = context();
    c.w.gold = 10;
    const e = spawnEnemy(c, CONTENT.enemies['mynah-thief'], 0, { y: FIELD.reachY + 1 });
    const hp = c.p.hp;
    updateEnemies(c);
    expect(e.state).toBe('escape');
    expect(c.w.gold).toBe(7);
    expect(drainEvents(c.w).filter(ev => ev.t === 'theft')).toHaveLength(1);
    expect(approachSpeed(e)).toBeLessThan(0);
    for (let i = 0; i < 600; i++) updateEnemies(c);
    expect(e.state).toBe('dead');
    expect(c.p.hp).toBe(hp);
    expect(c.w).toMatchObject({ gold: 7, kills: 0 });
    expect(c.p.xp).toBe(0);
    expect(drainEvents(c.w).some(ev => ev.t === 'playerHit' || ev.t === 'kill' || ev.t === 'theft')).toBe(false);
  });

  it('refunds stolen coins exactly once if killed before it escapes', () => {
    const c = context();
    c.w.gold = 1;
    const e = spawnEnemy(c, CONTENT.enemies['mynah-thief'], 0, { y: FIELD.reachY });
    updateEnemies(c);
    expect(c.w.gold).toBe(0); // cannot take more than the jar holds
    killEnemy(c, e);
    const gold = c.w.gold;
    expect(gold).toBeGreaterThanOrEqual(1);
    expect(c.w.kills).toBe(1);
    killEnemy(c, e);
    expect(c.w.gold).toBe(gold);
    expect(c.w.kills).toBe(1);
  });

  it('killing on approach prevents theft; an empty jar never goes negative', () => {
    const c = context();
    const e = spawnEnemy(c, CONTENT.enemies['mynah-thief'], 0);
    killEnemy(c, e);
    updateEnemies(c);
    expect(drainEvents(c.w).some(ev => ev.t === 'theft')).toBe(false);
    c.w.gold = 0;
    spawnEnemy(c, CONTENT.enemies['mynah-thief'], 0, { y: FIELD.reachY });
    updateEnemies(c);
    expect(c.w.gold).toBe(0);
  });

  it('a real projectile kills a fleeing thief, and a frozen thief waits before stealing', () => {
    const c = context();
    c.w.phase = 'wave';
    c.w.budgetLeft = 0;
    const e = spawnEnemy(c, CONTENT.enemies['mynah-thief'], 0, { y: FIELD.reachY });
    e.statuses.push({ id: 'freeze', time: 1, stacks: 1, dps: 0, amount: 0 });
    c.w.gold = 10;
    updateEnemies(c);
    expect(e.state).toBe('walk');
    expect(c.w.gold).toBe(10);
    e.statuses = [];
    updateEnemies(c);
    e.hp = 1;
    for (let i = 0; i < 90 && c.w.kills === 0; i++) step(c.w, 1 / 60, { targetX: null, moving: false });
    expect(c.w.kills).toBe(1);
    expect(c.w.gold).toBeGreaterThanOrEqual(10);
  });
});

describe('Drain rat', () => {
  it('spends a swarm budget on three quick, low-HP rats at a mid-street drain', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = context();
      c.w.chapter = { ...c.w.chapter, waves: [{ budget: 3, duration: 22, eliteChance: 1, mix: { 'drain-rat': 1 } }] };
      startWave(c.w, 1);
      const reqs = spawnTick(c.w, 0.1, makeRng(seed));
      expect(reqs).toHaveLength(3);
      expect(c.w.budgetLeft).toBe(0);
      expect(Math.max(...reqs.map(r => r.x)) - Math.min(...reqs.map(r => r.x))).toBeLessThanOrEqual(50);
      for (const req of reqs) {
        expect(req.elite).toBe(false);
        expect(Math.abs(req.x)).toBeLessThanOrEqual(135);
        const e = spawnEnemy(c, CONTENT.enemies[req.enemyId], req.x);
        expect(e.y).toBeGreaterThanOrEqual(520);
        expect(e.y).toBeLessThanOrEqual(560);
        expect(e.hp).toBe(6);
        expect(e.def.speed).toBeGreaterThan(CONTENT.enemies.roach.speed * 0.8);
      }
    }
  });

  it('both new pests appear only in chapter 1 after the introductory waves', () => {
    for (const id of ['mynah-thief', 'drain-rat']) {
      expect(CONTENT.chapters[0].waves.slice(0, 2).every(w => !w.mix[id])).toBe(true);
      expect(CONTENT.chapters[0].waves.some(w => w.mix[id] > 0)).toBe(true);
      expect(CONTENT.chapters[1].waves.every(w => !w.mix[id])).toBe(true);
    }
  });
});
