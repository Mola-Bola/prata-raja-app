import { describe, expect, it } from 'vitest';

import { freshSaveV2, parseSaveV2 } from '../migrate';
import { finishPrologue, shouldShowPrologue } from '../story';

describe('prologue save', () => {
  it('plays for a fresh player; finishing or skipping persists before any run ends', () => {
    const fresh = freshSaveV2();
    expect(shouldShowPrologue(fresh)).toBe(true);
    const done = finishPrologue(fresh);
    expect(done).toEqual({ ...fresh, prologueSeen: true });
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
