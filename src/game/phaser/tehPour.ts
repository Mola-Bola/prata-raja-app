// The teh tarik pour, while haste is on: a thin caramel ribbon is pulled from the cup on the counter up to Kannan's throwing
// hand (teh tarik poured between two mugs), a few foam droplets fall off it, and when haste ends a small froth puff rises from
// the cup. Reduced motion keeps only the tint (the cup's warm glow, and the bread in flight tinted; see actors.ts). The ribbon is
// one Graphics redrawn per frame; droplets are pooled sprites from the fx pool. Nothing here touches the sim.
import * as Phaser from 'phaser';

import type { Fx } from './fx';
import { CARAMEL, D, FROTH } from './look';

export type Pt = { x: number; y: number };

const SEGMENTS = 14;
const DROP_EVERY = 0.12;
const DROP_LIFE = 0.5;
const PUFF_LIFE = 0.34;
/** Ribbon width and arc height, in design px (the layout's u multiplies them). */
const RIBBON_PX = 3;
const ARC_SHARE = 0.4;

export class TehPour {
  private g: Phaser.GameObjects.Graphics;
  private on = false;
  private t = 0;
  private dropT = 0;
  private drop = 0;

  constructor(
    scene: Phaser.Scene,
    private fx: Fx,
  ) {
    if (!scene.textures.exists('tea-drop')) {
      const gr = scene.make.graphics({}, false);
      gr.fillStyle(CARAMEL, 1).fillTriangle(4, 0, 0, 7, 8, 7).fillCircle(4, 7, 4);
      gr.fillStyle(FROTH, 0.9).fillCircle(3, 6, 1.5);
      gr.generateTexture('tea-drop', 8, 11);
      gr.destroy();
    }
    this.g = scene.add.graphics().setDepth(D.kannan - 1).setVisible(false);
  }

  /** Drop any ribbon and the drop timer (a run ended or restarted). */
  reset(): void {
    this.on = false;
    this.t = 0;
    this.dropT = 0;
    this.g.clear().setVisible(false);
  }

  /** Call every frame. `cup` is the cup's mouth on screen (null without a teh tarik cup); `hand` is Kannan's throwing hand. */
  update(cup: Pt | null, hand: Pt, pouring: boolean, u: number, dt: number, calm: boolean): void {
    if (!pouring || !cup || calm) {
      // Haste just ended: a small froth puff rises from the cup (motion only; reduced motion gets no puff).
      if (this.on && cup && !calm) this.fx.spawn('fx/flour-puff', cup.x, cup.y, D.kannan + 2, PUFF_LIFE, 10 * u, 26 * u).tint(FROTH).fade(0.9, 0, 0.2);
      this.on = false;
      this.g.clear().setVisible(false);
      return;
    }
    this.on = true;
    this.t += dt;
    const g = this.g;
    g.clear().setVisible(true);
    // Quadratic arc from the cup's mouth up and over to the hand.
    const dx = hand.x - cup.x;
    const dy = hand.y - cup.y;
    const len = Math.hypot(dx, dy);
    const c = { x: (cup.x + hand.x) / 2, y: (cup.y + hand.y) / 2 - ARC_SHARE * len };
    const at = (k: number): Pt => {
      const m = 1 - k;
      return { x: m * m * cup.x + 2 * m * k * c.x + k * k * hand.x, y: m * m * cup.y + 2 * m * k * c.y + k * k * hand.y };
    };
    // The flow: a bright band runs along the ribbon, so it reads as pulled, not static.
    for (let i = 0; i < SEGMENTS; i++) {
      const a = at(i / SEGMENTS);
      const b = at((i + 1) / SEGMENTS);
      const flow = 0.5 + 0.5 * Math.sin(this.t * 10 - i * 0.9);
      g.lineStyle(RIBBON_PX * u, CARAMEL, 0.42 + 0.3 * flow).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(Math.max(1, 0.8 * u), FROTH, 0.15 + 0.35 * flow).lineBetween(a.x, a.y, b.x, b.y);
    }
    // Droplets fall off the stream on the way to the hand.
    this.dropT -= dt;
    if (this.dropT <= 0) {
      this.dropT = DROP_EVERY;
      this.drop = (this.drop + 1) % 7;
      const p = at(0.55 + 0.04 * this.drop);
      this.fx.spawn('tea-drop', p.x, p.y, D.kannan + 2, DROP_LIFE, 6 * u, 5 * u)
        .to(p.x, p.y + 34 * u, 2)
        .fade(0.95, 0, 0.3);
    }
  }
}
