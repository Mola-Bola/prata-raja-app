import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { applyCard, drawOffer } from '../cards';
import { dipMatchesBread, isLinkableDip } from '../dipLinks';
import { createKitchenRun } from '../kitchen';
import { makeRng } from '../rng';
import { createRun } from '../sim';
import { hitEnemy } from '../sim/hit';
import { spawnEnemy } from '../sim/spawn';
import type { Ctx } from '../sim/ctx';
import type { BreadId, DipId } from '../types';

const tags = {
  kosong: ['thrown', 'crisp'], tissue: ['thrown', 'pierce', 'crisp'], 'roti-bomb': ['lob', 'area', 'heat'],
  'egg-telur': ['thrown', 'stuffed'], thosai: ['area', 'crisp'], chapati: ['thrown'], naan: ['lob', 'area'],
  'garlic-naan': ['lob', 'area'], murtabak: ['thrown', 'stuffed'], appam: ['thrown', 'bounce'], idli: ['thrown'], vadai: ['orbit', 'crisp'],
};
function context(dip: DipId, target?: BreadId): Ctx {
  // Mint fits every shipped roti; an untagged fixture exercises its mismatch branch.
  const content = dip === 'mint-chutney' ? { ...CONTENT, breads: { ...CONTENT.breads, vadai: { ...CONTENT.breads.vadai, tags: [] } } } : CONTENT;
  const w = createRun({ seed: 3, content });
  w.player.dips = [{ id: dip, level: 1, ...(target ? { linkedBread: target } : {}) }];
  return { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
}
function hit(c: Ctx, bread: BreadId) {
  spawnEnemy(c, { ...CONTENT.enemies[Object.keys(CONTENT.enemies)[0]], hp: 1000, speed: 0 }, 0, { y: 200 });
  const e = c.w.enemies.at(-1)!;
  hitEnemy(c, e, 1, null, false, false, bread);
  return e;
}

describe('dip tag contract', () => {
  it('declares every current base tag and inherits through evolution', () => {
    for (const b of Object.values(CONTENT.breads)) expect(b.tags).toEqual(tags[(b.evolvedFrom?.bread ?? b.id) as keyof typeof tags]);
    expect(CONTENT.dips['fish-curry'].matchingTags).toEqual(['lob', 'heat', 'stuffed']);
    expect(CONTENT.dips['condensed-milk'].matchingTags).toEqual(['thrown', 'orbit', 'bounce', 'sweet']);
    expect(CONTENT.dips['mint-chutney'].matchingTags).toEqual(['thrown', 'area', 'crisp']);
    expect(Object.values(CONTENT.dips).filter(isLinkableDip).map(d => d.id).sort()).toEqual(['condensed-milk', 'fish-curry', 'mint-chutney']);
    expect(Object.values(CONTENT.dips).map(d => [d.id, d.family])).toEqual([
      ['fish-curry', 'curry'], ['condensed-milk', 'special'], ['mint-chutney', 'chutney'], ['masala', 'special'],
      ['mutton-curry', 'curry'], ['chicken-curry', 'curry'], ['sambal', 'sambar'], ['teh-tarik', 'special'], ['ghee', 'special'], ['dhal', 'dhal'],
    ]);
  });

  it.each([
    ['fish-curry', 'roti-bomb', 'kosong', 'burn', 3.75, 3],
    ['condensed-milk', 'kosong', 'roti-bomb', 'sugarSlow', 2.5, 2],
    ['mint-chutney', 'kosong', 'vadai', 'chill', 7.5, 6],
  ] as const)('%s boosts only a matching target and keeps mismatches ordinary and targeted', (dip, match, mismatch, status, boosted, ordinary) => {
    const matched = context(dip, match);
    expect(hit(matched, match).statuses.find(s => s.id === status)?.time).toBe(boosted);
    expect(hit(matched, mismatch).statuses.find(s => s.id === status)).toBeUndefined();
    const wrong = context(dip, mismatch);
    expect(hit(wrong, mismatch).statuses.find(s => s.id === status)?.time).toBe(ordinary);
    expect(hit(wrong, match).statuses.find(s => s.id === status)).toBeUndefined();
    const global = context(dip);
    for (const b of [match, mismatch]) expect(hit(global, b).statuses.find(s => s.id === status)?.time).toBe(ordinary);
  });

  it('evolved matching and mismatched fish links preserve base identity and exact damage', () => {
    for (const [base, evolved, dps, time] of [['roti-bomb', 'inferno-bomb', 3.75, 3.75], ['kosong', 'golden-ghee-chakra', 3, 3]] as const) {
      const c = context('fish-curry', evolved);
      for (const b of [base, evolved]) expect(hit(c, b).statuses.find(s => s.id === 'burn')).toMatchObject({ dps, time });
    }
  });

  it('new offers and picks link only a compatible signature; upgrades preserve old mismatches', () => {
    for (const signature of ['kosong', 'roti-bomb', 'vadai', 'murtabak'] as const) {
      const w = createRun({ seed: 3, content: CONTENT, loadout: { startBread: signature, signatureBread: signature } });
      const offered = drawOffer(w.player, CONTENT, makeRng(3), { n: 100, signatureBread: signature });
      for (const id of ['fish-curry', 'condensed-milk', 'mint-chutney'] as const) {
        const fits = dipMatchesBread(CONTENT.dips[id], CONTENT.breads[signature]);
        expect(offered.find(c => c.id === id)?.linkedBread).toBe(fits ? signature : undefined);
      }
      applyCard(w.player, { kind: 'dip', id: 'fish-curry', level: 1 }, CONTENT, w.loadout);
      expect(w.player.dips[0].linkedBread).toBe(dipMatchesBread(CONTENT.dips['fish-curry'], CONTENT.breads[signature]) ? signature : undefined);
    }
    const c = context('fish-curry', 'kosong');
    applyCard(c.p, { kind: 'dip', id: 'fish-curry', level: 2 }, CONTENT, { signatureBread: 'roti-bomb' });
    expect(c.p.dips[0]).toEqual({ id: 'fish-curry', level: 2, linkedBread: 'kosong' });
  });

  it('mismatched linked Milk still caps instant stacks', () => {
    const c = context('condensed-milk', 'roti-bomb');
    const e = hit(c, 'roti-bomb');
    hitEnemy(c, e, 1, null, false, false, 'roti-bomb');
    expect(e.statuses.find(s => s.id === 'sugar')?.stacks).toBe(1);
    expect(e.statuses.find(s => s.id === 'sugarSlow')?.time).toBe(2);
  });

  it('Kitchen accepts a deliberately mismatched link and applies the ordinary target effect', () => {
    const w = createKitchenRun({ seed: 3, chapterId: CONTENT.chapters[0].id, wave: 1, breads: [{ id: 'kosong', level: 1 }], dips: [{ id: 'fish-curry', level: 1, linkedBread: 'kosong' }] }, CONTENT);
    const c: Ctx = { w, p: w.player, rng: makeRng(3), dt: .1, m: null };
    expect(hit(c, 'kosong').statuses.find(s => s.id === 'burn')).toMatchObject({ dps: 3, time: 3 });
    expect(hit(c, 'murtabak').statuses.find(s => s.id === 'burn')).toBeUndefined();
  });
});
