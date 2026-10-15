import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoInput } from '../autoplay';
import { PICK_EVERY, bossAtOf, nextPickStop } from '../director';
import { createRun, step } from '../sim';
import type { World } from '../types';

const DT = 1 / 30;

/** Step until `until` holds (or the cap), keeping the bot alive. */
function runUntil(w: World, until: (x: World) => boolean, cap = 240 * 30): void {
  for (let i = 0; i < cap && !until(w); i++) {
    w.player.hp = w.player.stats.maxHp;
    step(w, DT, autoInput(w));
  }
}

const fresh = (seed = 11): World => {
  const w = createRun({ seed, content: CONTENT });
  w.phase = 'wave';
  w.wave = 1;
  return w;
};

describe('flow street finds', () => {
  it('in-run level-ups never open cards in flow', () => {
    const w = fresh();
    w.player.xp = w.player.xpToNext; // owed a level
    step(w, DT, autoInput(w));
    expect(w.phase).toBe('wave');
    expect(w.pendingLevelUps).toBe(0);
  });

  it('the boss mark gets no find, and nextPickStop: next multiple, capped at the boss mark', () => {
    const w = fresh();
    w.dist = bossAtOf(w.chapter) - 2;
    w.pickAt = bossAtOf(w.chapter);
    runUntil(w, (x) => !!x.flowBoss, 60 * 30);
    expect(w.flowBoss).toBe(true);
    expect(w.finds ?? []).toHaveLength(0);
    expect(w.pickup).toBeUndefined();
    expect(nextPickStop(PICK_EVERY - 1, 1200)).toBe(PICK_EVERY);
    expect(nextPickStop(1190, 1200)).toBe(1200);
    expect(nextPickStop(1200, 1200)).toBe(Infinity);
  });

  it('waves mode still offers level-ups at once', () => {
    const w = createRun({ seed: 2, content: CONTENT, mode: 'waves' });
    w.pendingLevelUps = 1;
    step(w, DT, autoInput(w));
    expect(w.phase).toBe('levelup');
  });
});
