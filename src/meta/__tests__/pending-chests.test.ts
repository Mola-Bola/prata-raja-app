import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import type { RunResult } from '../../core/types';
import { openChest } from '../chests';
import { equipItem, rollItem, upgradeItem } from '../gear';
import { freshSaveV2, parseSaveV2 } from '../migrate';
import { applyRunResult } from '../runRewards';
import { unlocksForXp } from '../stall';
import { claim } from '../streak';
import type { SaveV2 } from '../types';

const NOW = new Date('2026-10-12T00:00:00Z');
const RUN: RunResult = { won: false, wave: 3, kills: 5, bossKills: 0, time: 10, level: 1, gold: 0, breads: [], dips: [] };
const veteran = (): SaveV2 => ({ ...freshSaveV2(), stallXp: 3900, unlocks: unlocksForXp(3900), gold: 1000 });

describe('pending chests', () => {
  it('a paid run keeps its chest closed: the item is owned at once, and listed as closed', () => {
    const { save, rewards } = applyRunResult(freshSaveV2(), RUN, makeRng(1), NOW);
    expect(save.inventory.map(i => i.uid)).toEqual([rewards.chest!.uid]);
    expect(save.pendingChests).toEqual([rewards.chest!.uid]);
  });
  it('the day-7 gift chest is closed too, and days without a chest add none', () => {
    let save = freshSaveV2();
    for (let day = 1; day <= 6; day++) {
      save = claim(save, new Date(NOW.getTime() + (day - 1) * 86_400_000), 0).save;
      expect(save.pendingChests).toEqual([]);
    }
    const seventh = claim(save, new Date(NOW.getTime() + 6 * 86_400_000), 0);
    expect(seventh.rewards.chest).not.toBeNull();
    expect(seventh.save.pendingChests).toEqual([seventh.rewards.chest!.uid]);
  });
  it('opening hands back the item once, clears only that chest, and a second tap does nothing', () => {
    const one = applyRunResult(freshSaveV2(), RUN, makeRng(1), NOW).save;
    const two = applyRunResult(one, RUN, makeRng(1), NOW).save;
    const [a, b] = two.pendingChests;
    const opened = openChest(two, a);
    expect(opened.item?.uid).toBe(a);
    expect(opened.save.pendingChests).toEqual([b]);
    expect(opened.save.inventory).toBe(two.inventory);
    const again = openChest(opened.save, a);
    expect(again.item).toBeNull();
    expect(again.save).toBe(opened.save);
    expect(openChest(two, 'nope')).toEqual({ save: two, item: null });
  });
  it('an item in a closed chest cannot be worn or upgraded until it is opened', () => {
    const item = rollItem(makeRng(2), { slot: 'towel', rarity: 'common' });
    const closed = { ...veteran(), inventory: [item], pendingChests: [item.uid] };
    expect(equipItem(closed, item.uid)).toBe(closed);
    expect(upgradeItem(closed, item.uid)).toBe(closed);
    const open = openChest(closed, item.uid).save;
    expect(equipItem(open, item.uid).equipped.towel).toBe(item.uid);
    expect(upgradeItem(open, item.uid).inventory[0].level).toBe(2);
  });
  it('wearing what is already worn changes nothing', () => {
    const item = rollItem(makeRng(2), { slot: 'towel', rarity: 'common' });
    const worn = { ...veteran(), inventory: [item], equipped: { towel: item.uid } };
    expect(equipItem(worn, item.uid)).toBe(worn);
  });
  it('survives the save file; unknown, duplicate and non-string entries are dropped but no item is', () => {
    const { save } = applyRunResult(freshSaveV2(), RUN, makeRng(3), NOW);
    expect(parseSaveV2(JSON.stringify(save))).toEqual(save);
    const messy = { ...save, pendingChests: [save.pendingChests[0], save.pendingChests[0], 'gone', 7, null] };
    const parsed = parseSaveV2(JSON.stringify(messy));
    expect(parsed.pendingChests).toEqual(save.pendingChests);
    expect(parsed.inventory).toEqual(save.inventory);
  });
  it('older saves have no closed chests: a v1 save and a v2 save without the field both load with none', () => {
    expect(parseSaveV2(JSON.stringify({ v: 1, gold: 5 })).pendingChests).toEqual([]);
    const { pendingChests: _gone, ...old } = applyRunResult(freshSaveV2(), RUN, makeRng(3), NOW).save;
    const parsed = parseSaveV2(JSON.stringify(old));
    expect(parsed.pendingChests).toEqual([]);
    expect(parsed.inventory).toHaveLength(1);
  });
});
