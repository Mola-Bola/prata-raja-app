import { describe, expect, it, vi } from 'vitest';

import { CONTENT } from '@/content';
import { createRun } from '@/core/sim';
import type { OwnedBread } from '@/core/types';

import { makeLayout } from '../layout';
import { Stall } from '../stall';

const { image } = vi.hoisted(() => ({
  image: (key: string) => ({
    key, width: 100, height: 100, scaleX: 1, scaleY: 1, alpha: 1,
    setOrigin() { return this; }, setDepth() { return this; }, setPosition() { return this; },
    setRotation() { return this; }, setVisible() { return this; }, setTint() { return this; },
    clearTint() { return this; }, setFlipX() { return this; },
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setAlpha(a: number) { this.alpha = a; return this; },
  }),
}));

vi.mock('phaser', () => ({}));
vi.mock('../tex', () => ({
  addImage: (_scene: unknown, key: string) => image(key),
  addCrop: (_scene: unknown, key: string) => image(key),
  setImage: (img: ReturnType<typeof image>, key: string) => { img.key = key; },
}));

function setup(id: OwnedBread['id'] = 'kosong') {
  const slots: ReturnType<typeof image>[] = [];
  const pool = { get: (key: string) => { const img = image(key); slots.push(img); return img; }, put: vi.fn() };
  const stall = new Stall({} as never, pool as never);
  stall.setLayout(makeLayout(390, 844));
  const bread: OwnedBread = { id, level: 1, cd: 0, volleyLeft: 0, volleyT: 0 };
  const player = createRun({ seed: 1, content: CONTENT }).player;
  player.breads = [bread];
  const draw = (dt: number, calm = false) => stall.update(player, 'wave', 1, 1, dt, calm);
  draw(0.4);
  return { bread, img: slots[0], draw, stall, player };
}

describe('counter bread readiness', () => {
  it('dims cooling bread, brightens near ready and compresses once per throw', () => {
    const { bread, img, draw } = setup();
    const size = img.scaleX;
    bread.cd = 1;
    draw(0.02);
    expect(img.alpha).toBeCloseTo(0.62);
    expect(img.scaleX).toBeGreaterThan(size);
    expect(img.scaleY).toBeLessThan(size);
    bread.cd = 0.5;
    draw(0.18);
    expect(img.scaleX).toBeCloseTo(size);
    expect(img.scaleY).toBeCloseTo(size);
    bread.cd = 0.15;
    draw(0.01);
    expect(img.alpha).toBeCloseTo(0.81);
    bread.cd = 0;
    draw(0.01);
    expect(img.alpha).toBe(1);
  });

  it('keeps throw scale steady with reduced motion while retaining readiness', () => {
    const { bread, img, draw } = setup();
    const size = img.scaleX;
    bread.cd = 1;
    draw(0.02, true);
    expect(img.alpha).toBeCloseTo(0.62);
    expect(img.scaleX).toBe(size);
    expect(img.scaleY).toBe(size);
  });

  it('keeps orbiting Vadai bright and still', () => {
    const { bread, img, draw } = setup('vadai');
    const size = img.scaleX;
    bread.cd = 1;
    draw(0.02);
    expect(img.alpha).toBe(1);
    expect(img.scaleX).toBe(size);
    expect(img.scaleY).toBe(size);
  });

  it('preserves upgrade pop and resets throw state when the bread changes', () => {
    const { bread, img, draw } = setup();
    const size = img.scaleX;
    bread.cd = 1;
    draw(0.01);
    bread.level++;
    draw(0.24);
    expect(img.scaleX).toBeCloseTo(size * 1.25);
    expect(img.scaleY).toBeCloseTo(size * 1.25);
    bread.id = 'naan';
    bread.level = 1;
    bread.cd = 0;
    draw(0.4);
    expect(img.key).toBe('breads/naan');
    expect(img.alpha).toBe(1);
    expect(img.scaleX).toBeCloseTo(size);
    expect(img.scaleY).toBeCloseTo(size);
  });
});
