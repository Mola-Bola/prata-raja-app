import { describe, expect, it } from 'vitest';
import { FIELD } from '@/core/types';
import { makeLayout, Projector } from '../layout';

const setup = (w = 390, h = 844) => {
  const layout = makeLayout(w, h);
  const p = new Projector();
  p.setLayout(layout);
  return { layout, p };
};

describe('street projection', () => {
  it('emerges near the vanishing point, reads at 0.42 scale, then opens into the fighting lanes', () => {
    const { p, layout } = setup();
    for (const x of [-230, 0, 230]) {
      p.at(x, FIELD.depth);
      expect(Math.abs(p.sx - layout.w / 2)).toBeLessThan(12);
      expect(p.sy).toBeCloseTo(layout.view.horizonY);
      expect(p.s).toBeCloseTo(0.42);
    }
    p.at(230, 650);
    expect(p.laneScale).toBe(1);
    expect(p.sx - layout.w / 2).toBeGreaterThan(80);
  });

  it('walks continuously down and outward to the counter, preserving the counter lanes', () => {
    for (const [w, h] of [[360, 640], [390, 844], [412, 915]]) {
      const { p, layout } = setup(w, h);
      let sx = w / 2;
      let sy = 0;
      for (let y = FIELD.depth; y > FIELD.reachY; y -= 10) {
        p.at(180, y);
        expect(p.sx).toBeGreaterThanOrEqual(sx);
        expect(p.sy).toBeGreaterThanOrEqual(sy);
        sx = p.sx; sy = p.sy;
      }
      p.at(180, FIELD.reachY);
      expect(p.sx).toBeCloseTo(w / 2 + 180 * layout.ppu);
      expect(p.sy).toBeCloseTo(layout.view.counterY);
      expect(p.s).toBe(1);
    }
  });
});
