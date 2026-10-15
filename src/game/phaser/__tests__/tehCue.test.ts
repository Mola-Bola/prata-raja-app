import { describe, expect, it } from 'vitest';

import { tehCue } from '../tehCue';

const neutral = { remaining: 0, elapsed: 0, scale: 1, warm: false };

describe('Teh timer cue', () => {
  it('stays neutral before activation and returns to neutral immediately on expiration', () => {
    expect(tehCue(neutral, 0)).toEqual(neutral);
    const active = tehCue(neutral, 3);
    expect(active.warm).toBe(true);
    expect(tehCue(active, 0)).toEqual(neutral);
  });

  it('pops on activation, settles to a smaller pulse, and pops again on a refresh', () => {
    const start = tehCue(neutral, 3);
    const pop = tehCue(start, 2.88);
    expect(pop.scale).toBeGreaterThan(1.12);
    const ongoing = tehCue(pop, 2.5);
    expect(ongoing.scale).toBeLessThanOrEqual(1.04);
    const restart = tehCue(ongoing, 3);
    expect(restart.elapsed).toBe(0);
    expect(tehCue(restart, 2.88).scale).toBeCloseTo(pop.scale);
  });

  it('freezes with the sim timer and suppresses motion for reduced motion', () => {
    const cue = tehCue(tehCue(neutral, 3), 2.88);
    expect(tehCue(cue, 2.88)).toEqual(cue);
    expect(tehCue(cue, 2.8, true, true)).toMatchObject({ scale: 1, warm: true });
  });

  it('hides outside combat without inventing a new activation when combat resumes', () => {
    const cue = tehCue(tehCue(neutral, 3), 2.5);
    const hidden = tehCue(cue, 2.5, false);
    expect(hidden).toMatchObject({ scale: 1, warm: false, elapsed: 0.5 });
    expect(tehCue(hidden, 2.5)).toEqual(cue);
  });
});
