import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { creditDipUse, DIP_RUN_XP_CAP, simmerEffect, simmerProgress } from '../dipProgression';
import { createKitchenRun } from '../kitchen';
import { makeRng } from '../rng';
import { createRun, step } from '../sim';
import { hitEnemy, killEnemy } from '../sim/hit';
import { spawnEnemy } from '../sim/spawn';
import type { Ctx } from '../sim/ctx';
import { applyHitEffect, speedMul, tickStatuses } from '../status';
import type { BreadId, DipId, HitEffect } from '../types';

const supported = ['fish-curry', 'mint-chutney', 'condensed-milk'] as const;
const target = (id: DipId): BreadId => id === 'fish-curry' ? 'roti-bomb' : 'kosong';
function context(id: DipId = 'fish-curry', level = 1, simmer?: number): Ctx {
  const w = createRun({ seed: 3, content: CONTENT, ...(simmer === undefined ? {} : { loadout: { dipSimmer: { [id]: simmer } } }) });
  w.phase = 'wave'; w.wave = 2;
  w.player.dips = [{ id, level, linkedBread: target(id) }];
  w.player.stats.soak = -1; // these tests are about the dip alone, not soak splash
  return { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
}
function enemy(c: Ctx, hp = 1000) {
  spawnEnemy(c, { ...Object.values(CONTENT.enemies)[0], hp, speed: 0 }, 0, { y: 200 });
  const e = c.w.enemies.at(-1)!; e.elite = false; e.boss = false; e.shield = 0;
  return e;
}
function hit(c: Ctx, bread = target(c.p.dips[0].id), hp = 1000) {
  const e = enemy(c, hp);
  hitEnemy(c, e, 1, null, false, false, bread);
  return e;
}
function tagged(fx: HitEffect): HitEffect {
  return fx.type === 'burn' ? { ...fx, dps: fx.dps * 1.25, time: fx.time * 1.25 }
    : fx.type === 'chill' ? { ...fx, time: fx.time * 1.25, freezeTime: fx.freezeTime * 1.25 }
      : fx.type === 'sugar' ? { ...fx, slowTime: fx.slowTime * 1.25, crashStun: fx.crashStun * 1.25 } : fx;
}

describe('earned simmer', () => {
  it('keeps cumulative thresholds and caps distinct from run tiers', () => {
    expect([0, 39, 40, 89, 90, 150, 2470, 9000].map(x => simmerProgress(x).level)).toEqual([1, 1, 2, 2, 3, 4, 20, 20]);
    expect(simmerProgress(54)).toEqual({ level: 2, xp: 14, needed: 50 });
    expect(simmerProgress(NaN)).toEqual({ level: 1, xp: 0, needed: 40 });
  });

  it.each(supported)('%s changes only its selected field after matching bonus across all five run tiers', id => {
    const key = id === 'fish-curry' ? 'dps' : id === 'mint-chutney' ? 'time' : 'slowTime';
    for (let tier = 1; tier <= 5; tier++) {
      const original = CONTENT.dips[id].levels[tier - 1];
      const unchanged = structuredClone(original);
      const baseline = tagged(original);
      const boosted = simmerEffect(id, baseline, 20);
      expect(boosted).toEqual({ ...baseline, [key]: (baseline as unknown as Record<string, number>)[key] * 1.095 });
      expect(simmerEffect(id, baseline, 1)).toBe(baseline);
      expect(simmerEffect(id, baseline, NaN)).toBe(baseline);
      const ordinary = context(id, tier); const earned = context(id, tier, 20);
      const a = hit(ordinary); const b = hit(earned);
      expect(b.hp).toBe(a.hp);
      const statusId = id === 'fish-curry' ? 'burn' : id === 'mint-chutney' ? 'chill' : 'sugarSlow';
      const before = a.statuses.find(s => s.id === statusId)!;
      const after = b.statuses.find(s => s.id === statusId)!;
      const statusKey = id === 'fish-curry' ? 'dps' : 'time';
      expect(after).toEqual({ ...before, [statusKey]: before[statusKey] * 1.095 });
      expect(b.statuses.filter(s => s.id !== statusId)).toEqual(a.statuses.filter(s => s.id !== statusId));
      expect(earned.rng.state).toBe(ordinary.rng.state);
      expect(original).toEqual(unchanged);
    }
  });

  it('credits rolling seconds, not targets, integer bins or past acquisition time; limits each dip independently', () => {
    const c = context('fish-curry', 1, 1);
    c.w.time = 500; c.p.dips = [];
    creditDipUse(c.w, 'roti-bomb');
    c.p.dips = [{ id: 'fish-curry', level: 1, linkedBread: 'roti-bomb' }, { id: 'mint-chutney', level: 1, linkedBread: 'roti-bomb' }];
    expect(c.w.dipUseXp).toEqual({});
    c.w.time = 500.99;
    for (let n = 0; n < 20; n++) hit(c);
    c.w.time = 501.01; hit(c);
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': 1, 'mint-chutney': 1 });
    c.w.time = 501.99; hit(c);
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': 2, 'mint-chutney': 2 });
    for (let n = 2; n < 140; n++) { c.w.time = 500.99 + n; hit(c); }
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': DIP_RUN_XP_CAP, 'mint-chutney': DIP_RUN_XP_CAP });
  });

  it('rejects global, mismatched, unrelated, no damage, shield/AP, corpse and unearned hits', () => {
    const noSnapshot = context(); hit(noSnapshot); expect(noSnapshot.w.dipUseXp).toEqual({});
    const c = context('fish-curry', 1, 20);
    hit(c, 'kosong');
    c.p.dips[0].linkedBread = 'kosong'; hit(c, 'kosong');
    delete c.p.dips[0].linkedBread; hit(c, 'roti-bomb');
    c.p.dips[0].linkedBread = 'roti-bomb';
    const e = enemy(c); hitEnemy(c, e, 0, null, false, false, 'roti-bomb');
    e.shield = 100;
    hitEnemy(c, e, 1, { ...CONTENT.breads['roti-bomb'].levels[0], armourPierce: .5 }, true, false, 'roti-bomb');
    e.shield = 0; e.state = 'dead'; hitEnemy(c, e, 1, null, false, false, 'roti-bomb');
    expect(c.w.dipUseXp).toEqual({});
    expect(simmerEffect('masala', CONTENT.dips.masala.levels[0], 20)).toBe(CONTENT.dips.masala.levels[0]);
  });

  it('credits evolved-family lethal hits before secondary processing, without crediting DoT or paused/no-hit time', () => {
    const c = context('fish-curry', 1, 1);
    hit(c, 'inferno-bomb', .5);
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': 1 });
    c.w.time = 100;
    const e = enemy(c); applyHitEffect({ type: 'burn', dps: 3, time: 3 }, e);
    tickStatuses(e, 3, 0);
    c.w.phase = 'levelup'; creditDipUse(c.w, 'roti-bomb');
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': 1 });
  });

  it('40 qualifying seconds cross first threshold; equal elapsed timestamps tolerate split dt residue', () => {
    const a = context('fish-curry', 1, 1); const b = context('fish-curry', 1, 1);
    for (let n = 0; n < 40; n++) {
      a.w.time = n; hit(a);
      b.w.time = n - n * Number.EPSILON; hit(b);
    }
    expect(a.w.dipUseXp).toEqual(b.w.dipUseXp);
    expect(simmerProgress(a.w.dipUseXp?.['fish-curry']).level).toBe(2);
  });

  it('serializes actual use when the run ends and copies the starting snapshot', () => {
    const snapshot = { 'fish-curry': 2 };
    const w = createRun({ seed: 3, content: CONTENT, loadout: { dipSimmer: snapshot } });
    snapshot['fish-curry'] = 20;
    expect(w.loadout?.dipSimmer?.['fish-curry']).toBe(2);
    w.phase = 'wave'; w.wave = 2; w.dipUseXp = { 'fish-curry': 7 }; w.player.hp = 0;
    step(w, .01, { targetX: null, moving: false });
    expect(w.result?.dipUseXp).toEqual({ 'fish-curry': 7 });
  });

  it('Kitchen remains baseline with no earned use', () => {
    const w = createKitchenRun({ seed: 3, chapterId: CONTENT.chapters[0].id, wave: 1, breads: [{ id: 'roti-bomb', level: 1 }], dips: [{ id: 'fish-curry', level: 1, linkedBread: 'roti-bomb' }] }, CONTENT);
    const c: Ctx = { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
    expect(hit(c).statuses.find(s => s.id === 'burn')?.dps).toBe(3.75);
    expect(w.dipUseXp).toEqual({});
  });

  it('Fish burns harder for the same time and refresh keeps max without compounding', () => {
    const c = context('fish-curry', 1, 20); const e = hit(c);
    const burn = e.statuses.find(s => s.id === 'burn')!;
    expect(burn.time).toBe(3.75); expect(burn.dps).toBeCloseTo(4.10625);
    applyHitEffect({ type: 'burn', dps: 3, time: 3 }, e);
    expect(burn.dps).toBeCloseTo(4.10625);
    expect(tickStatuses(e, 4, .2)).toBeCloseTo(4.10625 * 3.75 * 1.2);
  });

  it('Mint keeps stacks over a gap but preserves freeze duration, threshold and slow strength', () => {
    const a = context('mint-chutney', 1, 1); const b = context('mint-chutney', 1, 20);
    const ea = hit(a); const eb = hit(b);
    tickStatuses(ea, 7.6, 0); tickStatuses(eb, 7.6, 0);
    for (const [c, e] of [[a, ea], [b, eb]] as const) hitEnemy(c, e, 1, null, false, false, 'kosong');
    expect(ea.statuses.find(s => s.id === 'chill')?.stacks).toBe(1);
    expect(eb.statuses.find(s => s.id === 'chill')?.stacks).toBe(2);
    expect(speedMul(eb)).toBe(.8);
    hitEnemy(b, eb, 1, null, false, false, 'kosong');
    expect(eb.statuses.find(s => s.id === 'freeze')?.time).toBe(1.25);
  });

  it('Milk sticky slow lasts longer and survives the unchanged crash', () => {
    const a = context('condensed-milk', 1, 1); const b = context('condensed-milk', 1, 20);
    const ea = hit(a); const eb = hit(b);
    expect(speedMul(ea)).toBe(speedMul(eb));
    tickStatuses(ea, 2.6, 0); tickStatuses(eb, 2.6, 0);
    expect(ea.statuses.some(s => s.id === 'sugarSlow')).toBe(false);
    expect(eb.statuses.some(s => s.id === 'sugarSlow')).toBe(true);
    for (let n = 1; n < 5; n++) { b.w.time = n; hitEnemy(b, eb, 1, null, false, false, 'kosong'); }
    expect(eb.statuses.some(s => s.id === 'sugar')).toBe(false);
    expect(eb.statuses.find(s => s.id === 'stun')?.time).toBe(1.25);
    expect(eb.statuses.find(s => s.id === 'sugarSlow')).toMatchObject({ time: 2.7375, amount: .3 });
  });

  it('Sambal copies raw tier burn, retains existing stronger neighbour burn, and earns no secondary XP', () => {
    const c = context('fish-curry', 2, 20);
    c.p.dips.push({ id: 'sambal', level: 1 });
    const source = hit(c); const fresh = enemy(c); const boosted = hit(c);
    source.hp = 0; c.w.time = 10; killEnemy(c, source);
    expect(fresh.statuses.find(s => s.id === 'burn')).toMatchObject({ dps: 4, time: 3 });
    expect(boosted.statuses.find(s => s.id === 'burn')).toMatchObject({ dps: 5 * 1.095, time: 3.75 });
    expect(c.w.dipUseXp).toEqual({ 'fish-curry': 1 });
    const d = context('sambal', 1, 20); const s = enemy(d); const neighbour = enemy(d);
    applyHitEffect({ type: 'burn', dps: 100, time: 100 }, s); s.hp = 0; killEnemy(d, s);
    expect(neighbour.statuses.find(st => st.id === 'burn')).toMatchObject({ dps: 3, time: 2 });
    expect(d.w.dipUseXp).toEqual({});
  });
});
