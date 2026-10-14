import { describe, expect, it } from 'vitest';
import { makeRng } from '../../core/rng';
import { CONTENT } from '../../content';
import { kannanLevel, nextPerk, xpForLevel } from '../kannan';
import { computeLoadout } from '../loadout';
import { freshSaveV2, freshSaveV3, parseSaveV3 } from '../migrate';
import { applyRunResult } from '../runRewards';
import type { SaveV3 } from '../types';

describe('one Kannan level', () => {
  it('migrates specPoints = level-1 and is idempotent', () => {
    const once = parseSaveV3(JSON.stringify({ ...freshSaveV2(), stallXp: 1500 }));
    expect(once.specPoints).toBe(kannanLevel(1500) - 1);
    const spent = { ...once, specPoints: 1 };
    expect(parseSaveV3(JSON.stringify(spent)).specPoints).toBe(1);
    expect(parseSaveV3(JSON.stringify(once))).toEqual(once);
  });
  it('perks apply through the loadout at 5/10/15', () => {
    const at = (level: number): SaveV3 => ({ ...freshSaveV3(), kannanXp: xpForLevel(level) });
    expect(computeLoadout(at(4), CONTENT).rerolls).toBeUndefined();
    expect(computeLoadout(at(5), CONTENT).rerolls).toBe(2);
    expect(computeLoadout(at(10), CONTENT).stats?.maxHp).toBe(5);
    expect(computeLoadout(at(15), CONTENT).stats?.dmgPct).toBeCloseTo(0.03);
    expect(nextPerk(5)?.level).toBe(10);
  });
  it('gates read kannan xp and a level-up grants a spec point', () => {
    const save: SaveV3 = { ...freshSaveV3(), kannanXp: xpForLevel(2) - 5, specPoints: 1 };
    expect(save.unlocks.gear).toBeUndefined();
    const { save: next } = applyRunResult(save, { won: false, wave: 5, kills: 20, bossKills: 0, time: 10, level: 1, gold: 0, breads: [], dips: [] }, makeRng(1), new Date());
    expect(kannanLevel(next.kannanXp)).toBeGreaterThanOrEqual(2);
    expect(next.unlocks.gear).toBe(true);
    expect(next.specPoints).toBe(1 + kannanLevel(next.kannanXp) - 1);
  });
});
