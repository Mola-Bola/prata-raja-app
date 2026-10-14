import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyCard } from '../cards';
import { makeRng } from '../rng';
import { rotiCrisp, soakFor } from '../soak';
import { BASE_STATS, rollHit } from '../stats';
import { createRun } from '../sim';
import { hitEnemy } from '../sim/hit';
import { spawnEnemy } from '../sim/spawn';
import type { Ctx } from '../sim/ctx';

describe('crisp & soak', () => {
  it('rollHit draw order unchanged: one draw with canCrit, none without', () => {
    const mods = { throwSpeedPct: 0, projSpeedPct: 0, critMultAdd: 0, dmgPct: 0, critChance: 0 };
    const a = makeRng(7), b = makeRng(7);
    rollHit(10, BASE_STATS, mods, 1, a, true);
    rollHit(10, BASE_STATS, mods, 1, a, false);
    b.next();
    expect(a.next()).toBe(b.next());
  });
  it('cards apply the new stats', () => {
    const p = createRun({ seed: 1, content: CONTENT }).player;
    applyCard(p, { kind: 'passive', id: 'curry-soak', level: 1 }, CONTENT);
    applyCard(p, { kind: 'passive', id: 'crisp-edges', level: 1 }, CONTENT);
    applyCard(p, { kind: 'passive', id: 'twice-fried', level: 1 }, CONTENT);
    applyCard(p, { kind: 'passive', id: 'crackling-curry', level: 1 }, CONTENT);
    expect(p.stats.soak).toBeCloseTo(0.13);
    expect(p.stats.critChance).toBeCloseTo(0.08);
    expect(p.stats.splashCrit).toBe(1);
    expect(p.stats.critSplash).toBeCloseTo(0.2);
  });
  it('roti tags give base crisp and soak', () => {
    expect(rotiCrisp(CONTENT, 'kosong')).toBe(0.05);
    expect(rotiCrisp(CONTENT, 'murtabak')).toBe(0);
    expect(soakFor(CONTENT, BASE_STATS, [], 'murtabak')).toBeCloseTo(0.15);
    expect(soakFor(CONTENT, BASE_STATS, [{ id: 'fish-curry', level: 1 }], 'kosong')).toBeCloseTo(0.04);
  });
  it('splash hits only enemies inside the radius', () => {
    const w = createRun({ seed: 3, content: CONTENT });
    const c = { w, p: w.player, rng: makeRng(3), dt: 0.016, m: null } as Ctx;
    const def = CONTENT.enemies[Object.keys(CONTENT.enemies)[0]];
    const mk = (x: number, y: number) => { const e = spawnEnemy(c, def, x, { y }); e.hp = 1000; return e; };
    const target = mk(0, 300), near = mk(40, 300), far = mk(600, 300);
    w.player.stats = { ...w.player.stats, soak: 0.5 };
    hitEnemy(c, target, 10, null, false);
    expect(near.hp).toBeLessThan(1000);
    expect(far.hp).toBe(1000);
  });
});
