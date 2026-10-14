import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import { rollItem } from '../gear';
import { kannanLevel, xpForLevel } from '../kannan';
import { freshSaveV2, parseSaveV3 } from '../migrate';
import { applyRunResult } from '../runRewards';
import { stallLevel } from '../stall';
import type { SaveV2 } from '../types';

const v2 = (): SaveV2 => {
  const item = rollItem(makeRng(7), { rarity: 'rare' });
  return {
    ...freshSaveV2(), prologueSeen: true, gold: 1234, runs: 9, wins: 4, bestWave: 10, totalKills: 400, stallXp: 1500,
    bossAttempts: { 'kopitiam-street': 5 }, inventory: [item], equipped: { [item.slot]: item.uid },
    materials: { flour: 3, ghee: 1, egg: 0, onion: 2, masala: 0, chilli: 0, curryLeaves: 0, sugar: 0, milk: 4 },
    training: { wrist: 2, stamina: 1, flip: 0 }, pendingChests: [item.uid],
  };
};

describe('save v2 -> v3', () => {
  const old = v2();
  const migrated = parseSaveV3(JSON.stringify(old));
  it('keeps every v2 field', () => {
    const { v, ...rest } = old;
    expect(v).toBe(2);
    expect(migrated).toMatchObject(JSON.parse(JSON.stringify(rest)));
    expect(migrated.v).toBe(3);
    expect(migrated.stall).toEqual({ parts: {} });
  });
  it('seeds beats from progress already made', () => {
    expect(migrated.beats).toEqual(['prologue', 'kopitiam-street-done']);
    expect(parseSaveV3(JSON.stringify(freshSaveV2())).beats).toEqual([]);
  });
  it('never drops the level', () => {
    expect(migrated.kannanXp).toBe(old.stallXp);
    expect(kannanLevel(migrated.kannanXp)).toBeGreaterThanOrEqual(stallLevel(old.stallXp));
    for (const xp of [0, 149, 150, 3900, 99999]) expect(kannanLevel(xp)).toBeGreaterThanOrEqual(stallLevel(xp));
    expect(kannanLevel(xpForLevel(12))).toBe(12);
  });
  it('is a no-op the second time', () => {
    expect(parseSaveV3(JSON.stringify(migrated))).toEqual(migrated);
  });
  it('garbage becomes a fresh v3', () => {
    expect(parseSaveV3('nope').v).toBe(3);
    expect(parseSaveV3(null).kannanXp).toBe(0);
  });
  it('a paid run banks kannanXp on a v3 save and keeps paying stall XP', () => {
    const r = applyRunResult(migrated, { wave: 5, won: false, kills: 40, gold: 0, bossKills: 0, time: 0, level: 1, breads: [], dips: [] }, makeRng(1), new Date(0));
    expect(r.rewards.kannanXp).toBe(40 + 10 * 4 + 10);
    expect(r.save.kannanXp).toBe(migrated.kannanXp + r.rewards.kannanXp);
    expect(r.save.stallXp).toBeGreaterThan(migrated.stallXp);
  });
});
