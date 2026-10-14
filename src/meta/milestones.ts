import { MILESTONES, MILESTONE_VISITS_ON, type Milestone } from '@/content/milestones';
import { PERKS, kannanLevel } from './kannan';
import type { SaveV2, SaveV3 } from './types';

export const MILESTONE_LEVELS = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);

/** Milestone levels already passed at this Kannan XP: the migration marks these seen so an old save never replays them. */
export const milestonesBelow = (xp: number): number[] => MILESTONE_LEVELS.filter(l => l < kannanLevel(xp));

/** The lowest unseen milestone the Kannan level has reached, or null. One visitor per stall return. Pure. */
export function dueMilestone(save: SaveV2): { level: number; visitor: Milestone; perk: string } | null {
  if (!MILESTONE_VISITS_ON) return null;
  const seen = (save as Partial<SaveV3>).seenMilestones ?? [];
  const level = kannanLevel((save as Partial<SaveV3>).kannanXp ?? save.stallXp);
  const due = MILESTONE_LEVELS.find(l => l <= level && !seen.includes(l));
  if (due === undefined) return null;
  const perk = PERKS.find(p => p.level === due)?.label ?? '';
  return { level: due, visitor: MILESTONES[due], perk };
}

/** Marks the visitor seen and records the beat. Pure; applied through commit. */
export function markVisitorSeen(save: SaveV2, level: number): SaveV2 {
  const v3 = save as SaveV3;
  const seen = [...new Set([...(v3.seenMilestones ?? []), level])];
  const beats = [...new Set([...(v3.beats ?? []), MILESTONES[level].beatId])];
  return { ...save, seenMilestones: seen, beats } as SaveV2;
}
