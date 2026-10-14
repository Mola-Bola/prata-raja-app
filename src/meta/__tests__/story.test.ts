import { describe, expect, it } from 'vitest';

import type { RunResult } from '../../core/types';
import { chapterUnlocked } from '../chapters';
import { UNLOCK_TABLE } from '../stall';
import { freshSaveV2, parseSaveV2, parseSaveV3 } from '../migrate';
import { awardBeats, BEATS, beatLabel, beatsFromRun, beatsOf, finishPrologue, shouldShowPrologue, unlocksForBeats } from '../story';
import type { UnlockFlag } from '../types';

const run = (over: Partial<RunResult> = {}): RunResult => ({ chapterId: 'kopitiam-street', won: false, wave: 6, kills: 0, bossKills: 0, time: 1, level: 1, gold: 0, breads: [], dips: [], ...over });

describe('prologue save', () => {
  it('plays for a fresh player; finishing or skipping persists before any run ends', () => {
    const fresh = freshSaveV2();
    expect(shouldShowPrologue(fresh)).toBe(true);
    const done = finishPrologue(fresh);
    expect(done).toEqual({ ...fresh, prologueSeen: true, beats: ['prologue'] });
    expect(fresh.prologueSeen).toBe(false);
    expect(finishPrologue(done)).toBe(done);
    expect(shouldShowPrologue(parseSaveV2(JSON.stringify(done)))).toBe(false);
  });

  it('bypasses all returning v1/v2 saves, including a false or missing flag', () => {
    for (const v of [1, 2]) for (const prologueSeen of [undefined, false, 'true']) {
      const save = parseSaveV2(JSON.stringify({ ...freshSaveV2(), v, runs: 1, prologueSeen }));
      expect(shouldShowPrologue(save)).toBe(false);
      expect(save.runs).toBe(1);
    }
  });

  it('accepts only a literal true for a new player', () => {
    for (const flag of [undefined, false, 'true', 1, {}, null]) {
      expect(shouldShowPrologue(parseSaveV2(JSON.stringify({ ...freshSaveV2(), prologueSeen: flag })))).toBe(true);
    }
  });
});

describe('story beats', () => {
  it('gives every level-gated flag a beat to open it, so no lock text is blank', () => {
    const flags = UNLOCK_TABLE.flatMap(row => row.flags);
    for (const flag of flags) expect(beatLabel(flag as UnlockFlag)).not.toBe('');
  });

  it('earns a run-count beat on the paid run that reaches it, and nothing on an unpaid run', () => {
    const save = freshSaveV2();
    expect(beatsFromRun(save, run({ wave: 1 }))).toEqual([]);
    expect(beatsFromRun(save, run())).toEqual(['first-run-done']);
    const later = awardBeats({ ...save, runs: 2 }, ['first-run-done']);
    expect(beatsFromRun(later, run())).toEqual(['runs-3']);
  });

  it('earns the chapter beat only when that chapter boss dies on a paid run', () => {
    const save = freshSaveV2();
    expect(beatsFromRun(save, run({ bossKills: 1 }))).toEqual(['first-run-done', 'kopitiam-street-done']);
    expect(beatsFromRun(save, run({ bossKills: 0 }))).toEqual(['first-run-done']);
    expect(beatsFromRun(save, run({ chapterId: 'hawker-night', bossKills: 1 }))).toEqual(['first-run-done', 'hawker-night-done']);
  });

  it('never earns a beat it already holds', () => {
    const save = awardBeats(freshSaveV2(), ['first-run-done', 'kopitiam-street-done']);
    expect(beatsFromRun(save, run({ bossKills: 1 }))).toEqual([]);
  });

  it('opens flags, rotis and dips, and keeps what is open', () => {
    expect(unlocksForBeats(['kopitiam-street-done'])).toEqual({ gloves: true, recipeBook: true });
    const save = awardBeats(freshSaveV2(), ['hawker-night-done']);
    expect(save.unlocks).toEqual({ signature: true });
    expect(save.unlockedDips).toEqual(['sambal']);
    const kept = awardBeats({ ...save, unlocks: { ...save.unlocks, gear: true } }, []);
    expect(kept.unlocks).toEqual({ signature: true, gear: true });
    expect(beatsOf(awardBeats(kept, ['hawker-night-done']))).toEqual(['hawker-night-done']);
  });

  it('opens hawker night on the boss beat and still on three legacy attempts', () => {
    const fresh = freshSaveV2();
    expect(chapterUnlocked(fresh, 'hawker-night')).toBe(false);
    expect(chapterUnlocked(awardBeats(fresh, ['kopitiam-street-done']), 'hawker-night')).toBe(true);
    expect(chapterUnlocked({ ...fresh, bossAttempts: { 'kopitiam-street': 3 } }, 'hawker-night')).toBe(true);
  });

  it('keeps beats and their unlocks through a v3 save round trip', () => {
    const save = awardBeats(freshSaveV2(), ['first-run-done', 'kopitiam-street-done']);
    const v3 = parseSaveV3(JSON.stringify({ ...save, v: 3, beats: beatsOf(save), kannanXp: 0, stall: { parts: {} } }));
    expect(v3.beats).toEqual(['first-run-done', 'kopitiam-street-done']);
    expect(v3.unlocks).toMatchObject({ gear: true, towel: true, gloves: true });
    expect(parseSaveV3(JSON.stringify(v3))).toEqual(v3);
  });

  it('ties each boss beat to its chapter', () => {
    const chapters = Object.values(BEATS).map(b => b.chapter).filter(Boolean);
    expect(chapters).toEqual(['kopitiam-street', 'hawker-night']);
  });
});
