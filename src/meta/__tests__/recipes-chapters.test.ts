import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { makeRng } from '../../core/rng';
import { createRun, step } from '../../core/sim';
import type { RunResult } from '../../core/types';
import { chapterUnlocked } from '../chapters';
import { computeLoadout } from '../loadout';
import { freshSaveV2, parseSaveV2 } from '../migrate';
import { canCook, cook, RECIPES, recipeKnown, runPools } from '../recipes';
import { applyRunResult } from '../runRewards';
import { MATERIALS } from '../types';

const result: RunResult = { chapterId: 'kopitiam-street', bossAttempted: true, won: false, wave: 10, kills: 0, bossKills: 0, time: 400, level: 8, gold: 0, breads: [], dips: [] };
describe('recipes', () => {
  it.each(RECIPES.filter(recipe => {
    const target = recipe.unlocks;
    return (target.kind === 'bread' ? CONTENT.breads[target.id] : CONTENT.dips[target.id]).unlock !== 'starter';
  }))('$id spends its exact costs once, records its unlock, and preserves the input', recipe => {
    const save = freshSaveV2(); save.unlocks.recipeBook = true;
    for (const material of MATERIALS) save.materials[material] = 10;
    const before = JSON.stringify(save);
    expect(canCook(save, recipe.id)).toBe(true);
    const next = cook(save, recipe.id);
    expect(JSON.stringify(save)).toBe(before);
    for (const material of MATERIALS) expect(next.materials[material]).toBe(10 - (recipe.costs[material] ?? 0));
    const owned = recipe.unlocks.kind === 'bread' ? next.unlockedBreads : next.unlockedDips;
    expect(owned).toContain(recipe.unlocks.id);
    expect(recipeKnown(next, recipe)).toBe(true);
    expect(canCook(next, recipe.id)).toBe(false);
    expect(cook(next, recipe.id)).toBe(next);
    expect(parseSaveV2(JSON.stringify(next))).toEqual(next);
    const pools = runPools(next, CONTENT);
    expect(recipe.unlocks.kind === 'bread' ? pools.breadPool : pools.dipPool).toContain(recipe.unlocks.id);
  });
  it.each(['rc-roti-bomb', 'rc-condensed-milk'])('%s is already known and never spends ingredients', id => {
    const save = freshSaveV2(); save.unlocks.recipeBook = true;
    for (const material of MATERIALS) save.materials[material] = 10;
    const recipe = RECIPES.find(r => r.id === id)!;
    const before = JSON.stringify(save);
    expect(recipeKnown(save, recipe)).toBe(true);
    expect(canCook(save, id)).toBe(false);
    expect(cook(save, id)).toBe(save);
    expect(JSON.stringify(save)).toBe(before);
    const pools = runPools(save, CONTENT);
    expect(recipe.unlocks.kind === 'bread' ? pools.breadPool : pools.dipPool).toContain(recipe.unlocks.id);
  });
  it('refuses unknown, locked and underfunded recipes without spending anything', () => {
    const save = freshSaveV2();
    expect(cook(save, 'unknown')).toBe(save);
    save.materials = Object.fromEntries(MATERIALS.map(m => [m, 10])) as typeof save.materials;
    expect(cook(save, 'rc-naan')).toBe(save);
    save.unlocks.recipeBook = true; save.materials.ghee = 1;
    expect(canCook(save, 'rc-naan')).toBe(false);
    expect(cook(save, 'rc-naan')).toBe(save);
  });
  it('starter pools expand at exactly stall level two, omit evolutions and include cooked ids', () => {
    const save = freshSaveV2(); const starter = runPools(save, CONTENT);
    expect(starter.breadPool).toEqual(Object.values(CONTENT.breads).filter(b => b.unlock === 'starter').map(b => b.id).sort());
    expect(starter.dipPool).toEqual(Object.values(CONTENT.dips).filter(d => d.unlock === 'starter').map(d => d.id).sort());
    save.stallXp = 149; expect(runPools(save, CONTENT)).toEqual(starter);
    save.stallXp = 150; save.unlockedBreads = ['naan']; save.unlockedDips = ['ghee'];
    const pools = runPools(save, CONTENT);
    expect(pools.breadPool).toEqual([...starter.breadPool, 'appam', 'idli', 'naan'].sort());
    expect(pools.dipPool).toEqual([...starter.dipPool, 'chicken-curry', 'teh-tarik', 'dhal', 'ghee'].sort());
    expect(computeLoadout(save, CONTENT)).toMatchObject(pools);
    save.unlockedBreads.push('tarik-lance'); expect(runPools(save, CONTENT).breadPool).not.toContain('tarik-lance');
  });
  it('migrates missing S3 fields and filters duplicate, unknown, evolved and corrupt saved data', () => {
    const save = freshSaveV2();
    expect(parseSaveV2(JSON.stringify({ v: 1 })).unlockedBreads).toEqual([]);
    expect(parseSaveV2(JSON.stringify({ v: 2 })).bossAttempts).toEqual({});
    const migrated = parseSaveV2(JSON.stringify({ ...save, unlockedBreads: ['naan', 'naan', 'tarik-lance', 42, 'bogus'], unlockedDips: ['ghee', 'ghee', 'bogus'], bossAttempts: { 'kopitiam-street': 3.9, 'hawker-night': -1, bogus: 999 } }));
    expect(migrated.unlockedBreads).toEqual(['naan']); expect(migrated.unlockedDips).toEqual(['ghee']);
    expect(migrated.bossAttempts).toEqual({ 'kopitiam-street': 3 });
  });
});

describe('chapter gates and night content', () => {
  it.each([1, 2])('migrates legacy v%s wins so three victories unlock night', v => {
    const save = parseSaveV2(JSON.stringify({ v, wins: 3, bestWave: 10, runs: 7 }));
    expect(save.bossAttempts).toEqual({ 'kopitiam-street': 3 });
    expect(chapterUnlocked(save, 'hawker-night')).toBe(true);
    expect(parseSaveV2(JSON.stringify(save))).toEqual(save);
  });
  it.each([
    { wins: 0, bestWave: 10, runs: 5, attempts: 1 },
    { wins: 2, bestWave: 10, runs: 5, attempts: 2 },
    { wins: 0, bestWave: 9, runs: 5, attempts: 0 },
    { wins: -3, bestWave: '10', runs: 5, attempts: 0 },
  ])('uses only proven legacy attempts: $wins wins, best wave $bestWave', ({ attempts, ...legacy }) => {
    const save = parseSaveV2(JSON.stringify({ v: 2, ...legacy }));
    expect(save.bossAttempts['kopitiam-street'] ?? 0).toBe(attempts);
    expect(chapterUnlocked(save, 'hawker-night')).toBe(false);
  });
  it.each([{}, { 'kopitiam-street': 1, 'hawker-night': 2 }])('preserves explicit S3 attempts %j instead of inferring from totals', bossAttempts => {
    const save = parseSaveV2(JSON.stringify({ v: 2, wins: 3, bestWave: 10, bossAttempts }));
    expect(save.bossAttempts).toEqual(bossAttempts);
    expect(chapterUnlocked(save, 'hawker-night')).toBe(false);
  });
  it('counts wins and losses at the boss, opens night after three, and keeps chapters independent', () => {
    let save = freshSaveV2(); const now = new Date('2026-10-12T00:00:00Z');
    expect(chapterUnlocked(save, 'kopitiam-street')).toBe(true);
    expect(chapterUnlocked(save, 'unknown')).toBe(false);
    save = applyRunResult(save, { ...result, wave: 9, bossAttempted: false }, makeRng(1), now).save;
    expect(save.bossAttempts).toEqual({});
    for (let attempt = 1; attempt <= 3; attempt++) {
      const previous = save;
      save = applyRunResult(save, { ...result, won: attempt === 2 }, makeRng(attempt), now).save;
      expect(previous.bossAttempts['kopitiam-street'] ?? 0).toBe(attempt - 1);
      expect(save.bossAttempts['kopitiam-street']).toBe(attempt);
      expect(chapterUnlocked(save, 'hawker-night')).toBe(attempt === 3);
    }
    save = applyRunResult(save, { ...result, chapterId: 'hawker-night' }, makeRng(4), now).save;
    expect(save.bossAttempts).toEqual({ 'kopitiam-street': 3, 'hawker-night': 1 });
  });
  it('boss attempt evidence is produced on spawn and survives a loss result', () => {
    const w = createRun({ seed: 1, content: CONTENT, chapterId: 'hawker-night' });
    w.phase = 'wave'; w.dist = w.chapter.bossAt! - 0.01;
    step(w, 1 / 30, {});
    expect(w.wave).toBe(10); expect(w.bossAttempted).toBe(true);
    w.player.hp = 0;
    step(w, 1 / 30, {});
    expect(w.result).toMatchObject({ chapterId: 'hawker-night', bossAttempted: true, won: false });
  });
  it('has ten waves, the Baron last, and all requested archetypes and links', () => {
    const night = CONTENT.chapters[1]; expect(night.id).toBe('hawker-night');
    expect(night.background).toBe('scene/background2'); expect(night.waves).toHaveLength(10);
    expect(night.waves[9].boss).toBe('burger-baron'); expect(night.waves.slice(0, 9).every(w => !w.boss)).toBe(true);
    const ids = ['sugarcane-walker', 'tray-rat', 'neon-moth', 'fishball', 'ice-golem', 'satay-archer', 'kway-teow-blob', 'noodle-bit', 'drumstick-knight', 'kopi-ghost', 'chope-spirit', 'rojak-bomb'];
    expect(ids.map(id => CONTENT.enemies[id].kind)).toEqual(['walker', 'runner', 'flyer', 'swarm', 'tank', 'shooter', 'splitter', 'runner', 'shielded', 'healer', 'summoner', 'exploder']);
    for (const id of ids) expect(CONTENT.enemies[id].sprite).toBe(`enemies/${id}`);
    expect(CONTENT.enemies.fishball.cloud).toBe(8);
    expect(CONTENT.enemies['satay-archer'].ranged?.projSprite).toBe('fx/spark');
    expect(CONTENT.enemies['kway-teow-blob'].split).toEqual({ into: 'noodle-bit', count: 3 });
    expect(CONTENT.enemies['chope-spirit'].summon?.id).toBe('sugarcane-walker');
    expect(CONTENT.enemies['sugarcane-walker'].hp).toBe(27);
  });
});
