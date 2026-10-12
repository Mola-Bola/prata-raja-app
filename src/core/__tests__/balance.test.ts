import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { simulateRun } from '../autoplay';
import type { RunResult } from '../types';

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const MAX_TIME = 1200;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The bot always dodges and stands still; what it picks on level-up is the one knob: how many breads it carries. */
const POLICIES = [
  { name: 'takes new breads (up to 4)', maxBreads: 4 },
  { name: 'solo Kosong', maxBreads: 1 },
];

describe('balance (autoplay bot, real content, seeds 1..20)', () => {
  it('every run ends before maxTime; prints median wave, win rate, avg level / time / kills per pick policy', () => {
    const lines = ['| bot picks | median wave | win rate | avg level | avg time (s) | avg kills |', '|---|---|---|---|---|---|'];
    for (const { name, maxBreads } of POLICIES) {
      const runs: RunResult[] = SEEDS.map((seed) => simulateRun({ seed, content: CONTENT, maxTime: MAX_TIME, maxBreads }));
      for (const r of runs) expect(r.time).toBeLessThan(MAX_TIME);
      const wins = runs.filter((r) => r.won).length;
      lines.push(
        `| ${name} | ${median(runs.map((r) => r.wave))} | ${Math.round((100 * wins) / runs.length)}% | ${mean(runs.map((r) => r.level)).toFixed(1)} | ${mean(runs.map((r) => r.time)).toFixed(0)} | ${mean(runs.map((r) => r.kills)).toFixed(0)} |`,
      );
    }
    console.log(lines.join('\n'));
  }, 600_000);
});
