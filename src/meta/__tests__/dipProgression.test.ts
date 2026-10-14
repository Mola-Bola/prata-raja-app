import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { makeRng } from '../../core/rng';
import type { RunResult } from '../../core/types';
import { dipCollection } from '../dipProgression';
import { computeLoadout } from '../loadout';
import { freshSaveV2, parseSaveV2 } from '../migrate';
import { applyRunResult } from '../runRewards';

const NOW = new Date('2026-10-14T00:00:00Z');
const run: RunResult = { won: false, wave: 2, kills: 4, bossKills: 0, time: 800, level: 2, gold: 0,
  breads: [{ id: 'roti-bomb', level: 1, cd: 0, volleyLeft: 0, volleyT: 0 }],
  dips: [{ id: 'fish-curry', level: 1, linkedBread: 'roti-bomb' }, { id: 'mint-chutney', level: 1, linkedBread: 'roti-bomb' }],
  dipUseXp: { 'fish-curry': 54, 'mint-chutney': 1 },
};
const pay = (result = run, save = freshSaveV2()) => applyRunResult(save, result, makeRng(1), NOW);

describe('dip persistence and payouts', () => {
  it('old V1 and V2 saves default to an empty map while preserving their records and unlocks', () => {
    const v2 = { ...freshSaveV2(), runs: 15, totalKills: 100, gold: 50, unlockedDips: ['sambal'] };
    const { dipXp: _xp, ...legacy } = v2;
    expect(parseSaveV2(JSON.stringify(legacy))).toEqual({ ...v2, dipXp: {} });
    const old = parseSaveV2(JSON.stringify({ v: 1, runs: 4, bestWave: 4, gold: 27, settings: { sfx: false, music: false, haptics: true } }));
    expect(old).toMatchObject({ v: 2, runs: 4, bestWave: 4, gold: 27, dipXp: {}, settings: { sfx: false, music: false, haptics: true } });
  });

  it('recovers partial corruption per entry, floors/caps XP, and never creates availability from progress', () => {
    const save = parseSaveV2(JSON.stringify({ ...freshSaveV2(), dipXp: { 'fish-curry': 90.9, 'mint-chutney': -1, 'condensed-milk': 5000, sambal: 100, unknown: 60 } }));
    expect(save.dipXp).toEqual({ 'fish-curry': 90, 'condensed-milk': 2470 });
    expect(dipCollection(save, CONTENT).find(r => r.dip.id === 'sambal')?.available).toBe(false);
    for (const value of ['100', null, [], {}]) {
      expect(parseSaveV2(JSON.stringify({ ...save, dipXp: { 'fish-curry': value, 'mint-chutney': 40 } })).dipXp).toEqual({ 'mint-chutney': 40 });
    }
  });

  it.each([false, true])('paid won=%s uses the actual map and yields exact receipts, without changing RNG draws', won => {
    const paid = pay({ ...run, won });
    expect(paid.save.dipXp).toEqual({ 'fish-curry': 54, 'mint-chutney': 1 });
    expect(paid.rewards.dipReceipts).toEqual([
      { id: 'fish-curry', gained: 54, beforeXp: 0, afterXp: 54, beforeLevel: 1, afterLevel: 2 },
      { id: 'mint-chutney', gained: 1, beforeXp: 0, afterXp: 1, beforeLevel: 1, afterLevel: 1 },
    ]);
    const a = makeRng(1); const b = makeRng(1);
    applyRunResult(freshSaveV2(), { ...run, won }, a, NOW);
    applyRunResult(freshSaveV2(), { ...run, won, dipUseXp: undefined }, b, NOW);
    expect(a.state).toBe(b.state);
  });

  it('early exit, missing map, invalid XP, absent ownership and mismatched links pay no dip XP', () => {
    const fixtures: RunResult[] = [
      { ...run, wave: 1 }, { ...run, dipUseXp: undefined }, { ...run, dipUseXp: { 'fish-curry': NaN, 'mint-chutney': -1 } },
      { ...run, dips: [] }, { ...run, breads: [] },
      { ...run, dips: [{ id: 'fish-curry', level: 1, linkedBread: 'kosong' }] },
      { ...run, dips: [{ id: 'fish-curry', level: 1 }] },
    ];
    for (const fixture of fixtures) {
      expect(pay(fixture).save.dipXp).toEqual({}); expect(pay(fixture).rewards.dipReceipts).toEqual([]);
    }
  });

  it('validates final evolution family, caps reported run XP and stops at lifetime cap', () => {
    const evolved = { ...run, breads: [{ ...run.breads[0], id: 'inferno-bomb' as const }], dipUseXp: { 'fish-curry': 9000 } };
    expect(pay(evolved).save.dipXp).toEqual({ 'fish-curry': 120 });
    const save = { ...freshSaveV2(), dipXp: { 'fish-curry': 2469 } };
    const next = pay(evolved, save);
    expect(next.save.dipXp['fish-curry']).toBe(2470);
    expect(next.rewards.dipReceipts[0]).toMatchObject({ gained: 1, beforeLevel: 19, afterLevel: 20 });
    expect(pay(evolved, next.save).rewards.dipReceipts).toEqual([]);
  });

  it('a late pickup with one actual hit earns one, never its elapsed run time, and benefits only next loadout', () => {
    const save = { ...freshSaveV2(), dipXp: { 'fish-curry': 39 } };
    const loadout = computeLoadout(save, CONTENT);
    const after = pay({ ...run, dipUseXp: { 'fish-curry': 1 } }, save);
    expect(after.rewards.dipReceipts[0].gained).toBe(1);
    expect(loadout.dipSimmer?.['fish-curry']).toBe(1);
    expect(computeLoadout(after.save, CONTENT).dipSimmer?.['fish-curry']).toBe(2);
    expect(save.dipXp['fish-curry']).toBe(39);
  });
});
