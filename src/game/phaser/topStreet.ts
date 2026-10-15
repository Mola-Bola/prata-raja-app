// One top-down street that scrolls as a single world with the stall's travel (world.dist), built from the
// Codex street kit: a tiled road down the middle (it spans the walkable width), shopfront strips alternating 1/2 along both edges,
// and a few kerb props. Pure function of (dist, seed): a paused run holds still and a replayed seed shows the same street.
import * as Phaser from 'phaser';

import { D } from './look';
import type { Layout } from './layout';

/** Field units the street moves per metre the stall travels (the stall's pace). */
const U_PER_M = 10;

/** Chapter -> street kit (one small table: `ids` are chapter ids, the rest of the kit's art is named after `kit`). Props are the
 *  standing street/* sprites of the kit (flat drains and stools are already printed on the pavement strips). */
const KITS: Record<string, { kit: string; props: string[] }> = {
  'kopitiam-street': { kit: 'kopitiam', props: ['kopitiam-lamp-post'] },
  'hawker-night': { kit: 'hawker-centre', props: ['hawker-centre-neon-lamp', 'hawker-centre-steel-bin'] },
  'pasar-malam': { kit: 'pasar-malam', props: ['pasar-malam-fairy-light-pole', 'pasar-malam-balloon-bundle'] },
  'wet-market': { kit: 'wet-market', props: ['wet-market-bicycle', 'wet-market-ice-box'] },
  'food-street': { kit: 'food-street', props: ['food-street-lantern-post'] },
};
const DEFAULT = KITS['kopitiam-street'];

const STRIP_SHARE = 0.2; // each shopfront strip's share of the screen width (the road takes the rest)
const GAP = 1.1; // prop spacing, in screens-widths of travel
const PROPS = 6;
const PROP_H = 0.2; // prop height, share of the screen width

const hash = (a: number, b: number): number => {
  let h = Math.imul(a * 2 + b, 0x9e3779b1) ^ Math.imul(a + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
};

export class TopStreet {
  private road: Phaser.GameObjects.TileSprite;
  private strips: [Phaser.GameObjects.Image[], Phaser.GameObjects.Image[]] = [[], []];
  private variant: [number[], number[]] = [[], []];
  private props: Phaser.GameObjects.Image[] = [];
  private kit = DEFAULT;
  private seed = 0;
  private on = false;
  private l: Layout | null = null;
  private tileH = 1;
  private roadScale = 1;
  private last = Number.NaN;

  constructor(private scene: Phaser.Scene) {
    this.road = scene.add.tileSprite(0, 0, 8, 8, '__DEFAULT').setOrigin(0, 0).setDepth(D.bg + 1).setVisible(false);
    for (let i = 0; i < PROPS; i++) this.props.push(scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setDepth(D.ground + 1).setVisible(false));
  }

  /** Pick the chapter's kit and the seed that places its props. */
  setKit(chapterId: string, seed: number): void {
    this.kit = KITS[chapterId] ?? DEFAULT;
    this.seed = seed;
    const key = `street/top/${this.kit.kit}-road`;
    if (this.scene.textures.exists(key)) this.road.setTexture(key);
    for (const side of [0, 1]) this.variant[side].fill(0);
    this.last = Number.NaN;
  }

  setLayout(l: Layout): void {
    this.l = l;
    const sw = l.top.stripW;
    this.tileH = 2 * sw;
    const n = Math.ceil((l.h + 2 * l.margin) / this.tileH) + 2;
    for (const side of [0, 1]) {
      const pool = this.strips[side];
      while (pool.length < n) { pool.push(this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(D.bg + 2).setVisible(false)); this.variant[side].push(0); }
      for (const im of pool) im.setDisplaySize(sw, this.tileH);
    }
    this.roadScale = l.top.roadW / 512;
    this.road.setPosition(sw - 1, -l.margin).setSize(l.top.roadW + 2, l.h + 2 * l.margin).setTileScale(this.roadScale + 0.004);
    this.last = Number.NaN;
  }

  setVisible(on: boolean): void {
    this.on = on;
    this.road.setVisible(on);
    if (!on) for (const im of [...this.strips[0], ...this.strips[1], ...this.props]) im.setVisible(false);
    this.last = Number.NaN;
  }

  draw(dist: number): void {
    const l = this.l;
    if (!this.on || !l || dist === this.last) return;
    this.last = dist;
    const scroll = dist * U_PER_M * l.top.ppuY;
    const T = this.tileH;
    const bottom = l.h + l.margin;
    this.road.tilePositionY = -scroll / (this.roadScale + 0.004);
    const base = Math.floor(scroll / T);
    for (const side of [0, 1]) {
      const pool = this.strips[side];
      const x = side === 0 ? 0 : l.w - l.top.stripW;
      for (let j = 0; j < pool.length; j++) {
        const k = base + j;
        const v = hash(k + this.seed, side) < 0.5 ? 1 : 2;
        const im = pool[j];
        if (this.variant[side][j] !== v) {
          this.variant[side][j] = v;
          const key = `street/top/${this.kit.kit}-${side === 0 ? 'left' : 'right'}-${v}`;
          if (this.scene.textures.exists(key)) im.setTexture(key).setDisplaySize(l.top.stripW, T);
        }
        im.setPosition(x, bottom - (k + 1) * T + scroll).setVisible(this.variant[side][j] > 0);
      }
    }
    // Props: one candidate per side per GAP of road, about every other one used; on the pavement just past the kerb.
    const step = GAP * l.w;
    const b2 = Math.floor(scroll / step);
    let n = 0;
    for (let k = b2; k <= b2 + Math.ceil((l.h + 2 * l.margin) / step) + 1 && n < PROPS; k++) {
      for (const side of [-1, 1]) {
        const r = hash(k + this.seed * 3, side + 5);
        if (r > 0.55 || n >= PROPS) continue;
        const key = `street/${this.kit.props[Math.floor(r * 100) % this.kit.props.length]}`;
        if (!this.scene.textures.exists(key)) continue;
        const im = this.props[n++].setTexture(key).setVisible(true);
        const long = PROP_H * l.w;
        im.setScale(long / Math.max(im.width, im.height)).setPosition(l.w / 2 + side * (l.top.roadW / 2 + l.top.stripW * 0.3), bottom - (k + 1) * step + scroll - r * 80);
      }
    }
    for (; n < PROPS; n++) this.props[n].setVisible(false);
  }

  destroy(): void {
    this.road.destroy();
    for (const im of [...this.strips[0], ...this.strips[1], ...this.props]) im.destroy();
  }
}
