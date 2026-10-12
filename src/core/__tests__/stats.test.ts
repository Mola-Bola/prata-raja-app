import { describe, expect, it } from 'vitest';
import type { Rng } from '../rng';
import { BASE_STATS, buffMods, computeStats, effectiveCooldown, rollHit, waveHpScale, xpToNext } from '../stats';
import type { BuffMods } from '../stats';
import type { Buff, ChapterDef, Content, DipId, HitEffect, Loadout, OwnedDip, OwnedPassive, PlayerStats } from '../types';

// Fake content: only the parts stats.ts reads (never imports src/content). Numbers are exact binary fractions.
const byLevel = (fx: (lvl: number) => HitEffect): HitEffect[] => [1, 2, 3, 4, 5].map((l) => fx(l));
const content = {
  passives: {
    'strong-wrists': { id: 'strong-wrists', perLevel: { dmgPct: 0.125, maxHp: 5 } },
    'extra-dough': { id: 'extra-dough', perLevel: { dmgPct: 0.0625, dmgTakenPct: -0.25 } },
    'fast-flip': { id: 'fast-flip', perLevel: { throwSpeedPct: 0.25 } },
  },
  dips: {
    'teh-tarik': { id: 'teh-tarik', levels: byLevel((l) => ({ type: 'haste', everyHits: 5, throwSpeedPct: 0.25 * l, time: 3 })) },
    'ghee': { id: 'ghee', levels: byLevel((l) => ({ type: 'spin', projSpeedPct: 0.25 * l, critDmgPct: 0.5 * l, time: 4 })) },
    'chicken-curry': {
      id: 'chicken-curry',
      levels: byLevel((l) => ({ type: 'stackDmg', pctPerStack: 0.125 * l, maxStacks: 4, time: 6, critAtMax: 0.25 * l })),
    },
  },
} as unknown as Content;

const NONE: BuffMods = { throwSpeedPct: 0, projSpeedPct: 0, critMultAdd: 0, dmgPct: 0, critChance: 0 };
const dip = (id: DipId, level: number): OwnedDip => ({ id, level });
const buff = (id: Buff['id'], stacks = 0): Buff => ({ id, time: 5, stacks, hitCount: 0 });

// Stub Rng: rollHit only calls next(); the other members just satisfy the type.
const stubRng = (next: () => number): Rng => ({
  next,
  int: () => 0,
  range: () => 0,
  chance: () => false,
  pick: (items) => items[0],
  weighted: (items) => items[0],
  state: 0,
});

describe('computeStats', () => {
  it('returns a fresh copy of BASE_STATS when nothing is owned', () => {
    const s = computeStats([], content);
    expect(s).toEqual(BASE_STATS);
    expect(s).not.toBe(BASE_STATS);
  });

  it('sums each passive perLevel × level on top of base', () => {
    const owned: OwnedPassive[] = [
      { id: 'strong-wrists', level: 2 }, // dmgPct +0.25, maxHp +10
      { id: 'extra-dough', level: 2 }, // dmgPct +0.125, dmgTakenPct -0.5
      { id: 'fast-flip', level: 1 }, // throwSpeedPct +0.25
    ];
    const s = computeStats(owned, content);
    expect(s.dmgPct).toBeCloseTo(0.375);
    expect(s.maxHp).toBe(110);
    expect(s.dmgTakenPct).toBeCloseTo(-0.5);
    expect(s.throwSpeedPct).toBeCloseTo(0.25);
    expect(s.critChance).toBe(BASE_STATS.critChance);
  });

  it('adds loadout stats on top', () => {
    const loadout: Loadout = { stats: { maxHp: 20, dmgPct: 0.5 } };
    const s = computeStats([{ id: 'strong-wrists', level: 1 }], content, loadout);
    expect(s.maxHp).toBe(125); // 100 + 20 + 5
    expect(s.dmgPct).toBeCloseTo(0.625); // 0.5 + 0.125
  });

  it('never mutates its inputs or BASE_STATS', () => {
    const owned: OwnedPassive[] = [{ id: 'strong-wrists', level: 3 }];
    const loadout: Loadout = { stats: { maxHp: 20 } };
    const before = structuredClone({ owned, loadout, content, base: BASE_STATS });
    const s = computeStats(owned, content, loadout);
    expect(s.maxHp).toBe(135);
    s.maxHp = 1; // the result is its own object, not BASE_STATS
    expect({ owned, loadout, content, base: BASE_STATS }).toEqual(before);
    expect(BASE_STATS.maxHp).toBe(100);
  });
});

describe('buffMods', () => {
  it('is all zero with no buffs', () => {
    expect(buffMods([], [dip('teh-tarik', 3), dip('ghee', 3), dip('chicken-curry', 3)], content)).toEqual(NONE);
  });

  it('haste takes throwSpeedPct from the owned teh-tarik level', () => {
    expect(buffMods([buff('haste')], [dip('teh-tarik', 2)], content)).toEqual({ ...NONE, throwSpeedPct: 0.5 });
  });

  it('spin takes projSpeedPct and critMultAdd (= critDmgPct) from the owned ghee level', () => {
    expect(buffMods([buff('spin')], [dip('ghee', 3)], content)).toEqual({ ...NONE, projSpeedPct: 0.75, critMultAdd: 1.5 });
  });

  it('stackDmg: dmgPct = stacks × pctPerStack, critAtMax only at max stacks', () => {
    const owned = [dip('chicken-curry', 1)];
    expect(buffMods([buff('stackDmg', 2)], owned, content)).toEqual({ ...NONE, dmgPct: 0.25 });
    expect(buffMods([buff('stackDmg', 4)], owned, content)).toEqual({ ...NONE, dmgPct: 0.5, critChance: 0.25 });
    expect(buffMods([buff('stackDmg', 5)], owned, content)).toEqual({ ...NONE, dmgPct: 0.625, critChance: 0.25 });
  });

  it('stackDmg reads pctPerStack and critAtMax from the owned chicken-curry level', () => {
    expect(buffMods([buff('stackDmg', 4)], [dip('chicken-curry', 2)], content)).toEqual({ ...NONE, dmgPct: 1, critChance: 0.5 });
  });

  it('buffs whose dip is not owned contribute nothing', () => {
    expect(buffMods([buff('haste'), buff('spin'), buff('stackDmg', 4)], [dip('ghee', 1)], content)).toEqual({
      ...NONE, projSpeedPct: 0.25, critMultAdd: 0.5,
    });
    expect(buffMods([buff('stackDmg', 4)], [dip('teh-tarik', 5)], content)).toEqual(NONE);
  });

  it('combines all three buffs', () => {
    const all = [dip('teh-tarik', 1), dip('ghee', 1), dip('chicken-curry', 1)];
    expect(buffMods([buff('haste'), buff('spin'), buff('stackDmg', 4)], all, content)).toEqual({
      throwSpeedPct: 0.25, projSpeedPct: 0.25, critMultAdd: 0.5, dmgPct: 0.5, critChance: 0.25,
    });
  });
});

describe('rollHit', () => {
  // Damage factor 1 + 0.5 + 0.5 = 2; crit multiplier 2 + 1 = 3; crit chance 0.25 + 0.25 = 0.5.
  const stats: PlayerStats = { ...BASE_STATS, dmgPct: 0.5, critChance: 0.25, critMult: 2 };
  const mods: BuffMods = { ...NONE, critMultAdd: 1, dmgPct: 0.5, critChance: 0.25 };

  it('non-crit: base × (1 + dmg%) × takenMul, no crit multiplier', () => {
    expect(rollHit(10, stats, mods, 0.5, stubRng(() => 0.99))).toEqual({ dmg: 10, crit: false });
  });

  it('crit: multiplier is stats.critMult + mods.critMultAdd', () => {
    expect(rollHit(10, stats, mods, 0.5, stubRng(() => 0))).toEqual({ dmg: 30, crit: true });
  });

  it('crit threshold is strict and capped at 1', () => {
    expect(rollHit(10, stats, mods, 1, stubRng(() => 0.49)).crit).toBe(true);
    expect(rollHit(10, stats, mods, 1, stubRng(() => 0.5)).crit).toBe(false);
    expect(rollHit(10, { ...stats, critChance: 3 }, NONE, 1, stubRng(() => 0.999)).crit).toBe(true);
  });

  it('draws exactly one rng number when canCrit, none otherwise', () => {
    let draws = 0;
    const counting = stubRng(() => {
      draws++;
      return 0;
    });
    rollHit(10, stats, mods, 1, counting);
    expect(draws).toBe(1);
    expect(rollHit(10, stats, mods, 1, counting, false)).toEqual({ dmg: 20, crit: false });
    expect(draws).toBe(1);
  });

  it('dmg is never below 0', () => {
    expect(rollHit(10, { ...BASE_STATS, dmgPct: -2 }, NONE, 1, stubRng(() => 0.99)).dmg).toBe(0);
  });
});

describe('xpToNext', () => {
  it('is round(5 + 3L + L²/2): 9 at level 1, 33 at level 5', () => {
    expect(xpToNext(1)).toBe(9);
    expect(xpToNext(5)).toBe(33);
  });
});

describe('waveHpScale', () => {
  const chapter = { hpPerWave: 0.25 } as ChapterDef;
  it('is 1 on wave 1 and adds hpPerWave for each later wave', () => {
    expect(waveHpScale(chapter, 1)).toBe(1);
    expect(waveHpScale(chapter, 3)).toBe(1.5);
  });
});

describe('effectiveCooldown', () => {
  it('divides by 1 + throw speed from stats and mods', () => {
    expect(effectiveCooldown(1, BASE_STATS, NONE)).toBe(1);
    expect(effectiveCooldown(1, { ...BASE_STATS, throwSpeedPct: 0.5 }, { ...NONE, throwSpeedPct: 0.5 })).toBe(0.5);
  });

  it('never goes below 0.08 s', () => {
    expect(effectiveCooldown(0.1, { ...BASE_STATS, throwSpeedPct: 1 }, NONE)).toBe(0.08);
    expect(effectiveCooldown(0.02, BASE_STATS, NONE)).toBe(0.08);
  });
});

describe('review fixes (codex-core-1)', () => {
  it('effectiveCooldown stays finite when throw speed is wiped out', () => {
    const stats = { ...BASE_STATS, throwSpeedPct: -1 };
    const zero = { throwSpeedPct: 0, projSpeedPct: 0, critMultAdd: 0, dmgPct: 0, critChance: 0 };
    expect(Number.isFinite(effectiveCooldown(1, stats, zero))).toBe(true);
    expect(effectiveCooldown(0, stats, zero)).toBe(0.08);
  });
});

describe('buffMods ignores untriggered and expired buffs (codex-core-1)', () => {
  const content = { dips: { 'teh-tarik': { levels: [{ type: 'haste', everyHits: 5, throwSpeedPct: 0.2, time: 3 }] } } } as unknown as Content;
  const dips: OwnedDip[] = [{ id: 'teh-tarik', level: 1 }];
  it('counts haste only while its timer runs', () => {
    expect(buffMods([{ id: 'haste', time: 0, stacks: 0, hitCount: 2 }], dips, content).throwSpeedPct).toBe(0);
    expect(buffMods([{ id: 'haste', time: 1.5, stacks: 0, hitCount: 0 }], dips, content).throwSpeedPct).toBeCloseTo(0.2);
  });
});
