import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import { BASE_STATS } from '../../core/stats';
import { AFFIX_POOLS, dropSlots, equipItem, GEAR_BASES, itemStats, merge3, RARITY_INFO, rollItem, upgradeCost, upgradeItem } from '../gear';
import { rollChest } from '../chests';
import { applyRunResult } from '../runRewards';
import type { RunResult } from '../../core/types';
import { freshSaveV2 } from '../migrate';
import { RARITIES, SLOTS } from '../types';

describe('gear', () => {
  it('contains the fifteen content bases, three per slot', () => {
    expect(Object.keys(GEAR_BASES)).toHaveLength(15);
    for (const slot of SLOTS) expect(Object.values(GEAR_BASES).filter(s => s === slot)).toHaveLength(3);
  });
  it('matches all content rarity values', () => {
    expect(RARITIES.map(r => RARITY_INFO[r].multiplier)).toEqual([1, 1.3, 1.7, 2.2, 3, 4.5]);
    expect(RARITIES.map(r => RARITY_INFO[r].weight)).toEqual([600, 250, 100, 40, 9, 1]);
    expect(RARITIES.map(r => RARITY_INFO[r].affixes)).toEqual([0, 0, 1, 2, 3, 4]);
    expect(RARITIES.map(r => RARITY_INFO[r].color)).toEqual(['#9CA3AF', '#4ADE80', '#60A5FA', '#C084FC', '#FB923C', '#FACC15']);
  });
  it.each(RARITIES)('%s rolls the correct number of distinct slot affixes', rarity => {
    for (const slot of SLOTS) {
      const item = rollItem(makeRng(12), { slot, rarity, source: 'chest' });
      expect(item.affixes).toHaveLength(RARITY_INFO[rarity].affixes);
      expect(new Set(item.affixes.map(a => a.id)).size).toBe(item.affixes.length);
      expect(item.affixes.every(a => AFFIX_POOLS[slot].some(p => p.id === a.id))).toBe(true);
      expect(item.slot).toBe(GEAR_BASES[item.baseId]);
    }
  });
  it('replays exactly with a seeded RNG', () => {
    expect(rollItem(makeRng(1), { source: 'chest' })).toEqual(rollItem(makeRng(1), { source: 'chest' }));
  });
  it('keeps ordinary drops below Epic, but permits boss and chest Epic+', () => {
    const rng = makeRng(8);
    for (let i = 0; i < 1000; i++) expect(RARITIES.indexOf(rollItem(rng).rarity)).toBeLessThan(3);
    expect(() => rollItem(rng, { rarity: 'epic' })).toThrow();
    expect(() => rollItem(rng, { minRarity: 'epic' })).toThrow();
    for (const source of ['boss', 'chest'] as const) expect(rollItem(rng, { source, rarity: 'raja' }).rarity).toBe('raja');
  });
  it('rejects conflicting roll constraints', () => {
    expect(() => rollItem(makeRng(1), { baseId: 'cotton-apron', slot: 'towel' })).toThrow();
    expect(() => rollItem(makeRng(1), { rarity: 'common', minRarity: 'rare' })).toThrow();
  });
  it.each(['common', 'uncommon'] as const)('merges three %s into the next tier', rarity => {
    const rng = makeRng(4);
    const items = Array.from({ length: 3 }, (_, i) => ({ ...rollItem(rng, { baseId: 'cotton-apron', rarity }), level: i + 2 }));
    const before = JSON.stringify(items);
    const item = merge3(items, rng)!;
    expect(item).toMatchObject({ baseId: 'cotton-apron', slot: 'apron', level: 2, rarity: rarity === 'common' ? 'uncommon' : 'rare' });
    expect(item.affixes).toHaveLength(rarity === 'common' ? 0 : 1);
    expect(items.some(i => i.uid === item.uid)).toBe(false);
    expect(JSON.stringify(items)).toBe(before);
  });
  it('rejects missing, reused, mismatched and Rare+ merge inputs', () => {
    const rng = makeRng(1);
    const a = rollItem(rng, { baseId: 'cotton-apron', rarity: 'common' });
    const b = { ...a, uid: 'b' };
    const c = { ...a, uid: 'c' };
    expect(merge3([], rng)).toBeNull();
    expect(merge3([a, b], rng)).toBeNull();
    expect(merge3([a, a, a], rng)).toBeNull();
    expect(merge3([a, b, { ...c, baseId: 'denim-apron' }], rng)).toBeNull();
    expect(merge3([a, b, { ...c, rarity: 'uncommon' }], rng)).toBeNull();
    for (const rarity of RARITIES.slice(2)) expect(merge3([a, b, c].map(i => ({ ...i, rarity })), rng)).toBeNull();
  });
  it.each(SLOTS)('%s has the specified Common L1 main stat', slot => {
    const expected = { towel: { critChance: .02 }, headband: { dmgPct: .03 }, apron: { maxHp: 5 }, gloves: { throwSpeedPct: .03 }, slippers: { moveSpeed: BASE_STATS.moveSpeed * .03 } };
    expect(itemStats(rollItem(makeRng(1), { slot, rarity: 'common' }))).toEqual(expected[slot]);
  });
  it('scales the main stat by rarity and +10% per extra level and adds affixes', () => {
    const item = rollItem(makeRng(1), { slot: 'apron', rarity: 'rare' });
    item.level = 3;
    const expected = { maxHp: 5 * 1.7 * 1.2 };
    const a = item.affixes[0];
    expect(itemStats(item)[a.stat]).toBeCloseTo((a.stat === 'maxHp' ? expected.maxHp : 0) + a.value);
    if (a.stat !== 'maxHp') expect(itemStats(item).maxHp).toBeCloseTo(expected.maxHp);
  });
  it('charges increasing coin costs without changing the original item', () => {
    expect([1, 2, 3, 4].map(level => upgradeCost({ level }))).toEqual([40, 60, 90, 135]);
    const save = freshSaveV2();
    const item = rollItem(makeRng(1), { rarity: 'common' });
    save.inventory = [item]; save.gold = 40; save.unlocks.gear = true;
    const next = upgradeItem(save, item.uid);
    expect(next.gold).toBe(0); expect(next.inventory[0].level).toBe(2);
    expect(save.inventory[0].level).toBe(1); expect(save.gold).toBe(40);
    expect(upgradeItem(next, item.uid)).toBe(next);
    expect(upgradeItem(save, 'missing')).toBe(save);
    expect(upgradeItem({ ...save, unlocks: {} }, item.uid)).toMatchObject({ gold: 40 });
  });
  it('equips an owned item only when the rack is open; an item above the stall level is still wearable', () => {
    const item = rollItem(makeRng(1), { slot: 'slippers', rarity: 'common' });
    const save = { ...freshSaveV2(), inventory: [item], unlocks: { gear: true } };
    expect(equipItem({ ...save, unlocks: {} }, item.uid)).toEqual({ ...save, unlocks: {} });
    const equipped = equipItem(save, item.uid);
    expect(equipped.equipped).toEqual({ slippers: item.uid });
    expect(equipItem(equipped, 'missing')).toBe(equipped);
    expect(equipItem({ ...freshSaveV2(), inventory: [item], unlocks: { gear: true }, pendingChests: [item.uid] }, item.uid).equipped).toEqual({});
  });
  it('never rolls a gear drop in a slot the player cannot wear yet', () => {
    expect(dropSlots({ gear: true, towel: true, headband: true })).toEqual(['towel', 'headband']);
    expect(dropSlots({})).toEqual(['towel']);
    const rng = makeRng(21);
    const open = { gear: true, towel: true, headband: true } as const;
    for (let i = 0; i < 300; i++) expect(['towel', 'headband']).toContain(rollChest(rng, freshSaveV2().chestPity, 'common', open).item.slot);
  });
  it('a run at stall level 1 only drops towel gear, and a run that levels the stall widens the pool', () => {
    const run = (stallXp: number, seed: number) => {
      const save = { ...freshSaveV2(), stallXp };
      return applyRunResult(save, { won: false, wave: 4, kills: 5, bossKills: 0, time: 10, level: 1, gold: 0, breads: [], dips: [] } as RunResult, makeRng(seed), new Date('2026-10-12T00:00:00Z')).rewards.chest!;
    };
    for (let seed = 1; seed <= 200; seed++) expect(run(0, seed).slot).toBe('towel');
    // 1300 XP is stall level 6: towel, headband, apron and gloves are open at drop time; slippers (level 7) is not.
    const slots = new Set(Array.from({ length: 400 }, (_, seed) => run(1300, seed + 1).slot));
    expect([...slots].sort()).toEqual(['apron', 'gloves', 'headband', 'towel']);
  });
});
