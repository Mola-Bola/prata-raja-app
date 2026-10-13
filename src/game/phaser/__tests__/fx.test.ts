import { describe, expect, it, vi } from 'vitest';

import { Fx } from '../fx';
import { MAX_NUMBERS, NUMBER_COLOR } from '../look';

vi.mock('phaser', () => ({ BlendModes: { ADD: 1 } }));

function setup() {
  const texts: ReturnType<typeof text>[] = [];
  function text() {
    return {
      visible: false, color: '', value: '', x: 0, y: 0, scale: 1, alpha: 1,
      setOrigin() { return this; }, setDepth() { return this; }, setFontSize() { return this; }, setStroke() { return this; },
      setVisible(v: boolean) { this.visible = v; return this; },
      setColor(v: string) { this.color = v; return this; },
      setText(v: string) { this.value = v; return this; },
      setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
      setScale(v: number) { this.scale = v; return this; },
      setAlpha(v: number) { this.alpha = v; return this; },
    };
  }
  const graphics = { visible: false, setDepth() { return this; }, fillStyle() {}, fillTriangle() {}, clear() {}, setVisible(v: boolean) { this.visible = v; } };
  const scene = { add: { text: () => { const t = text(); texts.push(t); return t; }, graphics: () => graphics } };
  return { fx: new Fx(scene as never, { get: () => { throw new Error('no particles expected'); }, put: () => {} }), texts };
}

describe('damage numbers', () => {
  it('merges chip ticks per target, pops with a perspective floor, rises 40px and expires', () => {
    const { fx, texts } = setup();
    fx.number(1, 100, 200, 2, 2, 0.3);
    fx.number(1, 100, 200, 3, 2, 0.3);
    expect(fx.numbersLive).toBe(1);
    const t = texts[0];
    expect(t.value).toBe('5');
    expect(t.color).toBe(NUMBER_COLOR.chip);
    fx.update(0.1);
    expect(t.scale).toBeCloseTo(0.85 * 0.85);
    fx.update(0.4);
    expect(t.y).toBe(160);
    expect(t.alpha).toBeLessThan(1);
    fx.update(0.1);
    expect(fx.numbersLive).toBe(0);
    expect(t.visible).toBe(false);
  });

  it('makes crits and big hits larger and red-orange, including merged big hits', () => {
    const { fx, texts } = setup();
    fx.number(1, 0, 0, 20, 0);
    fx.number(1, 0, 0, 20, 0);
    fx.number(2, 0, 0, 5, 1);
    fx.update(0.01);
    expect(texts[0].value).toBe('40');
    expect(texts[0].color).toBe(NUMBER_COLOR.big);
    expect(texts[1].color).toBe(NUMBER_COLOR.big);
    expect(texts[0].scale).toBeGreaterThan(1.25);
  });

  it('caps live numbers and reserves space for hits over DoT ticks', () => {
    const { fx } = setup();
    for (let uid = 0; uid < 30; uid++) fx.number(uid, 0, 0, 1, 2);
    expect(fx.numbersLive).toBe(8);
    for (let uid = 30; uid < 100; uid++) fx.number(uid, 0, 0, 10, 0);
    expect(fx.numbersLive).toBe(MAX_NUMBERS);
    fx.clear();
    expect(fx.numbersLive).toBe(0);
  });
});
