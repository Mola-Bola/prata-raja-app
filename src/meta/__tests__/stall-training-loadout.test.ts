import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { makeRng } from '../../core/rng';
import { computeStats } from '../../core/stats';
import { createRun } from '../../core/sim';
import { itemStats, rollItem } from '../gear';
import { runPools } from '../recipes';
import { computeLoadout } from '../loadout';
import { freshSaveV2 } from '../migrate';
import { LEVEL_THRESHOLDS, nextUnlock, runXp, stallLevel, UNLOCK_TABLE, unlocksForXp } from '../stall';
import { buyTraining, respec, TRAINING_COSTS, trainingStats } from '../training';
import { TRAINING_IDS, type SaveV2 } from '../types';

describe('stall', () => {
  it.each(LEVEL_THRESHOLDS.map((xp, index) => ({ xp, level: index + 1 })))('level $level starts at $xp XP', ({ xp, level }) => {
    expect(stallLevel(xp)).toBe(level);
    if (xp > 0) expect(stallLevel(xp - 1)).toBe(level - 1);
  });
  it('caps at ten and treats negative XP as level one', () => {
    expect(stallLevel(100000)).toBe(10); expect(stallLevel(-1)).toBe(1);
  });
  it('has the specified feature and slot unlocks', () => {
    expect(UNLOCK_TABLE.map(u => u.flags)).toEqual([
      ['gear', 'towel'], ['training', 'headband'], ['secondReroll'], ['apron'],
      ['gloves', 'recipeBook'], ['slippers'], ['chefsSpecial'], ['signature'],
    ]);
    for (const u of UNLOCK_TABLE) {
      const xp = LEVEL_THRESHOLDS[u.level - 1];
      for (const flag of u.flags) {
        expect(unlocksForXp(xp)[flag]).toBe(true);
        expect(unlocksForXp(xp - 1)[flag]).toBeUndefined();
      }
    }
  });
  it('reports the next named unlock and distance, and the signature unlock at L9', () => {
    expect(nextUnlock(140)).toEqual({ level: 2, xpRequired: 150, xpRemaining: 10, flags: ['gear', 'towel'] });
    expect(nextUnlock(150)?.level).toBe(3);
    expect(nextUnlock(2400)).toEqual({ level: 9, xpRequired: 3100, xpRemaining: 700, flags: ['signature'] });
    expect(nextUnlock(3100)).toBeNull(); expect(nextUnlock(3900)).toBeNull();
  });
  it('pays XP on all runs including zero-wave deaths', () => {
    expect(runXp(0, 0)).toBe(40); expect(runXp(10, 1)).toBe(190); expect(runXp(5, 2)).toBe(190);
  });
});
describe('training', () => {
  it.each(TRAINING_IDS)('%s has five exact costs, stops at five, and fully refunds', id => {
    let save: SaveV2 = { ...freshSaveV2(), gold: 1080, unlocks: { training: true } };
    expect(TRAINING_COSTS).toEqual([60, 120, 200, 300, 400]);
    for (let level = 0; level < 5; level++) {
      const previous = save;
      save = buyTraining(save, id);
      expect(previous.gold - save.gold).toBe(TRAINING_COSTS[level]);
      expect(save.training[id]).toBe(level + 1);
    }
    expect(save.gold).toBe(0); expect(buyTraining(save, id)).toBe(save);
    expect(respec(save).gold).toBe(1080);
    expect(respec(respec(save)).gold).toBe(1080);
  });
  it('requires the training unlock and enough coins', () => {
    const save = freshSaveV2(); save.gold = 1000;
    expect(buyTraining(save, 'wrist')).toBe(save);
    save.unlocks.training = true; save.gold = 59;
    expect(buyTraining(save, 'wrist')).toBe(save);
  });
  it('adds 6% damage, 10 HP and 6% throw rate per step', () => {
    expect(trainingStats({ wrist: 5, stamina: 5, flip: 5 })).toEqual({ dmgPct: .3, maxHp: 50, throwSpeedPct: .3 });
  });
  it('refunds mixed ladders without touching gear or materials', () => {
    const save = freshSaveV2(); save.training = { wrist: 2, stamina: 3, flip: 5 }; save.gold = 7;
    expect(respec(save).gold).toBe(7 + 180 + 380 + 1080);
    expect(respec(save).materials).toEqual(save.materials);
    expect(save.training.wrist).toBe(2);
  });
});
describe('loadout', () => {
  it('returns zero additive bonuses for a fresh save and the existing starter bread', () => {
    expect(computeLoadout(freshSaveV2(), CONTENT)).toEqual({ stats: {}, dipSimmer: { 'fish-curry': 1, 'mint-chutney': 1, 'condensed-milk': 1 }, startBread: 'kosong', ...runPools(freshSaveV2(), CONTENT) });
  });
  it('stall level 4 (Extra reroll) gives the run two rerolls', () => {
    const save = freshSaveV2(); save.unlocks = { ...save.unlocks, secondReroll: true };
    expect(computeLoadout(save, CONTENT).rerolls).toBe(2);
    expect(createRun({ seed: 1, content: CONTENT, loadout: computeLoadout(save, CONTENT) }).rerolls).toBe(2);
    expect(createRun({ seed: 1, content: CONTENT }).rerolls).toBe(1);
  });
  it('adds equipped gear and training once, and feeds existing computeStats', () => {
    const save = freshSaveV2(); save.stallXp = 3900; save.unlocks = unlocksForXp(save.stallXp);
    const rng = makeRng(1);
    const a = rollItem(rng, { slot: 'headband', rarity: 'common' });
    const b = rollItem(rng, { slot: 'apron', rarity: 'common' });
    save.inventory = [a, b]; save.equipped = { headband: a.uid, apron: b.uid };
    save.training = { wrist: 2, stamina: 1, flip: 3 };
    const before = JSON.stringify(save);
    const loadout = computeLoadout(save, CONTENT);
    expect(loadout.stats?.dmgPct).toBeCloseTo(.12 + itemStats(a).dmgPct!);
    expect(loadout.stats?.maxHp).toBe(15);
    expect(computeStats([], CONTENT, loadout).maxHp).toBe(115);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('ignores locked, unequipped, missing and wrong-slot items', () => {
    const save = freshSaveV2(); const item = rollItem(makeRng(1), { slot: 'apron', rarity: 'common' });
    save.inventory = [item]; save.equipped = { apron: item.uid, headband: item.uid }; save.training.wrist = 5;
    expect(computeLoadout(save, CONTENT).stats).toEqual({});
    save.unlocks = { gear: true, headband: true };
    expect(computeLoadout(save, CONTENT).stats).toEqual({});
    save.equipped = { headband: 'missing' };
    expect(computeLoadout(save, CONTENT).stats).toEqual({});
  });
});
