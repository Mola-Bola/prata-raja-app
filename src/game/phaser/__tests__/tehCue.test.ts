import { describe, expect, it, vi } from 'vitest';

import { CONTENT } from '@/content';
import { createRun } from '@/core/sim';

import { makeLayout } from '../layout';
import { ELITE_TINT, WHITE } from '../look';
import { Stall } from '../stall';
import { tehCue } from '../tehCue';

const neutral = { remaining: 0, elapsed: 0, scale: 1, warm: false };

describe('Teh timer cue', () => {
  it('stays neutral before activation and returns to neutral immediately on expiration', () => {
    expect(tehCue(neutral, 0)).toEqual(neutral);
    const active = tehCue(neutral, 3);
    expect(active.warm).toBe(true);
    expect(tehCue(active, 0)).toEqual(neutral);
  });

  it('pops on activation, settles to a smaller pulse, and pops again on a refresh', () => {
    const start = tehCue(neutral, 3);
    const pop = tehCue(start, 2.88);
    expect(pop.scale).toBeGreaterThan(1.12);
    const ongoing = tehCue(pop, 2.5);
    expect(ongoing.scale).toBeLessThanOrEqual(1.04);
    const restart = tehCue(ongoing, 3);
    expect(restart.elapsed).toBe(0);
    expect(tehCue(restart, 2.88).scale).toBeCloseTo(pop.scale);
  });

  it('freezes with the sim timer and suppresses motion for reduced motion', () => {
    const cue = tehCue(tehCue(neutral, 3), 2.88);
    expect(tehCue(cue, 2.88)).toEqual(cue);
    expect(tehCue(cue, 2.8, true, true)).toMatchObject({ scale: 1, warm: true });
  });

  it('hides outside combat without inventing a new activation when combat resumes', () => {
    const cue = tehCue(tehCue(neutral, 3), 2.5);
    const hidden = tehCue(cue, 2.5, false);
    expect(hidden).toMatchObject({ scale: 1, warm: false, elapsed: 0.5 });
    expect(tehCue(hidden, 2.5)).toEqual(cue);
  });
});

const { image } = vi.hoisted(() => ({
  image: (key: string) => ({
    key, width: 100, height: 100, scaleX: 1, scaleY: 1, tint: 0xffffff,
    setOrigin() { return this; }, setDepth() { return this; }, setPosition() { return this; },
    setRotation() { return this; }, setVisible() { return this; }, setFlipX() { return this; },
    setTint(tint: number) { this.tint = tint; return this; },
    clearTint() { this.tint = 0xffffff; return this; }, setAlpha() { return this; },
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
  }),
}));
vi.mock('phaser', () => ({}));
vi.mock('../tex', () => ({
  addImage: (_scene: unknown, key: string) => image(key),
  addCrop: (_scene: unknown, key: string) => image(key),
  setImage: (img: ReturnType<typeof image>, key: string) => { img.key = key; },
}));

function setup() {
  const slots: ReturnType<typeof image>[] = [];
  const pool = { get: (key: string) => { const img = image(key); slots.push(img); return img; }, put: vi.fn() };
  const stall = new Stall({} as never, pool as never);
  stall.setLayout(makeLayout(390, 844));
  const player = createRun({ seed: 1, content: CONTENT }).player;
  player.dips = [{ id: 'teh-tarik', level: 1 }];
  player.buffs = [{ id: 'haste', time: 0, stacks: 0, hitCount: 2 }];
  const draw = (dt = 0.01) => stall.update(player, 'wave', 1, 1, dt);
  draw(0.4);
  return { stall, player, draw, cup: slots[0], pool, slots };
}

describe('counter Teh cup', () => {
  it('tracks real haste, preserves add/upgrade pop and clears on expiration', () => {
    const { player, draw, cup } = setup();
    const size = cup.scaleX;
    expect(cup.tint).toBe(WHITE);
    player.buffs[0].time = 3;
    draw();
    expect(cup.tint).toBe(ELITE_TINT);
    player.buffs[0].time = 2.88;
    draw();
    expect(cup.scaleX).toBeGreaterThan(size * 1.12);
    player.dips[0].level++;
    draw(0.24);
    expect(cup.scaleX).toBeCloseTo(size * 1.25);
    player.buffs[0].time = 0;
    draw(0.4);
    expect(cup.tint).toBe(WHITE);
    expect(cup.scaleX).toBeCloseTo(size);
  });

  it('clears a warm cup on replacement, empty player and reset', () => {
    const { stall, player, draw, cup, pool, slots } = setup();
    player.buffs[0].time = 3;
    draw();
    stall.update(null, null, 1, 1, 0.4);
    expect(cup.tint).toBe(WHITE);
    draw();
    player.dips[0].id = 'ghee';
    draw(0.4);
    expect(cup.tint).toBe(WHITE);
    player.dips[0].id = 'teh-tarik';
    draw(0.4);
    stall.reset();
    expect(pool.put).toHaveBeenCalledWith(cup);
    player.buffs[0].time = 0;
    draw(0.4);
    expect(slots.filter((img) => img.key === 'dips/teh-tarik').at(-1)?.tint).toBe(WHITE);
  });
});
