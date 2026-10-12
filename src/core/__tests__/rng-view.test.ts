import { describe, expect, it } from 'vitest';
import { makeRng } from '../rng';
import { makeView, project, unprojectX } from '../view';

describe('rng', () => {
  it('replays the same sequence from the same seed and stays in range', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 1000; i++) {
      const n = a.next();
      expect(n).toBe(b.next());
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    expect(makeRng(a.state).next()).toBe(b.next());
  });
  it('weighted never picks a zero-weight item', () => {
    const r = makeRng(7);
    for (let i = 0; i < 500; i++) expect(r.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
  });
});

describe('view', () => {
  const v = makeView(400, 800);
  it('maps the counter line and horizon', () => {
    expect(project(0, 0, v)).toMatchObject({ sx: 200, sy: v.counterY, s: 1 });
    const far = project(0, 1000, v);
    expect(far.sy).toBeCloseTo(v.horizonY);
    expect(far.s).toBeCloseTo(0.3);
  });
  it('compresses distance and round-trips x on the counter', () => {
    expect(project(0, 500, v).sy - v.horizonY).toBeLessThan((v.counterY - v.horizonY) / 2);
    expect(unprojectX(project(135, 0, v).sx, v)).toBeCloseTo(135);
  });
});
