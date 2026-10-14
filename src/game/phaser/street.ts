// The scrolling street: lane dashes plus roadside prop sprites (the chapter's `props`, three-quarter art) that stream toward the
// counter along both kerbs as the stall travels (world.dist).
// Everything is a pure function of dist, so a paused run holds still and a replayed seed shows the same street.
import * as Phaser from 'phaser';

import { brand } from '@/ui/brand';
import { FIELD } from '@/core/types';

import type { Projector } from './layout';
import { D, LANE } from './look';

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
const EDGE_STEP = 60; // field units per trapezoid of the edge trim (the projection bends, so long strips are cut)
const POOL = 12;
const GAP = 200; // field units between props on one kerb (~5 per side in view)
const PROP_H = 150; // field units on the long side at depth scale 1
const hash = (a: number, b: number): number => {
  let h = Math.imul(a * 2 + b, 0x9e3779b1) ^ Math.imul(a + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
};

/** Ground bands: the plane is N horizontal TileSprite slices, each scaled for its depth ("mode 7"), tiling vertically by world.dist.
 *  The slice table (screen rows, texture scale) depends only on the layout, so it is built once per layout, not per frame. */
const BANDS = 72;
/** Where the floor (and its edge) ends, a little outside the widest a pest can stand (SPAWN_X + cloud spread ~ halfWidth). */
const PLAY = FIELD.halfWidth + 30;
const FOG = 0.3; // share of the bands (from the horizon) hazed in the painted far band's colour: the floor stays opaque so painted furniture never shows through
/** Per floor texture (256 px square tile): field units one tile spans, whether it fills the whole screen width (an indoor hall)
 *  or only the road (a street, with the painted pavements beside it), lane dashes, and the edge trim colour. */
const FLOORS: Record<string, { tile: number; full: boolean; dash: boolean; edge: number; fog: number }> = {
  'street/floor/kopitiam': { tile: 190, full: false, dash: true, edge: 0xf1dfb8, fog: 0xe8b374 },
  'street/floor/hawker-centre': { tile: 360, full: true, dash: false, edge: 0x5a3a2c, fog: 0xc98d66 },
};
const TILE_PX = 256;
const EDGE_BANDS = 5;
type Band = { sy: number; h: number; yFar: number; rows: number; unit: number; k: number; w: number; a: number };

export class Street {
  private g: Phaser.GameObjects.Graphics;
  private last = Number.NaN;
  private pool: Phaser.GameObjects.Image[] = [];
  private keys: string[] = [];
  private floor: Phaser.GameObjects.TileSprite[] = [];
  private floorKey = '';
  private table: Band[] = [];
  private tableKey = '';

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(D.ground).setVisible(false);
    for (let i = 0; i < POOL; i++) this.pool.push(scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false));
  }

  /** Chapter's roadside set (keys under 'street/'); undefined = none. */
  setProps(keys?: string[]): void {
    this.keys = (keys ?? []).map((k) => `street/${k}`);
    this.last = Number.NaN;
  }

  /** Chapter's scrolling ground texture; undefined = leave the painted floor. */
  setFloor(key?: string): void {
    this.floorKey = key && this.scene.textures.exists(key) ? key : '';
    for (const b of this.floor) b.setVisible(false);
    if (!this.floorKey) return;
    if (!this.floor.length) for (let i = 0; i < BANDS; i++) this.floor.push(this.scene.add.tileSprite(0, 0, 8, 8, this.floorKey).setOrigin(0.5, 0).setDepth(D.ground - 1).setVisible(false));
    for (const b of this.floor) b.setTexture(this.floorKey);
    this.tableKey = '';
    this.last = Number.NaN;
  }

  private spec(): (typeof FLOORS)[string] {
    return FLOORS[this.floorKey] ?? { tile: 360, full: false, dash: false, edge: 0x5a3a2c, fog: 0xc98d66 };
  }

  /** Field y at screen y (inverse of Projector.at's sy). */
  private yAt(sy: number, proj: Projector): number {
    const v = proj.view;
    const s = 1 - ((v.counterY - sy) / (v.counterY - v.horizonY)) * (1 - v.far);
    return FIELD.reachY + proj.f / s - proj.f;
  }

  /** The scanline table: equal slices in screen space from the counter line up to the horizon. */
  private build(proj: Projector): void {
    const v = proj.view;
    const key = `${this.floorKey}|${v.width}|${v.horizonY}|${v.counterY}|${v.far}|${proj.ppu}`;
    if (key === this.tableKey) return;
    this.tableKey = key;
    const { tile, full } = this.spec();
    const unit = tile / TILE_PX; // field units per texture px
    const bot = v.counterY + 6;
    this.table = [];
    let yNear = this.yAt(bot, proj);
    let prev = bot;
    for (let i = 0; i < BANDS; i++) {
      const sy = bot - ((bot - v.horizonY) * (i + 1)) / BANDS;
      const yFar = i === BANDS - 1 ? FIELD.depth : this.yAt(sy, proj);
      proj.at(0, (yNear + yFar) / 2);
      const k = proj.s * proj.ppu * proj.laneScale; // screen px per field unit
      const f = Math.min(1, (BANDS - i) / (BANDS * FOG));
      this.table.push({ sy, h: prev - sy + 1, yFar, rows: (yFar - yNear) / unit, unit, k, w: full ? v.width + 8 : 2 * PLAY * k, a: f * f * (3 - 2 * f) });
      prev = sy;
      yNear = yFar;
    }
  }

  private ground(scroll: number, proj: Projector): void {
    this.build(proj);
    const cx = proj.view.width / 2;
    this.table.forEach((t, i) => {
      const b = this.floor[i];
      b.setVisible(true).setPosition(cx, t.sy).setSize(t.w, t.h).setTileScale(t.unit * t.k, t.h / t.rows);
      // Content moves toward the counter: the row at field y is -(y + scroll)/unit. Columns are centred on field x = 0.
      b.tilePositionX = -t.w / 2 / (t.unit * t.k);
      b.tilePositionY = -(t.yFar + scroll) / t.unit;
      b.setAlpha(Math.min(1, (BANDS - i) / EDGE_BANDS)); // a thin see-through rim at the horizon, opaque below
    });
  }

  setVisible(on: boolean): void {
    this.g.setVisible(on);
    if (!on) {
      for (const b of this.floor) b.setVisible(false);
      this.g.clear();
      for (const im of this.pool) im.setVisible(false);
    }
    this.last = Number.NaN;
  }

  /** Redraw for `dist` metres travelled (call every frame; it skips when nothing moved). */
  draw(dist: number, proj: Projector): void {
    if (!this.g.visible || dist === this.last) return;
    this.last = dist;
    if (this.floorKey) this.ground(dist * U_PER_M, proj);
    const g = this.g;
    g.clear();
    const scroll = dist * U_PER_M;
    const { dash, edge, full, fog } = this.spec();
    if (this.floorKey) this.table.forEach((t) => { if (t.a < 1) g.fillStyle(fog, 0.92 * (1 - t.a)).fillRect(proj.view.width / 2 - t.w / 2, t.sy, t.w, t.h); });
    // Layer 1: soft lane dashes, on streets only (an indoor floor has none), sliding toward the counter.
    for (let k = dash ? Math.ceil((FAR + scroll) / DASH.period) : 0; k >= Math.floor((scroll - DASH.len) / DASH.period) && dash; k--) {
      const y0 = k * DASH.period - scroll;
      const y1 = y0 + DASH.len;
      if (y1 < FIELD.reachY || y0 > FAR) continue;
      for (const sx of [-DASH.x, DASH.x]) this.strip(proj, sx, Math.max(y0, FIELD.reachY), Math.min(y1, FAR), 5, C.line, 0.3);
    }
    // Layer 2: where the play area ends, a trim line with a shadow outside it (an indoor hall also darkens the table zone).
    if (this.floorKey) for (const side of [-1, 1]) for (let y = FIELD.reachY; y < FAR; y += EDGE_STEP) {
      const y1 = Math.min(FAR, y + EDGE_STEP);
      this.strip(proj, side * (PLAY + 14), y, y1, 28, 0x000000, 0.2);
      this.strip(proj, side * PLAY, y, y1, 7, edge, 0.8);
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
          proj.at(side * (PLAY + 90 + r * 40), y);
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
    for (const b of this.floor) b.destroy();
  }
}
