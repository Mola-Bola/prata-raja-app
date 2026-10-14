import type { BreadId, DipId, RunResult } from '../core/types';
import { MIN_PAID_WAVE } from './runRewards';
import type { SaveV2, SaveV3, UnlockFlag } from './types';

/** A story beat: a moment the player reaches, and what it opens. Beats open rotis, dips, chapters and gear slots; the Kannan
 *  XP unlocks (stall.ts UNLOCK_TABLE) still apply on top, so a flag once open never locks again. */
export type Beat = {
  /** Shown in lock text and the unlock line: "Unlocks: Beat the Cockroach King". */
  label: string;
  /** Earned when a paid run on this chapter kills its boss. */
  chapter?: string;
  /** Earned once the player has played this many daydreams. */
  runs?: number;
  flags?: UnlockFlag[];
  breads?: BreadId[];
  dips?: DipId[];
};

export const BEATS: Record<string, Beat> = {
  'prologue': { label: 'Hear the story' },
  'first-run-done': { label: 'Play your first daydream', runs: 1, flags: ['gear', 'towel'] },
  'runs-3': { label: 'Play 3 daydreams', runs: 3, flags: ['training', 'headband'] },
  'runs-5': { label: 'Play 5 daydreams', runs: 5, flags: ['secondReroll', 'apron'] },
  'kopitiam-street-done': { label: 'Beat the Cockroach King', chapter: 'kopitiam-street', flags: ['gloves', 'recipeBook'], breads: ['naan'] },
  'runs-10': { label: 'Play 10 daydreams', runs: 10, flags: ['slippers', 'chefsSpecial'] },
  'hawker-night-done': { label: 'Beat the Burger Baron', chapter: 'hawker-night', flags: ['signature'], dips: ['sambal'] },
};

const beat = (id: string): Beat | undefined => (Object.hasOwn(BEATS, id) ? BEATS[id] : undefined);

/** The beats a save holds. A v2 save has none yet. */
export const beatsOf = (save: SaveV2): string[] => (save as Partial<SaveV3>).beats ?? [];

/** The flags the given beats open. Pure. */
export function unlocksForBeats(beats: readonly string[]): Partial<Record<UnlockFlag, boolean>> {
  const flags: Partial<Record<UnlockFlag, boolean>> = {};
  for (const id of beats) for (const flag of beat(id)?.flags ?? []) flags[flag] = true;
  return flags;
}

/** The beats one run earns that `save` (the stall before the run) does not have yet. Only a paid run earns any; `runs`
 *  counts every daydream, the same as the save's run count does. */
export function beatsFromRun(save: SaveV2, result: RunResult): string[] {
  if (result.wave < MIN_PAID_WAVE) return [];
  const have = beatsOf(save);
  const chapter = result.chapterId ?? 'kopitiam-street';
  return Object.entries(BEATS)
    .filter(([id, b]) => !have.includes(id) && (
      (b.runs !== undefined && save.runs + 1 >= b.runs) || (b.chapter === chapter && result.bossKills > 0)
    ))
    .map(([id]) => id);
}

/** Adds the earned beats and everything they open (flags, rotis, dips). Pure; passing no beats still applies the table, so a
 *  loaded save is brought up to date. */
export function awardBeats(save: SaveV2, earned: readonly string[]): SaveV2 {
  const beats = [...new Set([...beatsOf(save), ...earned])];
  const breads = [...new Set([...save.unlockedBreads, ...beats.flatMap(id => beat(id)?.breads ?? [])])];
  const dips = [...new Set([...save.unlockedDips, ...beats.flatMap(id => beat(id)?.dips ?? [])])];
  return { ...save, beats, unlocks: { ...save.unlocks, ...unlocksForBeats(beats) }, unlockedBreads: breads, unlockedDips: dips } as SaveV2;
}

/** The label of the first beat that opens `flag` (lock text). */
export function beatLabel(flag: UnlockFlag): string {
  return Object.values(BEATS).find(b => b.flags?.includes(flag))?.label ?? '';
}

/** Existing players go straight to their stall, even if they predate the story flag. */
export const shouldShowPrologue = (save: SaveV2): boolean => save.runs === 0 && !save.prologueSeen;

/** Skipping and finishing both count; replaying never changes other progress. */
export const finishPrologue = (save: SaveV2): SaveV2 => save.prologueSeen ? save : awardBeats({ ...save, prologueSeen: true }, ['prologue']);
