import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyCard, drawOffer } from '../cards';
import { makeRng } from '../rng';
import { createRun } from '../sim';
import { hitEnemy } from '../sim/hit';
import { spawnEnemy } from '../sim/spawn';
import { updateThrowing } from '../sim/throw';
import { updatePlayerShots } from '../sim/shots';
import type { Ctx } from '../sim/ctx';

const loadout = { startBread: 'murtabak', signatureBread: 'murtabak' } as const;
function context(): Ctx {
  const w = createRun({ seed: 3, content: CONTENT, loadout });
  return { w, p: w.player, rng: makeRng(3), dt: 0.1, m: null };
}
function enemy(c: Ctx, x = 0, y = 200) {
  spawnEnemy(c, { ...CONTENT.enemies[Object.keys(CONTENT.enemies)[0]], hp: 1000, speed: 0 }, x, { y });
  return c.w.enemies.at(-1)!;
}

describe('signature rules', () => {
  it('starts at level one and weights synergies deterministically without removing surprises', () => {
    const { p } = context();
    expect(p.breads.map(b => [b.id, b.level])).toEqual([['murtabak', 1]]);
    let biased = 0, plain = 0, surprises = 0;
    const synergy = new Set(['murtabak', 'fish-curry', 'mutton-curry', 'big-dough', 'strong-wrists']);
    for (let seed = 1; seed <= 500; seed++) {
      const opts = { signatureBread: loadout.signatureBread };
      const offer = drawOffer(p, CONTENT, makeRng(seed), opts);
      expect(offer).toEqual(drawOffer(p, CONTENT, makeRng(seed), opts));
      biased += offer.filter(c => synergy.has(c.id)).length;
      plain += drawOffer(p, CONTENT, makeRng(seed)).filter(c => synergy.has(c.id)).length;
      surprises += offer.filter(c => !synergy.has(c.id)).length;
      expect(new Set(offer.map(c => `${c.kind}:${c.id}`)).size).toBe(3);
    }
    expect(biased).toBeGreaterThan(plain * 1.1);
    expect(surprises).toBeGreaterThan(300);
  });

  it('auto-links only Fish Curry, preserves upgrades and excludes other breads from the stronger burn', () => {
    const c = context();
    applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 1 }, CONTENT, loadout);
    applyCard(c.p, { kind: 'dip', id: 'masala', level: 1 }, CONTENT, loadout);
    applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 2 }, CONTENT, loadout);
    expect(c.p.dips.filter(d => d.linkedBread)).toEqual([{ id: 'fish-curry', level: 2, linkedBread: 'murtabak' }]);
    const wrong = enemy(c);
    hitEnemy(c, wrong, 1, null, false, false, 'kosong');
    expect(wrong.statuses.some(s => s.id === 'burn')).toBe(false);
    const right = enemy(c);
    hitEnemy(c, right, 1, null, false, false, 'murtabak');
    const base = CONTENT.dips['fish-curry'].levels[1];
    if (base.type !== 'burn') throw new Error('Fish Curry must burn');
    expect(right.statuses.find(s => s.id === 'burn')).toMatchObject({ dps: base.dps * 1.25, time: base.time * 1.25 });
    const offered = drawOffer(c.p, CONTENT, makeRng(8), { n: 100, signatureBread: 'murtabak' });
    expect(offered.find(card => card.id === 'fish-curry')?.linkedBread).toBe('murtabak');
  });

  it('old loadouts keep global Fish Curry; evolution retains its link', () => {
    const c = context();
    applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 1 }, CONTENT);
    const e = enemy(c);
    hitEnemy(c, e, 1, null, false, false, 'kosong');
    expect(e.statuses.some(s => s.id === 'burn')).toBe(true);
    c.p.dips[0].linkedBread = 'murtabak';
    c.p.breads[0].level = 5;
    c.p.dips.push({ id: 'chicken-curry', level: 5 });
    applyCard(c.p, { kind: 'evolve', id: 'crusher-murtabak', level: 1 }, CONTENT, loadout);
    expect(c.p.dips[0].linkedBread).toBe('crusher-murtabak');
  });

  it('loads every fourth successful serving, one payload with extra dough, and children never split again', () => {
    const c = context();
    enemy(c);
    c.p.stats.extraProjectiles = 2;
    for (let cast = 1; cast <= 4; cast++) {
      c.p.breads[0].cd = 0;
      c.w.projectiles = [];
      updateThrowing(c);
      expect(c.w.projectiles.filter(s => s.loaded)).toHaveLength(cast === 4 ? 1 : 0);
    }
    const loaded = c.w.projectiles.find(s => s.loaded)!;
    expect(loaded.dmg).toBe(CONTENT.breads.murtabak.levels[0].dmg * 8);
    c.w.projectiles = [loaded];
    c.dt = 0.4;
    updatePlayerShots(c);
    const filling = c.w.projectiles.filter(s => s.uid !== loaded.uid);
    expect(filling).toHaveLength(6);
    expect(filling.every(s => s.sprite === 'breads/egg-telur' && s.stats?.fragments === 0 && !s.loaded && s.breadId === 'murtabak')).toBe(true);
    expect(c.w.events.some(e => e.t === 'blast')).toBe(true);
    c.w.enemies = [];
    c.p.breads[0].cd = 0;
    updateThrowing(c);
    expect(c.p.breads[0].casts).toBe(4);
  });
});
