// The scrolling street: procedural props that stream toward the counter as the stall travels (world.dist). Three layers, far to
// near on one Graphics: the road (lane dashes and kerb stripe), the shopfronts and stalls along both sides, and lamp posts.
// Everything is a pure function of dist, so a paused run holds still and a replayed seed shows the same street.
import * as Phaser from 'phaser';

import { brand } from '@/ui/brand';
import { FIELD } from '@/core/types';

import type { Projector } from './layout';
import { D } from './look';

const hex = (c: string): number => parseInt(c.slice(1), 16);
const C = {
  line: hex(brand.light.background),
  kerb: hex(brand.light.surface),
  shop: hex(brand.light.onSurface),
  awnA: hex(brand.semantic.light.coral),
  awnB: hex(brand.light.onSurface),
  pole: hex(brand.light.onSurfaceVariant),
  lamp: hex(brand.light.primaryContainer),
};

/** Field units the street moves per metre the stall travels. */
export const U_PER_M = 10;
const DASH = { period: 160, len: 70, x: 120 };
const FAR = FIELD.depth - 40;

export class Street {
  private g: Phaser.GameObjects.Graphics;
  private last = Number.NaN;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(D.ground).setVisible(false);
  }

  setVisible(on: boolean): void {
    this.g.setVisible(on);
    if (!on) this.g.clear();
    this.last = Number.NaN;
  }

  /** Redraw for `dist` metres travelled (call every frame; it skips when nothing moved). */
  draw(dist: number, proj: Projector): void {
    if (!this.g.visible || dist === this.last) return;
    this.last = dist;
    const g = this.g;
    g.clear();
    const scroll = dist * U_PER_M;
    // Layer 1: lane dashes on two lines and a kerb stripe at each edge, sliding toward the counter.
    for (let k = Math.ceil((FAR + scroll) / DASH.period); k >= Math.floor((scroll - DASH.len) / DASH.period); k--) {
      const y0 = k * DASH.period - scroll;
      const y1 = y0 + DASH.len;
      if (y1 < FIELD.reachY || y0 > FAR) continue;
      for (const sx of [-DASH.x, DASH.x]) this.strip(proj, sx, Math.max(y0, FIELD.reachY), Math.min(y1, FAR), 5, C.line, 0.55);
    }
    // Shopfront and lamp-post blocks were removed (they read as boxes over the painted street); painted side strips come later.
  }

  private strip(proj: Projector, x: number, y0: number, y1: number, width: number, color: number, alpha: number): void {
    proj.at(x - width / 2, y0);
    const ax = proj.sx, ay = proj.sy;
    proj.at(x + width / 2, y0);
    const bx = proj.sx;
    proj.at(x + width / 2, y1);
    const cx = proj.sx, cy = proj.sy;
    proj.at(x - width / 2, y1);
    this.g.fillStyle(color, alpha).fillTriangle(ax, ay, bx, ay, cx, cy).fillTriangle(ax, ay, cx, cy, proj.sx, cy);
  }

  destroy(): void {
    this.g.destroy();
  }
}
