// The scrolling street: lane dashes plus roadside prop sprites (the chapter's `props`, three-quarter art) that stream toward the
// counter along both kerbs as the stall travels (world.dist).
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
const POOL = 12;
const GAP = 200; // field units between props on one kerb (~5 per side in view)
const PROP_H = 150; // field units on the long side at depth scale 1
const hash = (a: number, b: number): number => {
  let h = Math.imul(a * 2 + b, 0x9e3779b1) ^ Math.imul(a + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
};

export class Street {
  private g: Phaser.GameObjects.Graphics;
  private last = Number.NaN;
  private pool: Phaser.GameObjects.Image[] = [];
  private keys: string[] = [];

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(D.ground).setVisible(false);
    for (let i = 0; i < POOL; i++) this.pool.push(scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false));
  }

  /** Chapter's roadside set (keys under 'street/'); undefined = none. */
  setProps(keys?: string[]): void {
    this.keys = (keys ?? []).map((k) => `street/${k}`);
    this.last = Number.NaN;
  }

  setVisible(on: boolean): void {
    this.g.setVisible(on);
    if (!on) {
      this.g.clear();
      for (const im of this.pool) im.setVisible(false);
    }
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
    this.props(scroll, proj);
  }

  /** One prop per kerb per GAP of road, picked and jittered by a hash of the segment index; far to near, fading in at the horizon. */
  private props(scroll: number, proj: Projector): void {
    let n = 0;
    const { pool, keys } = this;
    if (keys.length) {
      for (let k = Math.ceil((FAR + scroll) / GAP); k >= Math.floor(scroll / GAP); k--) {
        for (const side of [-1, 1]) {
          const r = hash(k, side);
          const y = k * GAP - scroll + (r - 0.5) * GAP * 0.5;
          const key = keys[Math.floor(hash(k + 91, side) * keys.length)];
          if (y < FIELD.reachY || y > FAR || n >= POOL || !this.scene.textures.exists(key)) continue;
          proj.at(side * (FIELD.halfWidth + 50 + r * 40), y);
          const im = pool[n++].setTexture(key).setVisible(true);
          const long = PROP_H * proj.s * proj.ppu * proj.laneScale;
          im.setPosition(proj.sx, proj.sy).setScale(long / Math.max(im.width, im.height)).setAlpha(Math.min(1, (FAR - y) / 250)).setDepth(D.ground + 1 + proj.sy / 1000);
        }
      }
    }
    for (; n < POOL; n++) pool[n].setVisible(false);  }

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
    for (const im of this.pool) im.destroy();
  }
}
