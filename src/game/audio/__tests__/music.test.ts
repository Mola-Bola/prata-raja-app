import { describe, expect, it } from 'vitest';
import { BPM, HUB_BPM, MODES, SONG_BARS, barAt, degreeMidi, genHubSection, genSection, midiHz, stepPlan, stepSeconds, stepsDue } from '../music';

describe('music', () => {
  it('maps degrees across octaves', () => {
    expect(degreeMidi('mayamalavagowla', 0, 60)).toBe(60);
    expect(degreeMidi('mayamalavagowla', 2, 60)).toBe(64);
    expect(degreeMidi('mayamalavagowla', 7, 60)).toBe(72);
    expect(degreeMidi('mohanam', -1, 60)).toBe(57);
    expect(midiHz(69)).toBe(440);
  });
  it('generates deterministic bars that stay in the mode and end phrases on Sa/Pa', () => {
    const a = genSection('mayamalavagowla', 8, 11, BPM);
    expect(genSection('mayamalavagowla', 8, 11, BPM)).toEqual(a);
    for (const [i, bar] of a.bars.entries()) {
      for (const n of bar.lead) {
        expect(n.step + n.len).toBeLessThanOrEqual(16);
        expect(MODES.mayamalavagowla).toContain(degreeMidi('mayamalavagowla', n.idx, 120) % 12);
      }
      if (i % 4 === 3) expect([0, 4]).toContain(bar.lead[bar.lead.length - 1].idx);
    }
  });
  it('loops the song and switches to the boss section', () => {
    expect(barAt(SONG_BARS, false).bar).toBe(barAt(0, false).bar);
    expect(barAt(0, true).section.mode).toBe('hanumatodi');
    expect(barAt(17, false).octUp).toBe(true);
  });
  it('schedules every step due inside the lookahead window', () => {
    const d = stepSeconds(BPM);
    expect(d).toBeCloseTo(0.0962, 3);
    const ts = stepsDue(1, 1, 0.3, d);
    expect(ts).toHaveLength(4);
    expect(ts[1] - ts[0]).toBeCloseTo(d);
    expect(stepsDue(2, 1, 0.15, d)).toEqual([]);
  });
  it('adds layers with intensity and fills every 4th bar', () => {
    expect(stepPlan(1, 0, false, 0, false).hat).toBe(false);
    expect(stepPlan(1, 0, false, 0.6, false).hat).toBe(true);
    expect(stepPlan(3, 0, false, 0.2, false).arp).toBe(false);
    expect(stepPlan(3, 0, false, 0.8, false).thavilRoll).toBe(true);
    expect(stepPlan(13, 3, true, 0, false).fillTom).toBe(true);
    expect(stepPlan(13, 2, false, 0, false).fillTom).toBe(false);
  });
  it('generates a calm hub loop: Mohanam at 96 BPM, deterministic per seed, thinner lead, sparse drums', () => {
    const h = genHubSection(61);
    expect(genHubSection(61)).toEqual(h);
    expect(HUB_BPM).toBe(96);
    expect(h.bpm).toBe(96);
    expect(h.mode).toBe('mohanam');
    const perBar = (s: { bars: { lead: unknown[] }[] }) => s.bars.reduce((n, b) => n + b.lead.length, 0) / s.bars.length;
    expect(perBar(h)).toBeLessThan(perBar(genSection('mayamalavagowla', 8, 11, BPM)));
    for (const bar of h.bars) for (const n of bar.lead) expect(n.step + n.len).toBeLessThanOrEqual(16);
    expect(barAt(8, false, true).bar).toBe(barAt(0, false, true).bar); // the hub loops its own 8 bars
    expect(barAt(0, false, true).section.bpm).toBe(96);
    expect(stepPlan(0, 0, false, 0, false, true).kick).toBe(true);
    expect(stepPlan(8, 0, false, 0, false, true).kick).toBe(true);
    expect(stepPlan(6, 0, false, 0, false, true).kick).toBe(false);
    expect(stepPlan(4, 0, false, 1, false, true).snare).toBe(false);
  });
});
