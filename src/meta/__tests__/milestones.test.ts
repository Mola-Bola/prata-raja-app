import { describe, expect, it } from 'vitest';
import { MILESTONES } from '../../content/milestones';
import { xpForLevel } from '../kannan';
import { freshSaveV2, freshSaveV3, parseSaveV3 } from '../migrate';
import { dueMilestone, markVisitorSeen } from '../milestones';
import type { SaveV3 } from '../types';

describe('milestone visitors', () => {
  it('a v2 save at level 12 migrates with 5 and 10 already seen', () => {
    const old = { ...freshSaveV2(), stallXp: xpForLevel(12) };
    const migrated = parseSaveV3(JSON.stringify(old));
    expect(migrated.seenMilestones).toEqual([5, 10]);
    expect(dueMilestone(migrated)).toBeNull();
  });
  it('a v3 save without the field gets the same marks, and a save that has the field keeps it', () => {
    const { seenMilestones: _drop, ...v3 } = { ...freshSaveV3(), kannanXp: xpForLevel(12) } as SaveV3;
    const migrated = parseSaveV3(JSON.stringify(v3));
    expect(migrated.seenMilestones).toEqual([5, 10]);
    const kept = parseSaveV3(JSON.stringify({ ...migrated, seenMilestones: [5] }));
    expect(kept.seenMilestones).toEqual([5]);
    expect(dueMilestone(kept)?.level).toBe(10);
  });
  it('migration is idempotent and a fresh save has nothing seen', () => {
    const migrated = parseSaveV3(JSON.stringify({ ...freshSaveV2(), stallXp: xpForLevel(16) }));
    expect(parseSaveV3(JSON.stringify(migrated))).toEqual(migrated);
    expect(freshSaveV3().seenMilestones).toEqual([]);
  });
  it('the due selector picks the lowest unseen milestone the level has reached', () => {
    const at = (level: number, seen: number[] = []): SaveV3 => ({ ...freshSaveV3(), kannanXp: xpForLevel(level), seenMilestones: seen });
    expect(dueMilestone(at(4))).toBeNull();
    expect(dueMilestone(at(5))?.level).toBe(5);
    expect(dueMilestone(at(12, [5]))?.level).toBe(10);
    expect(dueMilestone(at(12, [5, 10]))).toBeNull();
    expect(dueMilestone(at(25, [5, 10, 15]))?.level).toBe(20);
  });
  it('the selector carries the visitor and the perk named by PERKS', () => {
    const due = dueMilestone({ ...freshSaveV3(), kannanXp: xpForLevel(5) } as SaveV3);
    expect(due?.visitor).toBe(MILESTONES[5]);
    expect(due?.perk).toBe('+1 reroll per run');
  });
  it('thanking a visitor marks it seen and records its beat once', () => {
    const save = { ...freshSaveV3(), kannanXp: xpForLevel(5) } as SaveV3;
    const once = markVisitorSeen(save, 5) as SaveV3;
    expect(once.seenMilestones).toEqual([5]);
    expect(once.beats).toEqual([MILESTONES[5].beatId]);
    expect((markVisitorSeen(once, 5) as SaveV3).beats).toEqual([MILESTONES[5].beatId]);
    expect(dueMilestone(once)).toBeNull();
  });
});
