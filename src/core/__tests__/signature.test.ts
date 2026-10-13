import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyCard, drawOffer } from '../cards';
import { makeRng } from '../rng';
import { createRun } from '../sim';
import { isDisabled, speedMul } from '../status';
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

  it.each([false, true])('links both bread ids after evolution when Fish Curry is picked after evolution: %s', (pickAfter) => {
    const c = context();
    if (!pickAfter) applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 1 }, CONTENT, loadout);
    c.p.breads[0].level = 5;
    c.p.dips.push({ id: 'chicken-curry', level: 5 });
    applyCard(c.p, { kind: 'evolve', id: 'crusher-murtabak', level: 1 }, CONTENT, loadout);
    if (pickAfter) applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 1 }, CONTENT, loadout);
    const base = CONTENT.dips['fish-curry'].levels[0];
    if (base.type !== 'burn') throw new Error('Fish Curry must burn');
    for (const id of ['murtabak', 'crusher-murtabak', 'kosong', undefined] as const) {
      const target = enemy(c);
      hitEnemy(c, target, 1, null, false, false, id);
      const burn = target.statuses.find(s => s.id === 'burn');
      if (id === 'murtabak' || id === 'crusher-murtabak') {
        expect(burn).toMatchObject({ dps: base.dps * 1.25, time: base.time * 1.25 });
      } else expect(burn).toBeUndefined();
    }
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

it.each(['roti-bomb', 'appam'] as const)('%s charges one fourth serving and never charges failed throws', id => {
  const w = createRun({ seed: 3, content: CONTENT, loadout: { startBread: id, signatureBread: id } });
  const c: Ctx = { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
  enemy(c);
  c.p.stats.extraProjectiles = 2;
  for (let cast = 1; cast <= 4; cast++) {
    c.p.breads[0].cd = 0;
    w.projectiles = [];
    updateThrowing(c);
    expect(w.projectiles.filter(s => s.charged)).toHaveLength(cast === 4 ? 1 : 0);
  }
  const shot = w.projectiles.find(s => s.charged)!;
  if (id === 'roti-bomb') {
    expect(shot.stats).toMatchObject({ zoneTime: 3, zoneDps: CONTENT.breads[id].levels[0].dmg * 2 });
    w.projectiles = [shot];
    c.dt = 1;
    updatePlayerShots(c);
    expect(w.zones).toHaveLength(1);
    expect(w.events.some(e => e.t === 'blast')).toBe(true);
  } else {
    expect(shot.hopsLeft).toBe(5);
    expect(shot.stats).toMatchObject({ hopRange: 400, hopFalloff: 0 });
    const second = enemy(c, 120, 200);
    w.projectiles = [shot];
    c.dt = .5;
    updatePlayerShots(c);
    expect(shot.hit).toContain(second.uid);
    expect(new Set(shot.hit).size).toBe(shot.hit.length);
  }
  w.enemies = [];
  c.p.breads[0].cd = 0;
  updateThrowing(c);
  expect(c.p.breads[0].casts).toBe(4);
});

it.each(['condensed-milk', 'mint-chutney'] as const)('%s links, upgrades and follows either base/evolved hits', id => {
  for (const after of [false, true]) {
    const c = context();
    if (!after) applyCard(c.p, { kind: 'dip', id, level: 1 }, CONTENT, loadout);
    c.p.breads[0].level = 5;
    c.p.dips.push({ id: 'chicken-curry', level: 5 });
    applyCard(c.p, { kind: 'evolve', id: 'crusher-murtabak', level: 1 }, CONTENT, loadout);
    if (after) applyCard(c.p, { kind: 'dip', id, level: 1 }, CONTENT, loadout);
    applyCard(c.p, { kind: 'dip', id, level: 2 }, CONTENT, loadout);
    expect(c.p.dips.find(d => d.id === id)).toEqual({ id, level: 2, linkedBread: 'crusher-murtabak' });
    for (const bread of ['murtabak', 'crusher-murtabak', 'kosong', undefined] as const) {
      const target = enemy(c);
      hitEnemy(c, target, 1, null, false, false, bread);
      const status = target.statuses.find(s => s.id === (id === 'condensed-milk' ? 'sugarSlow' : 'chill'));
      if (bread === 'murtabak' || bread === 'crusher-murtabak') expect(status?.time).toBe(id === 'condensed-milk' ? 2.5 : 7.5);
      else expect(status).toBeUndefined();
    }
  }
});

it('offers match the two-link limit and existing global upgrades stay global', () => {
  const c = context();
  const offer = () => drawOffer(c.p, CONTENT, makeRng(8), { n: 100, signatureBread: 'murtabak' });
  expect(offer().find(card => card.id === 'condensed-milk')?.linkedBread).toBe('murtabak');
  for (const id of ['fish-curry', 'condensed-milk', 'mint-chutney'] as const) applyCard(c.p, { kind: 'dip', id, level: 1 }, CONTENT, loadout);
  expect(c.p.dips.filter(d => d.linkedBread)).toHaveLength(2);
  expect(offer().find(card => card.id === 'mint-chutney')?.linkedBread).toBeUndefined();
  applyCard(c.p, { kind: 'dip', id: 'mint-chutney', level: 2 }, CONTENT, loadout);
  expect(c.p.dips.find(d => d.id === 'mint-chutney')?.linkedBread).toBeUndefined();
});

it('linked Sticky caps instant stacks and crashes into bounded CC; bosses are never stunned', () => {
  const c = context();
  applyCard(c.p, { kind: 'dip', id: 'condensed-milk', level: 1 }, CONTENT, loadout);
  for (const boss of [false, true]) {
    const target = enemy(c);
    target.boss = boss;
    for (let i = 0; i < 5; i++) {
      c.w.time += .21;
      hitEnemy(c, target, 1, null, false, false, 'murtabak');
      hitEnemy(c, target, 1, null, false, false, 'murtabak');
      if (i === 0) expect(target.statuses.find(s => s.id === 'sugar')?.stacks).toBe(1);
    }
    expect(target.statuses.some(s => s.id === 'sugar')).toBe(false);
    expect(isDisabled(target)).toBe(!boss);
    if (boss) expect(speedMul(target)).toBeGreaterThan(0);
    if (!boss) expect(target.statuses.find(s => s.id === 'stun')?.time).toBe(1.25);
  }
});

it('the heat signature survives evolution; ordinary bread throws have no signature bonus', () => {
  for (const signatureBread of ['roti-bomb', undefined] as const) {
    const w = createRun({ seed: 3, content: CONTENT, loadout: { startBread: 'roti-bomb', signatureBread } });
    const c: Ctx = { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
    enemy(c);
    c.p.breads[0].level = 5;
    c.p.dips.push({ id: 'sambal', level: 5 });
    applyCard(c.p, { kind: 'evolve', id: 'inferno-bomb', level: 1 }, CONTENT, w.loadout);
    for (let i = 0; i < 4; i++) {
      c.p.breads[0].cd = 0;
      w.projectiles = [];
      updateThrowing(c);
    }
    expect(w.projectiles[0].charged ?? false).toBe(!!signatureBread);
    if (!signatureBread) expect(w.projectiles[0].dmg).toBe(CONTENT.breads['inferno-bomb'].levels[0].dmg);
  }
});
