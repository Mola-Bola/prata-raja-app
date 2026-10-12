import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import type { RunResult } from '../../core/types';
import { rollChest } from '../chests';
import { freshSaveV2 } from '../migrate';
import { applyRunResult } from '../runRewards';
import { RARITIES } from '../types';

const NOW = new Date('2026-10-12T00:00:00Z');
const RUN: RunResult = { won: false, wave: 1, kills: 5, bossKills: 0, time: 10, level: 1, gold: 999, breads: [], dips: [] };
describe('chests', () => {
  it('guarantees every fifth Rare+ and every twentieth Epic+, over multiple cycles', () => {
    let pity = freshSaveV2().chestPity; const rng = makeRng(5);
    for (let n = 1; n <= 80; n++) {
      const roll = rollChest(rng, pity); pity = roll.pity;
      if (n % 5 === 0) expect(RARITIES.indexOf(roll.item.rarity)).toBeGreaterThanOrEqual(2);
      if (n % 20 === 0) expect(RARITIES.indexOf(roll.item.rarity)).toBeGreaterThanOrEqual(3);
      expect(pity).toEqual({ rare: n % 5, epic: n % 20, opened: n });
    }
  });
  it('preserves an explicit minimum and honours fifth-chest pity with Uncommon minimum', () => {
    expect(RARITIES.indexOf(rollChest(makeRng(1), { rare: 4, epic: 4, opened: 4 }, 'uncommon').item.rarity)).toBeGreaterThanOrEqual(2);
    expect(RARITIES.indexOf(rollChest(makeRng(1), { rare: 4, epic: 19, opened: 19 }, 'raja').item.rarity)).toBe(5);
  });
  it('is deterministic and does not mutate pity', () => {
    const pity = { rare: 4, epic: 19, opened: 19 };
    expect(rollChest(makeRng(1), pity)).toEqual(rollChest(makeRng(1), pity));
    expect(pity).toEqual({ rare: 4, epic: 19, opened: 19 });
  });
});
describe('run rewards', () => {
  it.each([
    { won: false, wave: 1, bossKills: 0, gold: 20, xp: 40 },
    { won: false, wave: 5, bossKills: 0, gold: 68, xp: 80 },
    { won: false, wave: 6, bossKills: 0, gold: 80, xp: 90 },
    { won: true, wave: 10, bossKills: 1, gold: 200, xp: 190 },
  ])('pays wave $wave, won=$won with no double-counting result.gold', ({ gold, xp, ...result }) => {
    const applied = applyRunResult(freshSaveV2(), { ...RUN, ...result }, makeRng(1), NOW);
    expect(applied.rewards.gold).toBe(gold); expect(applied.rewards.stallXp).toBe(xp);
    expect(applied.save.gold).toBe(gold); expect(applied.save.stallXp).toBe(xp);
    expect(applied.save.inventory).toHaveLength(1);
  });
  it.each([0, 4, 5, 9, 10, 15])('grants two material units per five survived waves (%i)', waves => {
    const { rewards } = applyRunResult(freshSaveV2(), { ...RUN, wave: waves + 1 }, makeRng(2), NOW);
    expect(Object.values(rewards.materials).reduce((a, b) => a + b, 0)).toBe(Math.floor(waves / 5) * 2);
    if (waves === 5) expect(Object.keys(rewards.materials)).toHaveLength(2);
  });
  it('updates v1 totals, materials, pity, unlocks and idle baseline without mutation', () => {
    const save = freshSaveV2(); save.gold = 10; save.materials.flour = 2; save.stallXp = 140;
    const before = JSON.stringify(save);
    const a = applyRunResult(save, { ...RUN, wave: 10, bossKills: 1, won: true }, makeRng(3), NOW);
    expect(a).toEqual(applyRunResult(save, { ...RUN, wave: 10, bossKills: 1, won: true }, makeRng(3), NOW));
    expect(a.save).toMatchObject({ runs: 1, wins: 1, totalKills: 5, bestWave: 10, gold: 210, stallXp: 330, lastPlayed: NOW.toISOString(), chestPity: { opened: 1 }, unlocks: { gear: true, towel: true }, idle: { lastCollectedAt: NOW.toISOString() } });
    for (const [type, amount] of Object.entries(a.rewards.materials)) expect(a.save.materials[type as keyof typeof save.materials]).toBe(save.materials[type as keyof typeof save.materials] + amount);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('keeps existing idle time and best wave and gives unique IDs with repeated seeds', () => {
    const save = freshSaveV2(); save.bestWave = 20; save.idle.lastCollectedAt = '2026-10-10T00:00:00.000Z';
    const first = applyRunResult(save, RUN, makeRng(1), NOW).save;
    const second = applyRunResult(first, RUN, makeRng(1), NOW).save;
    expect(second.bestWave).toBe(20); expect(second.idle).toEqual(save.idle);
    expect(new Set(second.inventory.map(i => i.uid)).size).toBe(2);
    expect(second.runs).toBe(2); expect(second.wins).toBe(0);
  });
});
