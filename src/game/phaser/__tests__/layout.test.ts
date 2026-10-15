import { describe, expect, it } from 'vitest';

import { makeLayout, Projector } from '../layout';

describe('top-down projection', () => {
  it('puts field y = 0 on the ground line and goes straight up the screen at equal size', () => {
    const l = makeLayout(390, 844);
    const p = new Projector();
    p.setLayout(l);
    p.at(0, 0);
    expect(p.sx).toBeCloseTo(l.w / 2);
    expect(p.sy).toBeCloseTo(l.top.groundY);
    const y0 = p.sy;
    p.at(100, 300);
    expect(p.sx).toBeCloseTo(l.w / 2 + 100 * l.top.ppu);
    expect(p.sy).toBeLessThan(y0);
    expect(p.s).toBe(1);
  });
});
