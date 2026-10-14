import { describe, expect, it } from 'vitest';

import { makeRng } from '@/core/rng';
import { GEAR_BASES, rollItem } from '@/meta/gear';
import { collect } from '@/meta/idle';
import { freshSaveV2 } from '@/meta/migrate';
import { LEVEL_THRESHOLDS, UNLOCK_TABLE, unlocksForXp } from '@/meta/stall';
import { STREAK_REWARDS } from '@/meta/streak';
import { RARITIES, type SaveV2 } from '@/meta/types';

import { chestArt, evolutionRecipes, giftLabel, HOTSPOTS, mergeCandidates, mergeGear, newUnlocks, PANELS, pityLines, progress, rackItems, readyBadges, statLines, titleCase, unlockBeat, UNLOCK_NAMES } from '../helpers';

const NOW = new Date('2026-10-12T04:00:00Z');
const veteran = (): SaveV2 => ({ ...freshSaveV2(), stallXp: 3900, unlocks: unlocksForXp(3900), idle: { lastCollectedAt: NOW.toISOString() } });

describe('stall display helpers', () => {
  it('keeps seven hotspots whose prop boxes sit inside the scene picture and do not overlap', () => {
    expect(PANELS).toHaveLength(7);
    const boxes = PANELS.map((id) => HOTSPOTS[id].box);
    for (const [id, spot] of Object.entries(HOTSPOTS)) {
      const { x, y, w, h } = spot.box;
      expect(x, id).toBeGreaterThanOrEqual(0);
      expect(y, id).toBeGreaterThanOrEqual(0);
      expect(x + w, id).toBeLessThanOrEqual(100);
      expect(y + h, id).toBeLessThanOrEqual(100);
      expect(spot.label.split(/\s+/).length).toBeLessThanOrEqual(8);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${PANELS[i]} vs ${PANELS[j]}`).toBe(false);
      }
    }
  });

  it('puts each label against the screen edge its prop hugs, so a pill never runs off a narrow phone', () => {
    for (const [id, { side, box }] of Object.entries(HOTSPOTS)) {
      const centre = box.x + box.w / 2;
      expect(side, id).toBe(centre < 35 ? 'left' : centre > 65 ? 'right' : 'center');
    }
  });

  it('uses the XP threshold of the current level', () => {
    expect(progress(0)).toEqual({ level: 1, fraction: 0, label: 'Next: Gear in 150 XP' });
    expect(progress(75).fraction).toBe(0.5);
    expect(progress(150)).toEqual({ level: 2, fraction: 0, label: 'Next: Training in 200 XP' });
    expect(progress(250).fraction).toBe(0.5);
    expect(progress(3900)).toEqual({ level: 10, fraction: 1, label: 'Stall growing strong' });
    expect(progress(9999).fraction).toBe(1);
  });

  it('names the next unlock and the XP still needed at every level threshold', () => {
    for (const row of UNLOCK_TABLE) {
      const xp = LEVEL_THRESHOLDS[row.level - 1];
      expect(progress(xp - 1).label).toBe(`Next: ${UNLOCK_NAMES[row.flags[0]]} in 1 XP`);
    }
  });

  it('reads lock levels and unlock banners from the table', () => {
    const before = freshSaveV2();
    const after = { ...before, stallXp: 350, unlocks: unlocksForXp(350) };
    expect(newUnlocks(before, after)).toEqual(['Gear', 'Towel', 'Training', 'Headband']);
    expect(newUnlocks(after, after)).toEqual([]);
    for (const row of UNLOCK_TABLE) for (const flag of row.flags) expect(unlockBeat(flag)).not.toBe('');
    for (const name of Object.values(UNLOCK_NAMES)) expect(name.split(/\s+/).length).toBeLessThanOrEqual(8);
  });

  it('formats percentage and flat stats without rounding away small bonuses', () => {
    expect(statLines({ critChance: 0.026, maxHp: 5, dmgTakenPct: -0.03, regen: 0.2, moveSpeed: 12 })).toEqual([
      'Crit chance +2.6%', 'HP +5', 'Damage taken -3%', 'HP/s +0.2', 'Move speed +12',
    ]);
  });

  it('requires three distinct matching items and respects the Rare cap', () => {
    const save = freshSaveV2();
    const rng = makeRng(12);
    const a = rollItem(rng, { baseId: 'plain-headband', rarity: 'common' });
    const b = { ...a, uid: 'b' };
    const c = { ...a, uid: 'c' };
    save.inventory = [a, b];
    expect(mergeCandidates(save, a)).toEqual([]);
    save.inventory.push(c);
    expect(mergeCandidates(save, b).map((i) => i.uid)).toEqual(['b', a.uid, 'c']);
    expect(mergeCandidates(save, { ...a, uid: 'unowned' })).toEqual([]);
    expect(mergeCandidates(save, { ...a, rarity: 'rare' })).toEqual([]);
    expect(mergeCandidates(save, { ...a, baseId: 'cotton-apron' })).toEqual([]);
  });

  it('keeps items in a closed chest out of the rack and out of a merge until the chest is opened', () => {
    const save = freshSaveV2();
    const a = rollItem(makeRng(12), { baseId: 'plain-headband', rarity: 'common' });
    const b = { ...a, uid: 'b' };
    const c = { ...a, uid: 'c' };
    save.inventory = [a, b, c];
    save.pendingChests = ['c'];
    expect(rackItems(save).map((i) => i.uid)).toEqual([a.uid, 'b']);
    expect(mergeCandidates(save, a)).toEqual([]);
    save.pendingChests = [];
    expect(mergeCandidates(save, a)).toHaveLength(3);
  });

  it('gives all daily rewards and item names short labels', () => {
    expect(STREAK_REWARDS.map(giftLabel)).toEqual(['50 coins', '60 coins', '1 ingredient', '80 coins', '120 coins', '2 ingredients', 'Rare+ chest']);
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

  it('draws a closed chest by its tier, three looks for six rarities', () => {
    expect(RARITIES.map(chestArt)).toEqual([
      'chests/chest-common', 'chests/chest-common', 'chests/chest-rare', 'chests/chest-epic', 'chests/chest-epic', 'chests/chest-epic',
    ]);
  });

  it('counts the chests left until the next guaranteed Rare+ and Epic+', () => {
    expect(pityLines(freshSaveV2())).toEqual(['Rare guaranteed in 5 chests', 'Epic guaranteed in 20 chests']);
    expect(pityLines({ ...freshSaveV2(), chestPity: { rare: 4, epic: 19, opened: 19 } })).toEqual(['Rare guaranteed in the next chest', 'Epic guaranteed in the next chest']);
  });
});

describe('badges on the hub props', () => {
  it('shows nothing on a brand-new stall except the day-1 gift', () => {
    expect(readyBadges({ ...freshSaveV2(), idle: { lastCollectedAt: NOW.toISOString() } }, NOW)).toEqual({ calendar: true });
  });
  it('counts the coins waiting in the jar and the chests still closed', () => {
    const save = { ...veteran(), idle: { lastCollectedAt: new Date(NOW.getTime() - 3 * 3_600_000).toISOString() }, pendingChests: ['x', 'y'] };
    const badges = readyBadges(save, NOW);
    expect(badges.idle).toBe(`+${collect(save, NOW).rewards.gold}`);
    expect(badges.idle).toBe('+114'); // level 10: 38 coins an hour for 3 hours
    expect(badges.chests).toBe('2');
  });
  it('lights the calendar until today is claimed', () => {
    const save = veteran();
    expect(readyBadges(save, NOW).calendar).toBe(true);
    expect(readyBadges({ ...save, streak: { day: 1, lastClaimDay: '2026-10-12', windowStartDay: '2026-10-12', restDaysUsed: 0 } }, new Date('2026-10-12T12:00:00Z')).calendar).toBeUndefined();
  });
  it('lights training when a step is affordable and gear when a slot is empty but could be filled', () => {
    const save = veteran();
    expect(readyBadges(save, NOW).training).toBeUndefined();
    expect(readyBadges({ ...save, gold: 60 }, NOW).training).toBe(true);
    expect(readyBadges({ ...save, gold: 60, training: { wrist: 5, stamina: 5, flip: 5 } }, NOW).training).toBeUndefined();
    const towel = rollItem(makeRng(5), { slot: 'towel', rarity: 'common' });
    const owned = { ...save, inventory: [towel] };
    expect(readyBadges(owned, NOW).gear).toBe(true);
    expect(readyBadges({ ...owned, equipped: { towel: towel.uid } }, NOW).gear).toBeUndefined();
    expect(readyBadges({ ...owned, pendingChests: [towel.uid] }, NOW).gear).toBeUndefined();
    expect(readyBadges({ ...owned, unlocks: {} }, NOW).gear).toBeUndefined();
  });
});

describe('evolution recipe book', () => {
  it('lists eight recipes, marking only available ingredient pairs known', () => {
    const save = freshSaveV2();
    const recipes = evolutionRecipes(save);
    expect(recipes).toHaveLength(8);
    expect(recipes.filter(r => r.known).map(r => r.id)).toEqual(['thosai-typhoon']);
    save.stallXp = 150;
    expect(evolutionRecipes(save).find(r => r.id === 'tarik-lance')).toMatchObject({ known: true, needs: 'Tissue Lv 5 + Teh Tarik Lv 5' });
    save.unlockedDips = ['ghee'];
    expect(evolutionRecipes(save).find(r => r.id === 'golden-ghee-chakra')?.known).toBe(true);
    expect(evolutionRecipes(save).find(r => r.id === 'tandoor-meteor')?.known).toBe(false);
    save.unlockedBreads = ['naan']; save.unlockedDips.push('mutton-curry');
    expect(evolutionRecipes(save).find(r => r.id === 'tandoor-meteor')).toMatchObject({ known: true, sprite: 'evolutions/tandoor-meteor' });
    expect(evolutionRecipes(save).find(r => r.id === 'thosai-typhoon')?.needs).toContain('Lv 5 + Fast Flip Lv 5');
  });
});
