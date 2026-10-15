import { describe, expect, it } from 'vitest';
import { makeRng } from '../rng';

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
