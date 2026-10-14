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
const SHOP = { period: 210, x: 330 };
const LAMP = { period: 480, x: 300 };
const FAR = FIELD.depth - 40;

/** Cheap stable hash of an integer to 0..1 (shop shapes), so the same street always looks the same. */
const rnd = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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
      for (const sx of [-FIELD.halfWidth - 20, FIELD.halfWidth + 20]) this.strip(proj, sx, Math.max(y0, FIELD.reachY), Math.min(y1, FAR), 14, C.kerb, 0.35);
    }
    // Layer 2: shopfronts and stalls along both sides, each a dark block with an awning, far ones first.
    for (let k = Math.ceil((FAR + scroll) / SHOP.period); k >= Math.floor(scroll / SHOP.period); k--) {
      const y = k * SHOP.period - scroll;
      if (y < FIELD.reachY + 10 || y > FAR) continue;
      for (const side of [-1, 1]) {
        const r = rnd(k * 2 + (side > 0 ? 1 : 0));
        proj.at(side * SHOP.x, y);
        const s = proj.s;
        const w = (70 + 60 * r) * s * proj.ppu * proj.laneScale;
        const h = (110 + 120 * rnd(k + 7)) * s * proj.ppu;
        const cx = proj.sx;
        const base = proj.sy;
        const fade = Math.min(1, (FAR - y) / 200) * 0.5;
        g.fillStyle(C.shop, fade).fillRect(cx - w / 2, base - h, w, h);
        g.fillStyle(r > 0.5 ? C.awnA : C.awnB, fade + 0.15).fillRect(cx - w / 2 - 3 * s, base - h * 0.62, w + 6 * s, h * 0.16);
      }
    }
    // Layer 3: lamp posts on the kerbs: a pole and a warm lamp head.
    for (let k = Math.ceil((FAR + scroll) / LAMP.period); k >= Math.floor(scroll / LAMP.period); k--) {
      const y = k * LAMP.period - scroll + 60;
      if (y < FIELD.reachY + 10 || y > FAR) continue;
      for (const side of [-1, 1]) {
        proj.at(side * LAMP.x, y);
        const s = proj.s;
        const h = 300 * s * proj.ppu;
        const pw = Math.max(1.5, 7 * s * proj.ppu);
        g.fillStyle(C.pole, 0.7).fillRect(proj.sx - pw / 2, proj.sy - h, pw, h);
        g.fillStyle(C.lamp, 0.85).fillCircle(proj.sx, proj.sy - h, Math.max(2, 18 * s * proj.ppu));
      }
    }
  }

  /** A flat strip on the ground at field x, from y0 to y1, `width` field units wide (perspective makes it a trapezoid). */
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
