import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import type { RunResult } from '../../core/types';
import { rollChest } from '../chests';
import { freshSaveV2 } from '../migrate';
import { applyRunResult, MIN_PAID_WAVE } from '../runRewards';
import { RARITIES, type SaveV2 } from '../types';

const NOW = new Date('2026-10-12T00:00:00Z');
const ALL_OPEN = { towel: true, headband: true, apron: true, gloves: true, slippers: true } as const;
const RUN: RunResult = { won: false, wave: 1, kills: 5, bossKills: 0, time: 10, level: 1, gold: 999, breads: [], dips: [] };
describe('chests', () => {
  it('guarantees every fifth Rare+ and every twentieth Epic+, over multiple cycles', () => {
    let pity = freshSaveV2().chestPity; const rng = makeRng(5);
    for (let n = 1; n <= 80; n++) {
      const roll = rollChest(rng, pity, 'common', ALL_OPEN); pity = roll.pity;
      if (n % 5 === 0) expect(RARITIES.indexOf(roll.item.rarity)).toBeGreaterThanOrEqual(2);
      if (n % 20 === 0) expect(RARITIES.indexOf(roll.item.rarity)).toBeGreaterThanOrEqual(3);
      expect(pity).toEqual({ rare: n % 5, epic: n % 20, opened: n });
    }
  });
  it('preserves an explicit minimum and honours fifth-chest pity with Uncommon minimum', () => {
    expect(RARITIES.indexOf(rollChest(makeRng(1), { rare: 4, epic: 4, opened: 4 }, 'uncommon', ALL_OPEN).item.rarity)).toBeGreaterThanOrEqual(2);
    expect(RARITIES.indexOf(rollChest(makeRng(1), { rare: 4, epic: 19, opened: 19 }, 'raja', ALL_OPEN).item.rarity)).toBe(5);
  });
  it('is deterministic and does not mutate pity', () => {
    const pity = { rare: 4, epic: 19, opened: 19 };
    expect(rollChest(makeRng(1), pity, 'common', ALL_OPEN)).toEqual(rollChest(makeRng(1), pity, 'common', ALL_OPEN));
    expect(pity).toEqual({ rare: 4, epic: 19, opened: 19 });
  });
});
describe('run rewards', () => {
  it.each([
    { won: false, wave: 2, bossKills: 0, gold: 0, pays: 32, xp: 50 }, // wave 1 cleared
    { won: false, wave: 5, bossKills: 0, gold: 37, pays: 105, xp: 80 }, // 68 for the waves + 37 picked up
    { won: false, wave: 6, bossKills: 0, gold: 0, pays: 80, xp: 90 },
    { won: true, wave: 10, bossKills: 1, gold: 207, pays: 407, xp: 190 }, // 200 for the run + 207 picked up (50 win bonus included)
  ])('pays wave $wave, won=$won: the waves plus the run\'s own coins', ({ pays, xp, gold, ...result }) => {
    const applied = applyRunResult(freshSaveV2(), { ...RUN, ...result, gold }, makeRng(1), NOW);
    expect(applied.rewards).toMatchObject({ paid: true, gold: pays, stallXp: xp });
    expect(applied.save.gold).toBe(pays); expect(applied.save.stallXp).toBe(xp);
    expect(applied.save.inventory).toHaveLength(1);
  });
  it.each([[-5, 0], [Number.NaN, 0], [Infinity, 0], [12.9, 12], [0, 0]])('counts in-run coins of %s as %s (never negative, never fractional)', (gold, tips) => {
    expect(applyRunResult(freshSaveV2(), { ...RUN, wave: 3, gold }, makeRng(1), NOW).rewards.gold).toBe(20 + 12 * 2 + tips);
  });
  it.each([0, 1])('pays nothing for a run that ended on wave %i: no coins, XP, chest or ingredients, and no dice rolled', wave => {
    const save: SaveV2 = { ...freshSaveV2(), gold: 40, stallXp: 100, materials: { ...freshSaveV2().materials, egg: 2 }, chestPity: { rare: 3, epic: 7, opened: 9 } };
    const rng = makeRng(1);
    const state = rng.state;
    const before = JSON.stringify(save);
    const applied = applyRunResult(save, { ...RUN, wave, won: false, kills: 5, gold: 999 }, rng, NOW);
    expect(applied.rewards).toEqual({ paid: false, gold: 0, stallXp: 0, kannanXp: 0, chest: null, materials: {}, dipReceipts: [] });
    expect(applied.save).toMatchObject({ gold: 40, stallXp: 100, materials: save.materials, chestPity: save.chestPity, pendingChests: [], inventory: [], unlocks: save.unlocks });
    expect(rng.state).toBe(state);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('still counts a too-short run in the records (runs, kills, best wave, last played) and starts the idle clock', () => {
    const applied = applyRunResult(freshSaveV2(), { ...RUN, wave: 1, kills: 5 }, makeRng(1), NOW);
    expect(applied.save).toMatchObject({ runs: 1, wins: 0, totalKills: 5, bestWave: 1, lastPlayed: NOW.toISOString(), idle: { lastCollectedAt: NOW.toISOString() } });
  });
  it('wave 2 is the first that pays', () => {
    expect(applyRunResult(freshSaveV2(), { ...RUN, wave: 1 }, makeRng(1), NOW).rewards.paid).toBe(false);
    expect(applyRunResult(freshSaveV2(), { ...RUN, wave: 2 }, makeRng(1), NOW).rewards.paid).toBe(true);
    expect(MIN_PAID_WAVE).toBe(2);
  });
  it('pays materials from kills, deterministically, and banks them', () => {
    const run = { ...RUN, wave: 6, kills: 600, bossKills: 1 };
    const a = applyRunResult(freshSaveV2(), run, makeRng(2), NOW);
    expect(a).toEqual(applyRunResult(freshSaveV2(), run, makeRng(2), NOW));
    expect(Object.values(a.rewards.materials).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
    for (const [m, n] of Object.entries(a.rewards.materials)) expect(a.save.materials[m as keyof typeof a.save.materials]).toBe(n);
  });
  it('updates v1 totals, materials, pity, unlocks and idle baseline without mutation', () => {
    const save = freshSaveV2(); save.gold = 10; save.materials.flour = 2; save.stallXp = 140;
    const before = JSON.stringify(save);
    const win = { ...RUN, wave: 10, bossKills: 1, won: true, gold: 207 };
    const a = applyRunResult(save, win, makeRng(3), NOW);
    expect(a).toEqual(applyRunResult(save, win, makeRng(3), NOW));
    expect(a.save).toMatchObject({ runs: 1, wins: 1, totalKills: 5, bestWave: 10, gold: 417, stallXp: 330, lastPlayed: NOW.toISOString(), chestPity: { opened: 1 }, unlocks: { gear: true, towel: true }, idle: { lastCollectedAt: NOW.toISOString() } });
    for (const [type, amount] of Object.entries(a.rewards.materials)) expect(a.save.materials[type as keyof typeof save.materials]).toBe(save.materials[type as keyof typeof save.materials] + amount);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('keeps existing idle time and best wave and gives unique IDs with repeated seeds', () => {
    const save = freshSaveV2(); save.bestWave = 20; save.idle.lastCollectedAt = '2026-10-10T00:00:00.000Z';
    const paid = { ...RUN, wave: 2 };
    const first = applyRunResult(save, paid, makeRng(1), NOW).save;
    const second = applyRunResult(first, paid, makeRng(1), NOW).save;
    expect(second.bestWave).toBe(20); expect(second.idle).toEqual(save.idle);
    expect(new Set(second.inventory.map(i => i.uid)).size).toBe(2);
    expect(second.runs).toBe(2); expect(second.wins).toBe(0);
  });
});
