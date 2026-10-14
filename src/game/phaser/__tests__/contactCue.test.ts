import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTENT } from '@/content';
import { createRun } from '@/core/sim';
import type { Enemy } from '@/core/types';
import { Actors } from '../actors';
import { DangerCue } from '../danger';
import { DANGER, ELITE_TINT } from '../look';
import { makeLayout, Projector } from '../layout';

vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0, FILL: 1 }, BlendModes: { NORMAL: 0 } }));
afterEach(() => vi.unstubAllGlobals());

function image() {
  return { width: 100, height: 100, x: 0, y: 0, scaleX: 1, scaleY: 1,
    setOrigin() { return this; }, setTint() { return this; }, setTintMode() { return this; }, setDepth() { return this; },
    setRotation() { return this; }, setAlpha() { return this; }, setFlipX() { return this; }, setVisible() { return this; },
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
  };
}
function setup(calm = false) {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: calm }) });
  const w = createRun({ seed: 3, content: CONTENT }); w.phase = 'wave';
  w.player.breads = []; w.projectiles = []; w.zones = [];
  const e: Enemy = { uid: 1, def: { id: 'fixture', name: 'Walker', kind: 'walker', hp: 100, speed: 0, contactDps: 5, radius: 18, xp: 0, sprite: 'enemies/roach' }, boss: false, elite: false,
    x: 0, y: 30, hp: 100, maxHp: 100, shield: 0, statuses: [], state: 'attack', contactClock: 0, t: 0, age: 1, knock: 0, flash: 0, cooldowns: {}, phase: 0, holdY: 0 };
  w.enemies = [e];
  const layout = makeLayout(390, 844); const projector = new Projector(); projector.setLayout(layout);
  const actors = new Actors(projector, { get: () => image(), put: vi.fn() } as never, {} as never); actors.setLayout(layout);
  const texts: { value: string; visible: boolean; x: number; y: number }[] = [];
  const draws: { colors: number[]; radii: number[]; visible: boolean }[] = [];
  const graphics = () => { const record = { colors: [] as number[], radii: [] as number[], visible: false }; draws.push(record); return ({ setDepth() { return this; }, setVisible(v: boolean) { record.visible = v; return this; }, clear() { record.colors = []; record.radii = []; return this; }, fillStyle(color: number) { record.colors.push(color); return this; }, lineStyle() { return this; },
    fillEllipse() { return this; }, strokeEllipse() { return this; }, fillCircle(_x: number, _y: number, r: number) { record.radii.push(r); return this; }, strokeCircle() { return this; }, fillRoundedRect() { return this; }, strokeRoundedRect() { return this; } }); };
  const scene = { add: { graphics, text: () => { const t = { value: '!', visible: false, x: 0, y: 0, style: { color: '#fff4e0' },
    setOrigin() { return this; }, setDepth() { return this; }, setFontSize() { return this; },
    setScale() { return this; }, setColor(color: string) { this.style.color = color; return this; }, setText(v: string) { this.value = v; return this; }, setVisible(v: boolean) { this.visible = v; return this; }, setPosition(x: number, y: number) { this.x = x; this.y = y; return this; } };
    texts.push(t); return t; } } };
  const danger = new DangerCue(scene as never, actors);
  const draw = () => { actors.draw(w, 1, 50, 0); danger.update(w, layout, 50, calm); };
  return { w, e, actors, draw, texts, layout, draws };
}

describe('counter attack rendering', () => {
  it('maps each real phase to preparation, lunge and recovery independently of aggregate contact events', () => {
    const { w, e, actors, draw, texts, draws } = setup();
    draw(); const baseline = actors.viewOf(1)!.body.y;
    e.contactClock = .15; draw(); expect(actors.viewOf(1)!.body.y).toBeCloseTo(baseline - 7 * .25);
    expect(texts[0].value).toBe('!'); expect(texts[0].visible).toBe(true); expect(draws[1].colors).toEqual([ELITE_TINT]);
    const prepRadius = draws[1].radii[0];
    e.contactClock = .4; draw(); expect(actors.viewOf(1)!.body.y).toBeCloseTo(baseline + 16);
    expect(texts[0].visible).toBe(true); expect(draws[1].colors).toEqual([DANGER]); expect(draws[1].radii[0]).toBeGreaterThan(prepRadius);
    const position = actors.viewOf(1)!.body.y;
    w.contactT = .49; actors.counterHit(); draw(); expect(actors.viewOf(1)!.body.y).toBe(position);
    expect(actors.viewOf(1)!.attackT).toBe(0);
    e.contactClock = .75; draw(); expect(actors.viewOf(1)!.body.y).toBeCloseTo(baseline - 1.5);
    expect(texts[0].visible).toBe(false); expect(draws[0].visible).toBe(true); expect(draws[1].visible).toBe(false);
  });

  it('clears stale warnings immediately on control, displacement or death, and clamps full strike badges inside phone edges', () => {
    const { e, draw, texts, layout } = setup();
    draw(); expect(texts[0].visible).toBe(true);
    e.statuses = [{ id: 'stun', time: 1, stacks: 1, dps: 0, amount: 0 }]; draw(); expect(texts[0].visible).toBe(false);
    e.statuses = []; e.y = 31; draw(); expect(texts[0].visible).toBe(false);
    e.y = 30; e.x = 270; e.contactClock = .4; draw(); expect(texts[0].x).toBeLessThanOrEqual(layout.w - 17 * layout.u);
    e.state = 'dead'; draw(); expect(texts[0].visible).toBe(false);
  });

  it('reduced motion keeps phase warnings truthful and steady with no added prep/lunge displacement', () => {
    const { e, actors, draw, texts, draws } = setup(true);
    draw(); const baseline = actors.viewOf(1)!.body.y;
    for (const clock of [.05, .15, .4, .75]) {
      e.contactClock = clock; draw(); expect(actors.viewOf(1)!.body.y).toBe(baseline);
      expect(texts[0].visible).toBe(clock < .5);
      if (clock < .5) expect(draws[1].radii[0]).toBe(15);
    }
  });
});
