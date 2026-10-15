import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoPick } from '../autoplay';
import { applyCard, drawOffer } from '../cards';
import { makeRng } from '../rng';
import { createRun, reroll, chooseCard, step } from '../sim';
import type { Ctx } from '../sim/ctx';
import { hitEnemy, killEnemy } from '../sim/hit';
import { updateZones, updatePlayerShots } from '../sim/shots';
import { spawnEnemy } from '../sim/spawn';
import { updateThrowing } from '../sim/throw';
import type { BreadId, DipId, PassiveId } from '../types';

const evolved = Object.values(CONTENT.breads).filter(b => b.evolvedFrom);
function context(): Ctx {
  const w = createRun({ seed: 7, content: CONTENT });
  w.wave = 1;
  w.player.y = 0; // enemies below are placed as if he stood at the foot of the street
  return { w, p: w.player, rng: makeRng(7), dt: 1 / 30, m: null };
}
function own(c: Ctx, id: BreadId, level = 1) {
  c.p.breads = [{ id, level, cd: 0, volleyLeft: 0, volleyT: 0 }];
}
function enemy(c: Ctx, x = 0, y = 200, hp = 1000) {
  return spawnEnemy(c, { ...CONTENT.enemies['sugar-ant'], hp, speed: 0 }, x, { y });
}

describe('evolutions', () => {
  it.each(evolved)('$id is guaranteed only when both ingredients are maxed, replaces its slot and keeps cooldown', def => {
    const c = context();
    const from = def.evolvedFrom!;
    own(c, from.bread, 5);
    c.p.breads[0].cd = .37;
    if (from.partner.kind === 'dip') c.p.dips = [{ id: from.partner.id as DipId, level: 4 }];
    else c.p.passives = [{ id: from.partner.id as PassiveId, level: CONTENT.passives[from.partner.id as PassiveId].maxLevel - 1 }];
    expect(drawOffer(c.p, CONTENT, c.rng).some(card => card.kind === 'evolve')).toBe(false);
    applyCard(c.p, { kind: 'evolve', id: def.id, level: 1 }, CONTENT);
    expect(c.p.breads[0].id).toBe(from.bread);
    if (from.partner.kind === 'dip') c.p.dips[0].level = 5;
    else c.p.passives[0].level++;
    c.p.breads[0].level = 4;
    expect(drawOffer(c.p, CONTENT, c.rng).some(card => card.kind === 'evolve')).toBe(false);
    c.p.breads[0].level = 5;
    for (let seed = 1; seed <= 30; seed++) {
      const offer = drawOffer(c.p, CONTENT, makeRng(seed));
      expect(offer).toHaveLength(3);
      expect(offer).toContainEqual({ kind: 'evolve', id: def.id, level: 1 });
      c.w.offer = offer;
      expect(offer[autoPick(c.w)].kind).toBe('evolve');
    }
    applyCard(c.p, { kind: 'evolve', id: def.id, level: 1 }, CONTENT);
    expect(c.p.breads).toHaveLength(1);
    expect(c.p.breads[0]).toMatchObject({ id: def.id, level: 1, cd: .37, volleyLeft: 0 });
    expect(def.levels).toHaveLength(5);
    expect(def.levels.every(level => JSON.stringify(level) === JSON.stringify(def.levels[0]))).toBe(true);
    for (let seed = 1; seed <= 30; seed++) expect(drawOffer(c.p, CONTENT, makeRng(seed), { breadPool: [def.id, from.bread] }).some(card => card.kind === 'bread' && [def.id, from.bread].includes(card.id as BreadId))).toBe(false);
  });

  it('chakra hits seven distinct enemies and rolls crit on each bounce', () => {
    const c = context(); own(c, 'golden-ghee-chakra'); c.p.stats.critChance = 1;
    const enemies = Array.from({ length: 7 }, (_, i) => enemy(c, 0, 80 + i * 80));
    updateThrowing(c);
    for (let i = 0; i < 30; i++) updatePlayerShots(c);
    const hits = c.w.events.filter(ev => ev.t === 'hit');
    expect(hits).toHaveLength(7);
    expect(hits.every(ev => ev.crit)).toBe(true);
    expect(new Set(hits.map(ev => ev.uid)).size).toBe(7);
    expect(enemies.every(e => e.hp < e.maxHp)).toBe(true);
    expect(CONTENT.breads['golden-ghee-chakra'].levels[0].speed).toBe(900 * 1.3);
  });

  it('lance pierces an entire enemy line with a 30% faster cooldown', () => {
    const c = context(); own(c, 'tarik-lance');
    for (let i = 0; i < 12; i++) enemy(c, 0, 60 + i * 60);
    updateThrowing(c);
    for (let i = 0; i < 28; i++) updatePlayerShots(c);
    expect(c.w.events.filter(ev => ev.t === 'hit')).toHaveLength(12);
    expect(CONTENT.breads['tarik-lance'].levels[0].cooldown).toBe(CONTENT.breads.tissue.levels[4].cooldown / 1.3);
  });

  it('inferno fire ignites enemies so its retained Sambal chains explosions', () => {
    const c = context(); own(c, 'inferno-bomb');
    c.p.dips = [{ id: 'sambal', level: 5 }];
    const source = enemy(c, 0, 200); const neighbour = enemy(c, 30, 200, 10);
    const st = CONTENT.breads['inferno-bomb'].levels[0];
    c.w.zones.push({ uid: 100, x: 0, y: 200, radius: st.blast, dps: st.zoneDps, time: 3, sprite: 'fx/smoke', effect: st.zoneEffect });
    updateZones(c);
    expect(source.statuses.some(s => s.id === 'burn')).toBe(true);
    source.hp = 0; killEnemy(c, source);
    expect(neighbour.state).toBe('dead');
    expect(c.w.events.filter(ev => ev.t === 'blast')).toHaveLength(2);
  });

  it('multiple ready recipes yield one guaranteed evolution, and zero-card offers stay empty', () => {
    const c = context();
    own(c, 'kosong', 5);
    c.p.breads.push({ id: 'tissue', level: 5, cd: 0, volleyLeft: 0, volleyT: 0 });
    c.p.dips = [{ id: 'ghee', level: 5 }, { id: 'teh-tarik', level: 5 }];
    expect(drawOffer(c.p, CONTENT, c.rng).filter(card => card.kind === 'evolve')).toHaveLength(1);
    expect(drawOffer(c.p, CONTENT, c.rng, { n: 0 })).toEqual([]);
  });

  it('halo fragments home and heal on hits; shields do not heal and HP is capped', () => {
    const c = context(); own(c, 'half-boiled-halo'); c.p.hp = 50;
    const e = enemy(c, 0, 80);
    updateThrowing(c);
    for (let i = 0; i < 5; i++) updatePlayerShots(c);
    expect(c.p.hp).toBe(51);
    const fragments = c.w.projectiles.filter(s => s.stats?.fragments === 0);
    expect(fragments).toHaveLength(8);
    expect(fragments.every(s => s.stats?.homing === 1 && s.stats?.healOnHit === 1)).toBe(true);
    e.shield = 100;
    hitEnemy(c, e, 1, CONTENT.breads['half-boiled-halo'].levels[0], true);
    expect(c.p.hp).toBe(51);
    c.p.hp = 99.5; e.shield = 0;
    hitEnemy(c, e, 1, CONTENT.breads['half-boiled-halo'].levels[0], false);
    expect(c.p.hp).toBe(100);
  });

  it('typhoon sweeps both edges and pulls toward centre without walking drift undoing it', () => {
    const c = context(); own(c, 'thosai-typhoon');
    const enemies = [enemy(c, -250, 100), enemy(c, 250, 100)];
    updateThrowing(c);
    for (let i = 0; i < 6; i++) updatePlayerShots(c);
    expect(enemies.map(e => e.x)).toEqual([-130, 130]);
    expect(enemies.map(e => e.cooldowns.bx)).toEqual([-130, 130]);
    expect(CONTENT.breads['thosai-typhoon'].levels[0].cooldown).toBe(2);
  });

  it('crusher guarantees every fifth successful slam, including extra projectiles, and stuns for one second', () => {
    const c = context(); own(c, 'crusher-murtabak'); c.p.stats.critChance = 0; c.p.stats.extraProjectiles = 1;
    const e = enemy(c, 0, 80);
    for (let cast = 1; cast <= 5; cast++) {
      c.p.breads[0].cd = 0; c.w.projectiles = [];
      updateThrowing(c);
      expect(c.w.projectiles.every(s => s.guaranteedCrit === true)).toBe(cast === 5);
      const s = c.w.projectiles[0];
      hitEnemy(c, e, s.dmg, s.stats, false, s.guaranteedCrit);
      const event = c.w.events.filter(ev => ev.t === 'hit').at(-1);
      expect(event).toMatchObject({ crit: cast === 5 });
      expect(e.statuses.find(s => s.id === 'stun')?.time).toBe(1);
    }
    c.w.enemies = []; c.p.breads[0].cd = 0; updateThrowing(c);
    expect(c.p.breads[0].casts).toBe(5);
  });

  it.each(['inferno-bomb', 'tandoor-meteor', 'garlic-thunder-zone'] as const)('%s leaves its timed zone and applies its effect', id => {
    const c = context(); own(c, id);
    const e = enemy(c, 0, 200); const neighbour = enemy(c, 50, 200);
    updateThrowing(c);
    const st = CONTENT.breads[id].levels[0];
    for (let i = 0; i < 40; i++) updatePlayerShots(c);
    expect(c.w.zones.length).toBeGreaterThan(0);
    expect(c.w.zones[0]).toMatchObject({ time: st.zoneTime, effect: st.zoneEffect });
    const before = neighbour.hp;
    updateZones(c);
    if (id === 'inferno-bomb') expect(e.statuses.some(s => s.id === 'burn')).toBe(true);
    if (id === 'tandoor-meteor') {
      expect(e.statuses.some(s => s.id === 'tender')).toBe(true);
      expect(e.knock).toBe(80);
    }
    if (id === 'garlic-thunder-zone') {
      expect(neighbour.hp).toBeLessThan(before);
      expect(c.w.events.some(ev => ev.t === 'chain')).toBe(true);
      c.w.events = [];
      for (let i = 0; i < 28; i++) updateZones(c);
      expect(c.w.events.some(ev => ev.t === 'chain')).toBe(false);
      for (let i = 0; i < 3; i++) updateZones(c);
      expect(c.w.events.some(ev => ev.t === 'chain')).toBe(true);
    }
    c.dt = 5; updateZones(c); expect(c.w.zones).toEqual([]);
  });

  it('loadout pools reach initial offers, queued level-ups and rerolls', () => {
    const w = createRun({ seed: 1, content: CONTENT, mode: 'waves', loadout: { breadPool: ['naan'], dipPool: ['ghee'] } });
    w.pendingLevelUps = 2;
    step(w, 1 / 30, {});
    expect(w.offer).toContainEqual({ kind: 'dip', id: 'ghee', level: 1 });
    expect(reroll(w)).toBe(true);
    expect(w.offer).toContainEqual({ kind: 'dip', id: 'ghee', level: 1 });
    chooseCard(w, w.offer.findIndex(card => card.kind !== 'dip'));
    expect(w.offer).toContainEqual({ kind: 'dip', id: 'ghee', level: 1 });
    for (const card of w.offer) if (card.kind === 'bread') expect(['kosong', 'naan']).toContain(card.id);
  });
});

it('queued offers and rerolls retain the recipe pools, history and eligible evolution', () => {
  const w = createRun({ seed: 17, content: CONTENT, mode: 'waves', loadout: { breadPool: ['naan'], dipPool: ['ghee'], rerolls: 2 } });
  w.player.breads[0].level = 5;
  w.player.dips = [{ id: 'ghee', level: 5 }];
  w.pendingLevelUps = 2;
  step(w, 1 / 30, {});
  for (let i = 0; i < 3; i++) {
    expect(w.offer).toContainEqual({ kind: 'evolve', id: 'golden-ghee-chakra', level: 1 });
    expect(w.offer.filter(c => c.kind === 'bread').every(c => c.id === 'naan')).toBe(true);
    expect(w.offer.some(c => c.kind === 'dip')).toBe(false);
    expect(w.recentOffers?.at(-1)).toEqual(w.offer);
    if (i < 2) expect(reroll(w)).toBe(true);
  }
  expect(w.recentOffers).toHaveLength(2);
  expect(w.rerolls).toBe(0);
  chooseCard(w, w.offer.findIndex(c => c.kind !== 'evolve'));
  expect(w.phase).toBe('levelup');
  expect(w.offer).toContainEqual({ kind: 'evolve', id: 'golden-ghee-chakra', level: 1 });
  expect(w.recentOffers?.at(-1)).toEqual(w.offer);
});
