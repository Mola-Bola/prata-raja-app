import { describe, expect, it } from 'vitest';
import { makeRng } from '@/core/rng';
import { GEAR_BASES, rollItem } from '@/meta/gear';
import { freshSaveV2 } from '@/meta/migrate';
import { STREAK_REWARDS } from '@/meta/streak';
import { UNLOCK_TABLE, unlocksForXp } from '@/meta/stall';
import { giftLabel, HOTSPOTS, mergeCandidates, mergeGear, newUnlocks, progress, statLines, titleCase, unlockLevel, UNLOCK_NAMES } from '../helpers';

describe('stall display helpers', () => {
  it('keeps seven tuneable hotspots within the scene', () => {
    expect(Object.keys(HOTSPOTS)).toHaveLength(7);
    for (const spot of Object.values(HOTSPOTS)) {
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.x).toBeLessThan(100);
      expect(spot.y).toBeGreaterThan(0);
      expect(spot.y).toBeLessThan(100);
      expect(spot.label.split(/\s+/).length).toBeLessThanOrEqual(8);
    }
  });
  it('uses the XP threshold of the current level', () => {
    expect(progress(0)).toEqual({ level: 1, fraction: 0, label: 'Next: Gear in 150 XP' });
    expect(progress(75).fraction).toBe(.5);
    expect(progress(150)).toEqual({ level: 2, fraction: 0, label: 'Next: Training in 200 XP' });
    expect(progress(250).fraction).toBe(.5);
    expect(progress(3900)).toEqual({ level: 10, fraction: 1, label: 'Stall growing strong' });
    expect(progress(9999).fraction).toBe(1);
  });
  it('reads lock levels and unlock banners from the table', () => {
    const before = freshSaveV2();
    const after = { ...before, stallXp: 350, unlocks: unlocksForXp(350) };
    expect(newUnlocks(before, after)).toEqual(['Gear', 'Towel', 'Training', 'Headband']);
    expect(newUnlocks(after, after)).toEqual([]);
    for (const row of UNLOCK_TABLE) for (const flag of row.flags) expect(unlockLevel(flag)).toBe(row.level);
    for (const name of Object.values(UNLOCK_NAMES)) expect(name.split(/\s+/).length).toBeLessThanOrEqual(8);
  });
  it('formats percentage and flat stats without rounding away small bonuses', () => {
    expect(statLines({ critChance: .026, maxHp: 5, dmgTakenPct: -.03, regen: .2, moveSpeed: 12 })).toEqual([
      'Crit chance +2.6%', 'HP +5', 'Damage taken -3%', 'HP/s +0.2', 'Move speed +12',
    ]);
  });
  it('requires three distinct matching items and respects the Rare cap', () => {
    const save = freshSaveV2();
    const rng = makeRng(12);
    const a = rollItem(rng, { baseId: 'plain-headband', rarity: 'common' });
    const b = { ...a, uid: 'b' }, c = { ...a, uid: 'c' };
    save.inventory = [a, b];
    expect(mergeCandidates(save, a)).toEqual([]);
    save.inventory.push(c);
    expect(mergeCandidates(save, b).map(i => i.uid)).toEqual(['b', a.uid, 'c']);
    expect(mergeCandidates(save, { ...a, uid: 'unowned' })).toEqual([]);
    expect(mergeCandidates(save, { ...a, rarity: 'rare' })).toEqual([]);
    expect(mergeCandidates(save, { ...a, baseId: 'cotton-apron' })).toEqual([]);
  });
  it('gives all daily rewards and item names short labels', () => {
    expect(STREAK_REWARDS.map(giftLabel)).toEqual(['50 coins', 'Reroll token', '1 ingredient', '80 coins', 'Training token', '2 ingredients', 'Rare+ chest']);
    for (const name of Object.keys(GEAR_BASES).map(titleCase)) expect(name.split(/\s+/).length).toBeLessThanOrEqual(8);
  });
  it('merges owned gear without leaving a dangling equipped item', () => {
    const save = freshSaveV2();
    const a = rollItem(makeRng(1), { baseId: 'plain-headband', rarity: 'common' });
    const unrelated = rollItem(makeRng(2), { baseId: 'cotton-apron', rarity: 'common' });
    save.inventory = [a, { ...a, uid: 'b', level: 2 }, { ...a, uid: 'c' }, unrelated];
    save.equipped = { headband: 'b', apron: unrelated.uid };
    expect(mergeGear(save, a, makeRng(3))).toBe(save);
    save.unlocks.gear = true;
    const next = mergeGear(save, a, makeRng(3));
    expect(next.inventory).toHaveLength(2);
    expect(next.inventory[1].rarity).toBe('uncommon');
    expect(next.inventory[1].level).toBe(1);
    expect(next.equipped).toEqual({ headband: next.inventory[1].uid, apron: unrelated.uid });
    expect(save.inventory).toHaveLength(4);
    expect(next.gold).toBe(save.gold);
  });
});
