import { describe, expect, it } from 'vitest';
import { MAX_BREADS, MAX_DIPS, applyCard, drawOffer } from '../cards';
import { makeRng } from '../rng';
import { BASE_STATS } from '../stats';
import type { BreadId, Card, Content, DipId, Player } from '../types';

// Fake content: only the fields cards.ts and computeStats read. 'recipe-s2' entries are locked.
const item = (id: string, unlock = 'starter') => ({ id, name: id, flavor: '', sprite: '', levels: [], unlock });
const fake = {
  breads: {
    naan: item('naan'), thosai: item('thosai'), idli: item('idli'), vadai: item('vadai'),
    murtabak: item('murtabak'), kosong: item('kosong', 'recipe-s2'),
  },
  dips: {
    ghee: item('ghee'), sambal: item('sambal'), masala: item('masala'), dhal: item('dhal'),
    'mint-chutney': item('mint-chutney'), 'teh-tarik': item('teh-tarik', 'recipe-s2'),
  },
  passives: {
    'thick-skin': { id: 'thick-skin', maxLevel: 2, perLevel: { maxHp: 20 } },
    'strong-wrists': { id: 'strong-wrists', maxLevel: 3, perLevel: { dmgPct: 0.06 } },
  },
  enemies: {}, bosses: {}, chapters: [], lines: { wake: [], win: [], tips: [] },
} as unknown as Content;

const ownedBread = (id: BreadId, level: number) => ({ id, level, cd: 0, volleyLeft: 0, volleyT: 0 });
const player = (over: Partial<Player> = {}): Player => ({
  x: 0, y: 0, dashT: 0, dashCd: 0, dashDx: 0, dashDy: 1, faceX: 0, faceY: 1, dodgeHeld: false, targetX: 0, moving: false, hp: 100, stats: { ...BASE_STATS }, breads: [], dips: [], passives: [],
  buffs: [], level: 1, xp: 0, xpToNext: 9, revivesLeft: 0, throwAnim: 0, hurtAnim: 0, ...over,
});
const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
const offersFor = (p: Player) => seeds.map((s) => drawOffer(p, fake, makeRng(s)));

describe('drawOffer', () => {
  it('draws distinct ids per offer', () => {
    const p = player({ breads: [ownedBread('naan', 2)], dips: [{ id: 'ghee', level: 1 }], passives: [{ id: 'thick-skin', level: 1 }] });
    for (const offer of offersFor(p)) {
      expect(offer).toHaveLength(3);
      expect(new Set(offer.map((c) => `${c.kind}:${c.id}`)).size).toBe(3);
    }
  });

  it('strongly damps both recent offers by identity, even after an upgrade, and forgets older offers', () => {
    const p = player({ breads: [ownedBread('naan', 2)], dips: [{ id: 'ghee', level: 1 }] });
    const recent: Card[][] = [[{ kind: 'bread', id: 'naan', level: 1 }], [{ kind: 'dip', id: 'ghee', level: 1 }]];
    const count = (history: Card[][]) => seeds.flatMap((seed) => drawOffer(p, fake, makeRng(seed), { n: 1, recentOffers: history }))
      .filter((c) => c.id === 'naan' || c.id === 'ghee').length;
    expect(count(recent)).toBeLessThan(count([]) * 0.4);
    expect(count([...recent, [], []])).toBe(count([]));
    expect(drawOffer(p, fake, makeRng(42), { recentOffers: recent })).toEqual(drawOffer(p, fake, makeRng(42), { recentOffers: recent }));
  });

  it('keeps the dip guarantee and never duplicates a card when everything is recent', () => {
    const p = player();
    const all: Card[] = [...Object.keys(fake.breads).map((id) => ({ kind: 'bread' as const, id, level: 1 })),
      ...Object.keys(fake.dips).map((id) => ({ kind: 'dip' as const, id, level: 1 }))];
    for (const seed of seeds) {
      const offer = drawOffer(p, fake, makeRng(seed), { recentOffers: [all, all] });
      expect(offer.some((c) => c.kind === 'dip')).toBe(true);
      expect(new Set(offer.map((c) => `${c.kind}:${c.id}`)).size).toBe(offer.length);
    }
  });

  it('stops offering new breads and dips at MAX_BREADS and MAX_DIPS', () => {
    const breadIds: BreadId[] = ['naan', 'thosai', 'idli', 'vadai'];
    const dipIds: DipId[] = ['ghee', 'sambal', 'masala', 'dhal'];
    expect(breadIds).toHaveLength(MAX_BREADS);
    expect(dipIds).toHaveLength(MAX_DIPS);
    const p = player({ breads: breadIds.map((id) => ownedBread(id, 1)), dips: dipIds.map((id) => ({ id, level: 1 })) });
    for (const offer of offersFor(p)) {
      for (const c of offer) {
        if (c.kind === 'bread') expect(breadIds).toContain(c.id);
        if (c.kind === 'dip') expect(dipIds).toContain(c.id);
      }
    }
  });

  it('never offers maxed items', () => {
    const p = player({ breads: [ownedBread('naan', 5)], dips: [{ id: 'ghee', level: 5 }], passives: [{ id: 'thick-skin', level: 2 }] });
    const maxed = new Set(['bread:naan', 'dip:ghee', 'passive:thick-skin']);
    for (const offer of offersFor(p)) {
      for (const c of offer) expect(maxed.has(`${c.kind}:${c.id}`)).toBe(false);
    }
  });

  it('guarantees a new dip when the player owns none', () => {
    for (const offer of offersFor(player())) {
      expect(offer.some((c) => c.kind === 'dip' && c.level === 1)).toBe(true);
    }
  });

  it('defaults pools to unlock === starter', () => {
    const ids = offersFor(player()).flat().map((c) => c.id);
    expect(ids).toContain('naan');
    expect(ids).toContain('mint-chutney');
    expect(ids).not.toContain('kosong');
    expect(ids).not.toContain('teh-tarik');
  });

  it('fills with heal then gold when candidates run out', () => {
    const maxedPlayer = (strongWristsLevel: number) => player({
      breads: (['naan', 'thosai', 'idli', 'vadai'] as BreadId[]).map((id) => ownedBread(id, 5)),
      dips: (['ghee', 'sambal', 'masala', 'dhal'] as DipId[]).map((id) => ({ id, level: 5 })),
      passives: [{ id: 'thick-skin', level: 2 }, { id: 'strong-wrists', level: strongWristsLevel }],
    });
    expect(drawOffer(maxedPlayer(3), fake, makeRng(1))).toEqual([
      { kind: 'heal', id: '', level: 1 },
      { kind: 'gold', id: '', level: 1 },
    ]);
    expect(drawOffer(maxedPlayer(2), fake, makeRng(1))).toEqual([
      { kind: 'passive', id: 'strong-wrists', level: 3 },
      { kind: 'heal', id: '', level: 1 },
      { kind: 'gold', id: '', level: 1 },
    ]);
  });

  it('is deterministic for a given rng state', () => {
    const p = player({ breads: [ownedBread('naan', 2)], dips: [{ id: 'ghee', level: 1 }] });
    const draws = (seed: number) => {
      const rng = makeRng(seed);
      return [1, 2, 3].map(() => drawOffer(p, fake, rng));
    };
    expect(draws(99)).toEqual(draws(99));
  });
});

describe('applyCard', () => {
  it('adds a new bread at level 1 with cd and volley fields zeroed', () => {
    const p = player();
    applyCard(p, { kind: 'bread', id: 'naan', level: 1 }, fake);
    expect(p.breads).toEqual([{ id: 'naan', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 }]);
  });

  it('adds new dips and passives at level 1', () => {
    const p = player();
    applyCard(p, { kind: 'dip', id: 'ghee', level: 1 }, fake);
    applyCard(p, { kind: 'passive', id: 'strong-wrists', level: 1 }, fake);
    expect(p.dips).toEqual([{ id: 'ghee', level: 1 }]);
    expect(p.passives).toEqual([{ id: 'strong-wrists', level: 1 }]);
  });

  it('sets an owned item to card.level', () => {
    const p = player({ breads: [ownedBread('naan', 2)], dips: [{ id: 'ghee', level: 1 }], passives: [{ id: 'strong-wrists', level: 1 }] });
    applyCard(p, { kind: 'bread', id: 'naan', level: 3 }, fake);
    applyCard(p, { kind: 'dip', id: 'ghee', level: 2 }, fake);
    applyCard(p, { kind: 'passive', id: 'strong-wrists', level: 2 }, fake);
    expect(p.breads).toHaveLength(1);
    expect(p.breads[0].level).toBe(3);
    expect(p.dips).toEqual([{ id: 'ghee', level: 2 }]);
    expect(p.passives).toEqual([{ id: 'strong-wrists', level: 2 }]);
  });

  it('recomputes stats from passives without double counting', () => {
    const p = player();
    applyCard(p, { kind: 'passive', id: 'strong-wrists', level: 1 }, fake);
    applyCard(p, { kind: 'passive', id: 'strong-wrists', level: 2 }, fake);
    expect(p.stats.dmgPct).toBeCloseTo(0.12);
  });

  it('heals by a maxHp rise, and only then', () => {
    const hurt = player({ hp: 80 });
    applyCard(hurt, { kind: 'passive', id: 'thick-skin', level: 1 }, fake);
    expect(hurt.stats.maxHp).toBe(BASE_STATS.maxHp + 20);
    expect(hurt.hp).toBe(100);

    const full = player({ hp: 100 });
    applyCard(full, { kind: 'passive', id: 'thick-skin', level: 1 }, fake);
    expect(full.hp).toBe(120);

    const noRise = player({ hp: 80 });
    applyCard(noRise, { kind: 'passive', id: 'strong-wrists', level: 1 }, fake);
    expect(noRise.hp).toBe(80);
  });

  it('heal card restores 30% of maxHp, capped at maxHp', () => {
    const low = player({ hp: 50 });
    applyCard(low, { kind: 'heal', id: '', level: 1 }, fake);
    expect(low.hp).toBe(80);
    const high = player({ hp: 90 });
    applyCard(high, { kind: 'heal', id: '', level: 1 }, fake);
    expect(high.hp).toBe(100);
  });

  it('gold card returns 25; every other card returns 0', () => {
    const p = player();
    expect(applyCard(p, { kind: 'gold', id: '', level: 1 }, fake)).toEqual({ gold: 25 });
    expect(applyCard(p, { kind: 'heal', id: '', level: 1 }, fake)).toEqual({ gold: 0 });
    expect(applyCard(p, { kind: 'bread', id: 'naan', level: 1 }, fake)).toEqual({ gold: 0 });
  });
});
