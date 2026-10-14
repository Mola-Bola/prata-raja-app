import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import { STAT_REGISTRY } from '../../core/statRegistry';
import { MATERIAL_DROPS } from '../../content/drops';
import { AFFIX_TIER_LVLS, deriveAffixes, enhance, enhanceCost, GEAR_BASES, itemStats, MAX_ENHANCE, RARITY_INFO, regenAffixes, rollItem } from '../gear';
import { freshSaveV2, parseSaveV2 } from '../migrate';
import { rollMaterialDrops } from '../runRewards';
import { activeHooks, critSplashDamage, firstHitFreeze, UNIQUES } from '../uniques';
import { MATERIALS, RARITIES, type GearItem, type SaveV2 } from '../types';

describe('gear v2', () => {
  it('regenerates deterministically and matches the rolled item', () => {
    for (let s = 1; s < 40; s++) {
      const it = rollItem(makeRng(s), { source: 'chest', ilvl: s });
      expect(regenAffixes(it)).toEqual(it.affixes);
      expect(deriveAffixes(it.baseId, it.ilvl!, it.rarity, it.seed!)).toEqual(deriveAffixes(it.baseId, it.ilvl!, it.rarity, it.seed!));
    }
  });
  it('fixed slot counts, registry stats, bands, and every ilvl has an eligible tier inside [ilvl/2, ilvl]', () => {
    for (let ilvl = 1; ilvl <= 80; ilvl++) {
      expect(AFFIX_TIER_LVLS.some(l => l <= ilvl && l >= ilvl / 2)).toBe(true);
      for (const rarity of RARITIES) for (const baseId of Object.keys(GEAR_BASES) as (keyof typeof GEAR_BASES)[]) {
        const a = deriveAffixes(baseId, ilvl, rarity, ilvl * 7919);
        expect(a).toHaveLength(RARITY_INFO[rarity].affixes);
        for (const x of a) { expect(STAT_REGISTRY[x.stat]).toBeDefined(); expect(['Fine', 'Good', 'Great']).toContain(x.tier); }
      }
    }
  });
  it('higher ilvl never offers a below-window tier', () => {
    // at ilvl 50 only tiers with minLvl in [25,50] (32, 50): values exceed the ilvl-1 maximum for the same affix
    const hi = Math.max(...Array.from({ length: 200 }, (_, s) => deriveAffixes('plain-headband', 50, 'raja', s)[0].value));
    const lo = Math.max(...Array.from({ length: 200 }, (_, s) => deriveAffixes('plain-headband', 1, 'raja', s)[0].value));
    expect(hi).toBeGreaterThan(lo);
  });
  it('migrates legacy items without losing stats; a stale v2 item keeps its stored affixes', () => {
    const legacy = { uid: 'a', baseId: 'cotton-apron', slot: 'apron', rarity: 'rare', level: 3, affixes: [{ id: 'sturdy', stat: 'maxHp', value: 5 }] } as GearItem;
    const stale = { ...rollItem(makeRng(3), { source: 'chest', rarity: 'epic', ilvl: 9 }), uid: 'b' };
    const tampered = { ...stale, uid: 'c', affixes: stale.affixes.map(a => ({ ...a, value: a.value + 1 })) };
    const save = { ...freshSaveV2(), inventory: [legacy, stale, tampered] };
    const out = parseSaveV2(JSON.stringify(save));
    expect(itemStats(out.inventory[0])).toEqual(itemStats(legacy));
    expect(out.inventory[1]).toEqual(stale);
    expect(out.inventory[2].version).toBe(1);
    expect(out.inventory[2].affixes).toEqual(tampered.affixes);
  });
  it('old spice material maps to masala', () => {
    const raw = { ...freshSaveV2(), materials: { flour: 1, ghee: 0, egg: 0, onion: 0, spice: 4, sugar: 0, milk: 0 } };
    expect(parseSaveV2(JSON.stringify(raw)).materials.masala).toBe(4);
  });
});

describe('enhance', () => {
  const item = { ...rollItem(makeRng(2), { source: 'chest', rarity: 'rare' }), uid: 'x' };
  const rich = (): SaveV2 => ({ ...freshSaveV2(), gold: 1e9, inventory: [item], materials: Object.fromEntries(MATERIALS.map(m => [m, 999])) as SaveV2['materials'] });
  it('costs rise, steps +1..+15, never destroys, then stops', () => {
    let s = rich();
    for (let n = 0; n < MAX_ENHANCE; n++) {
      expect(enhanceCost(n + 1).gold).toBeGreaterThan(enhanceCost(n).gold);
      const before = s;
      s = enhance(s, 'x');
      expect(s.inventory[0].enhance).toBe(n + 1);
      expect(s.gold).toBe(before.gold - enhanceCost(n).gold);
    }
    expect(enhance(s, 'x')).toBe(s);
    expect(itemStats(s.inventory[0]).maxHp ?? 0).toBeGreaterThanOrEqual(itemStats(item).maxHp ?? 0);
    expect(s.inventory[0].affixes).toEqual(item.affixes);
  });
  it('refuses when poor and leaves the save untouched', () => {
    const s = { ...rich(), gold: 0 };
    expect(enhance(s, 'x')).toBe(s);
    expect(enhance(rich(), 'nope').inventory[0].enhance).toBe(0);
  });
});

describe('material drops', () => {
  const run = { kills: 400, bossKills: 1, killsByKind: { walker: 200, tank: 100, shooter: 100 } };
  it('is deterministic, drops only listed materials, and responds to the seed', () => {
    expect(rollMaterialDrops(5, run)).toEqual(rollMaterialDrops(5, run));
    const d = rollMaterialDrops(5, run);
    expect(Object.keys(d).every(k => (MATERIALS as readonly string[]).includes(k))).toBe(true);
    expect(d.ghee).toBeGreaterThanOrEqual(1); // the boss guarantees ghee + masala
    expect(JSON.stringify(rollMaterialDrops(6, run))).not.toBe(JSON.stringify(d));
    expect(Object.keys(MATERIAL_DROPS)).toContain('boss');
  });
});

describe('uniques', () => {
  it('hooks resolve from equipped items', () => {
    const it = { ...rollItem(makeRng(1), { baseId: 'lucky-red-towel', source: 'chest' }), uid: 'u', uniqueId: 'ah-seng-golden-tawa-towel' };
    const s = { ...freshSaveV2(), inventory: [it], equipped: { towel: 'u' } };
    expect(UNIQUES[it.uniqueId!].baseId).toBe(it.baseId);
    expect(critSplashDamage(activeHooks(s), 100)).toEqual({ damage: 50, radius: 90 });
    expect(critSplashDamage([], 100).damage).toBe(0);
    expect(firstHitFreeze([{ kind: 'firstHitFreeze', seconds: 1.5 }], false)).toBe(1.5);
    expect(firstHitFreeze([{ kind: 'firstHitFreeze', seconds: 1.5 }], true)).toBe(0);
  });
});
