import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoInput, autoPick } from '../autoplay';
import { CALM_TIME, PICK_EVERY, bossAtOf, nextPickStop } from '../director';
import { chooseCard, createRun, openPicks, step } from '../sim';
import type { World } from '../types';

const DT = 1 / 30;

/** Step until `until` holds (or the cap), keeping the bot alive. Returns the number of steps taken. */
function runUntil(w: World, until: (x: World) => boolean, cap = 60 * 30): number {
  let i = 0;
  for (; i < cap && !until(w); i++) {
    w.player.hp = w.player.stats.maxHp;
    step(w, DT, autoInput(w));
  }
  return i;
}

describe('flow level-up picks', () => {
  it('queue during flow and never pause the fight mid-stride', () => {
    const w = createRun({ seed: 11, content: CONTENT });
    w.phase = 'wave';
    w.wave = 1;
    w.pendingLevelUps = 2;
    // A second of cruising before the first checkpoint: picks are queued, the fight goes on.
    runUntil(w, (x) => x.time > 1);
    expect(w.phase).toBe('wave');
    expect(w.pendingLevelUps).toBe(2);
    expect(w.dist).toBeGreaterThan(0);
    expect(w.dist).toBeLessThan(PICK_EVERY);
  });

  it('show at the next checkpoint after an ease to a stop, one after another', () => {
    const w = createRun({ seed: 11, content: CONTENT });
    w.phase = 'wave';
    w.wave = 1;
    w.pendingLevelUps = 2;
    runUntil(w, (x) => x.phase === 'levelup', 120 * 30);
    expect(w.phase).toBe('levelup');
    expect(w.dist).toBeGreaterThanOrEqual(PICK_EVERY);
    // The stall eased down during the stop: it moved less than a full cruise over CALM_TIME.
    expect(w.dist - PICK_EVERY).toBeLessThan(5 * CALM_TIME);
    // Both queued picks show in this stop: after the first, the second comes straight away.
    const queued = w.pendingLevelUps;
    expect(queued).toBeGreaterThanOrEqual(2);
    chooseCard(w, 0);
    expect(w.phase).toBe('levelup');
    expect(w.pendingLevelUps).toBe(queued - 1);
    while ((w.phase as string) === 'levelup') chooseCard(w, 0);
    expect(w.phase).toBe('wave');
    expect(w.pendingLevelUps).toBe(0);
    // Cruise resumes and the street does not stop again until the next checkpoint.
    const before = w.dist;
    runUntil(w, (x) => x.time > w.time + 1);
    expect(w.dist).toBeGreaterThan(before);
  });

  it('a pick queued after a checkpoint waits for the next one', () => {
    const w = createRun({ seed: 5, content: CONTENT });
    w.phase = 'wave';
    w.wave = 1;
    // Nothing queued while the street passes the 250 m checkpoint (kills would queue picks there).
    for (let i = 0; i < 3600 && w.dist < PICK_EVERY + 5; i++) {
      w.player.hp = w.player.stats.maxHp;
      w.enemies = [];
      w.pendingLevelUps = 0;
      step(w, DT, autoInput(w));
    }
    expect(w.dist).toBeGreaterThanOrEqual(PICK_EVERY + 5);
    w.pendingLevelUps = 1;
    runUntil(w, (x) => x.phase === 'levelup', 120 * 30);
    expect(w.phase).toBe('levelup');
    expect(w.dist).toBeGreaterThanOrEqual(2 * PICK_EVERY);
  });

  it('the boss waits for queued picks, then steps out', () => {
    const w = createRun({ seed: 9, content: CONTENT });
    w.phase = 'wave';
    w.wave = 1;
    w.dist = bossAtOf(w.chapter) - 2;
    w.pendingLevelUps = 1;
    runUntil(w, (x) => x.phase === 'levelup', 60 * 30);
    expect(w.phase).toBe('levelup');
    expect(w.flowBoss).toBeFalsy();
    chooseCard(w, 0);
    runUntil(w, (x) => !!x.flowBoss, 60 * 30);
    expect(w.flowBoss).toBe(true);
    expect(w.enemies.some((e) => e.boss)).toBe(true);
  });

  it('the HUD chip opens queued picks at once, by choice', () => {
    const w = createRun({ seed: 3, content: CONTENT });
    w.phase = 'wave';
    w.wave = 1;
    expect(openPicks(w)).toBe(false); // nothing queued
    w.pendingLevelUps = 1;
    w.dist = 100;
    expect(openPicks(w)).toBe(true);
    expect(w.phase).toBe('levelup');
    expect(w.offer.length).toBeGreaterThan(0);
    expect(w.pickAt).toBe(nextPickStop(100, bossAtOf(w.chapter)));
    chooseCard(w, autoPick(w));
    expect(w.phase).toBe('wave');
    // Tapping early does not replay the checkpoint it skipped.
    runUntil(w, (x) => x.time > 1);
    expect(w.phase).toBe('wave');
  });

  it('waves mode still offers level-ups at once', () => {
    const w = createRun({ seed: 2, content: CONTENT, mode: 'waves' });
    w.pendingLevelUps = 1;
    step(w, DT, autoInput(w));
    expect(w.phase).toBe('levelup');
    expect(openPicks(w)).toBe(false); // not a flow run
  });

  it('nextPickStop: next multiple, capped at the boss mark, none past it', () => {
    expect(nextPickStop(0, 1200)).toBe(PICK_EVERY);
    expect(nextPickStop(249, 1200)).toBe(250);
    expect(nextPickStop(250, 1200)).toBe(500);
    expect(nextPickStop(1100, 1200)).toBe(1200);
    expect(nextPickStop(1200, 1200)).toBe(Infinity);
  });
});
