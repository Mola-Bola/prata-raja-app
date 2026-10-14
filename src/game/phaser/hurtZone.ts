// Kannan's hurt zone, drawn on the floor under him: a faint ellipse exactly as wide as the contact zone the sim uses
// (FIELD.kannanHitHalfWidth), so a shot that looks like it will land can be judged by eye. It flashes red while he is being hurt
// (the sim's hurtAnim). Code-drawn: one Graphics, redrawn per frame, nothing in the sim.
import * as Phaser from 'phaser';

import { FIELD, type Player } from '@/core/types';

import type { Layout } from './layout';
import { D, DANGER, WHITE } from './look';

/** The sim sets hurtAnim to this on each hit (and each contact tick). */
const FLASH_S = 0.2;
/** Ellipse height as a share of its width: it lies on the floor. */
const FLAT = 0.3;

export class HurtZone {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    // Over the counter, under the bowls, Kannan and the shots.
    this.g = scene.add.graphics().setDepth(D.counter + 2).setVisible(false);
  }

  clear(): void {
    this.g.clear().setVisible(false);
  }

  /** `fieldX` and `feetY` are where Kannan is drawn (stall.ts); `p` null hides the zone. */
  update(p: Player | null, fieldX: number, feetY: number, l: Layout): void {
    if (!p) return this.clear();
    const rx = FIELD.kannanHitHalfWidth * l.ppu;
    const ry = rx * FLAT;
    const x = l.w / 2 + fieldX * l.ppu;
    const q = Math.min(1, Math.max(0, p.hurtAnim / FLASH_S));
    const g = this.g;
    g.clear().setVisible(true);
    g.fillStyle(WHITE, 0.07 * (1 - q)).fillEllipse(x, feetY, rx * 2, ry * 2);
    g.lineStyle(Math.max(1, 1.2 * l.u), WHITE, 0.24 * (1 - q)).strokeEllipse(x, feetY, rx * 2, ry * 2);
    if (q > 0) {
      g.fillStyle(DANGER, 0.3 * q).fillEllipse(x, feetY, rx * 2, ry * 2);
      g.lineStyle(Math.max(1.5, 2 * l.u), DANGER, 0.9 * q).strokeEllipse(x, feetY, rx * 2, ry * 2);
    }
  }
}
