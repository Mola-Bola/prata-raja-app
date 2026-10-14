import { describe, expect, it } from 'vitest';

import { BOUNDS, route, START, STATIONS, step, stationNear, walkTime } from '../layout';

const walk = (from: { x: number; y: number }, to: { x: number; y: number }) => walkTime(from, route(from, to));

describe('hub layout', () => {
  it('puts every station on the floor, free of props', () => {
    for (const s of STATIONS) {
      expect(s.x).toBeGreaterThanOrEqual(BOUNDS.x0); expect(s.x).toBeLessThanOrEqual(BOUNDS.x1);
      expect(s.y).toBeGreaterThanOrEqual(BOUNDS.y0); expect(s.y).toBeLessThanOrEqual(BOUNDS.y1);
      expect(step(s.x, s.y, 0, 0)).toEqual({ x: s.x, y: s.y });
      expect(stationNear(s.x, s.y)?.id).toBe(s.id);
    }
  });
  it('is under 3 s from any station to any other, and from the start', () => {
    for (const a of [START, ...STATIONS]) for (const b of STATIONS) expect(walk(a, b), `${JSON.stringify(a)} to ${b.id}`).toBeLessThan(3);
  });
});
