import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { autoInput, autoPick, simulateRun } from '../autoplay';
import { bossAtOf, pressureAt } from '../director';
import { chooseCard, createRun, drainEvents, step } from '../sim';
import type { World } from '../types';

const chapter = CONTENT.chapters[0];

/** A bot run until it ends (or `until`), with a trace of every kill. */
function play(seed: number, until?: (w: World) => boolean, god = false): { w: World; trace: string } {
  const w = createRun({ seed, content: CONTENT });
  let trace = '';
  for (let i = 0; i < 1200 * 30 && w.phase !== 'won' && w.phase !== 'lost' && !until?.(w); i++) {
    if (god) w.player.hp = w.player.stats.maxHp;
    if (w.phase === 'levelup') chooseCard(w, autoPick(w));
    else step(w, 1 / 30, autoInput(w));
    for (const ev of drainEvents(w)) if (ev.t === 'kill') trace += `${ev.uid}@${w.time.toFixed(2)},`;
  }
  return { w, trace };
}

describe('flow director', () => {
  it('normal chapters run in flow mode; Test Kitchen can ask for waves', () => {
    expect(chapter.mode).toBe('flow');
    expect(createRun({ seed: 1, content: CONTENT }).chapter.mode).toBe('flow');
    expect(createRun({ seed: 1, content: CONTENT, mode: 'waves' }).chapter.mode).toBe('waves');
  });

  it('same seed and inputs give the same world', () => {
    const a = play(7);
    const b = play(7);
    expect(a.trace).toBe(b.trace);
    expect(a.w.result).toEqual(b.w.result);
    expect(JSON.stringify(a.w)).toBe(JSON.stringify(b.w));
  }, 60_000);

  it('pressure ramps up over distance and blends smoothly', () => {
    const at = (f: number) => pressureAt(chapter, f * bossAtOf(chapter));
    const rates = [0.02, 0.2, 0.4, 0.6, 0.8, 0.98].map((f) => at(f).rate);
    expect(rates[5]).toBeGreaterThan(rates[0] * 2);
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1] - 1e-9);
    // No jumps: a one-metre step never moves the rate by more than a few percent of a threat point per second.
    let prev = at(0).rate;
    for (let d = 1; d < bossAtOf(chapter); d++) {
      const r = pressureAt(chapter, d).rate;
      expect(Math.abs(r - prev)).toBeLessThan(0.05);
      prev = r;
    }
    expect(Object.keys(at(0).mix)).not.toContain('burger-brute');
    expect(at(0.9).mix['burger-brute']).toBeGreaterThan(0);
  });

  it('the stall brakes at the boss mark, and the run is won with no new spawns once the boss dies', () => {
    const { w } = play(3, (x) => x.bossKills > 0, true);
    expect(w.bossKills).toBe(1);
    expect(w.dist).toBe(bossAtOf(chapter));
    const uid = w.nextUid;
    step(w, 1 / 30, autoInput(w));
    expect(w.phase).toBe('won');
    expect(w.result).toMatchObject({ won: true, dist: bossAtOf(chapter), bossKills: 1 });
    step(w, 1, autoInput(w));
    expect(w.nextUid).toBe(uid);
  }, 60_000);

  it('no boss before the mark', () => {
    let spawned = false;
    const w = createRun({ seed: 5, content: CONTENT });
    for (let i = 0; i < 30 * 60 && w.dist < bossAtOf(chapter) - 1 && w.phase !== 'lost'; i++) {
      if (w.phase === 'levelup') chooseCard(w, autoPick(w));
      else step(w, 1 / 30, autoInput(w));
      if (drainEvents(w).some((e) => e.t === 'bossSpawn')) spawned = true;
    }
    expect(spawned).toBe(false);
  }, 60_000);

  it('the autoplay bot finishes flow runs without timing out', () => {
    for (const seed of [1, 2, 3]) {
      const r = simulateRun({ seed, content: CONTENT, maxTime: 1200 });
      expect(r.time).toBeLessThan(1200);
      expect(r.dist).toBeGreaterThan(0);
      expect(r.dist).toBeLessThanOrEqual(bossAtOf(chapter));
      if (r.won) expect(r.dist).toBe(bossAtOf(chapter));
    }
  }, 120_000);
});
