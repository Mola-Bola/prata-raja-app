// The stall: street background, steel counter with the build on it (owned dips as bowls, owned breads as a stack) and
// Kannan, whose pose follows the sim (idle, windup, release, lean, hurt, cheer). Cut-out animation: poses swap, the rest is
// breathing, squash and tilt computed per frame.
import * as Phaser from 'phaser';

import type { OwnedBread, OwnedDip, Player, RunPhase } from '@/core/types';

import { ART_COUNTER, COUNTER_LIP_ROWS, counterAt, type Layout } from './layout';
import { D } from './look';
import type { Img, ImagePool } from './pools';
import { addCrop, addImage, setImage } from './tex';

type Slot = { img: Img; id: string; level: number; pop: number };

/** Where the build sits on the counter, as shares of the counter art's width and height. The plain steel at the left of the
 *  tawa holds the dip bowls (two columns, staggered); the plain steel at the right, below the plate, the pile of owned breads. */
const DIP_SPOTS: [number, number][] = [[0.062, 0.26], [0.168, 0.36], [0.062, 0.52], [0.168, 0.62]];
const BREAD_SPOT: [number, number] = [0.875, 0.66];
/** Each owned bread lies a little further up and to the side of the one before, so the whole pile reads (design px). */
const BREAD_FAN: [number, number][] = [[-8, 6], [14, 0], [-12, -14], [10, -18]];
const DIP_W = 0.118;
const BREAD_W = 0.112;
const MAX_BREADS = 4;
/** Kannan's throwing hand in the release pose, as shares of the sprite from its bottom centre (measured on the art). */
const HAND = { x: 0.435, y: 0.69 };
const POP_TIME = 0.4;

const pose = (n: string): string => `kannan/kannan-${n}`;

export class Stall {
  readonly bg: Img;
  readonly counter: Img;
  /** The counter art's front panel, stretched down to the screen's bottom edge when the art ends above it. */
  readonly lip: Img;
  readonly kannan: Img;
  /** Kannan's screen position (feet centre), throwing hand and chest, for shots and sparkles. */
  kx = 0;
  chestX = 0;
  chestY = 0;
  /** Where his feet would be, on the counter: the level-up ring rises from here. */
  feetY = 0;
  /** His field x as drawn this frame (interpolated), before the sprite is kept inside the screen. */
  fieldX = 0;
  handX = 0;
  handY = 0;
  private l!: Layout;
  private cur = pose('idle');
  private flip = false;
  private prevX = 0;
  private dips: Slot[] = [];
  private breads: Slot[] = [];
  private tint = 0xffffff;
  private at = { x: 0, y: 0, rot: 0 };

  constructor(
    scene: Phaser.Scene,
    private imgs: ImagePool,
  ) {
    this.bg = addImage(scene, 'scene/background').setOrigin(0, 0).setDepth(D.bg);
    this.counter = addImage(scene, 'scene/counter').setOrigin(0.5, 0).setDepth(D.counter);
    this.lip = addCrop(scene, 'scene/counter', 'lip', 0, ART_COUNTER.h - COUNTER_LIP_ROWS, ART_COUNTER.w, COUNTER_LIP_ROWS)
      .setOrigin(0.5, 0)
      .setDepth(D.counter);
    this.kannan = addImage(scene, this.cur).setOrigin(0.5, 1).setDepth(D.kannan);
  }

  setLayout(l: Layout): void {
    this.l = l;
    this.bg.setPosition(l.bg.x, l.bg.y).setScale(l.bg.scale);
    const c = l.counter;
    this.counter.setPosition(l.w / 2, c.top).setScale(c.scale);
    this.lip.setVisible(c.ext > 0).setPosition(l.w / 2, c.top + c.h - 1).setScale(c.scale, (c.ext + 1) / COUNTER_LIP_ROWS);
    this.kannan.setScale(l.kannan.scale);
    this.place(this.dips, true);
    this.place(this.breads, false);
  }

  /** Call before each sim step. */
  snapshot(playerX: number): void {
    this.prevX = playerX;
  }

  /** Forget the build and stand idle (a run ended or restarted). */
  reset(): void {
    this.sync(this.dips, [], 'dips', DIP_SPOTS.length);
    this.sync(this.breads, [], 'breads', MAX_BREADS);
    this.prevX = 0;
  }

  update(p: Player | null, phase: RunPhase | null, alpha: number, time: number, dt: number): void {
    const l = this.l;
    this.fieldX = p ? this.prevX + (p.x - this.prevX) * alpha : 0;
    // He follows the finger across the whole counter, but his sprite never leaves the screen.
    const kx = Math.min(l.kannan.maxX, Math.max(l.kannan.minX, l.w / 2 + this.fieldX * l.ppu));
    this.kx = kx;
    let key = 'idle';
    let flip = false;
    let rot = 0.012 * Math.sin(time * 1.3);
    // Breathing: a slow squash and a hint of sway, always.
    const br = Math.sin(time * 2.4);
    let sy = 1 + 0.012 * br;
    let sx = 1 - 0.006 * br;
    let dy = 0;
    let dx = 0;
    let tint = 0xffffff;
    if (p) {
      const slide = p.targetX - p.x;
      let windup = false;
      for (const b of p.breads) if (b.cd > 0 && b.cd <= 0.11 && !p.moving && b.id !== 'vadai') windup = true;
      if (phase === 'won') {
        key = 'cheer';
        dy = -Math.abs(Math.sin(time * 7)) * 9 * l.u;
        rot += 0.05 * Math.sin(time * 7);
      } else if (phase === 'lost') {
        key = 'hurt';
        dy = 8 * l.u;
        tint = 0xb9b3b3;
      } else if (p.hurtAnim > 0) {
        key = 'hurt';
        const q = p.hurtAnim / 0.2;
        dx = Math.sin(time * 90) * 5 * l.u * q;
        tint = 0xff9a8a;
      } else if (p.throwAnim > 0) {
        key = 'release';
        const q = p.throwAnim / 0.18;
        sx *= 1 + 0.03 * q;
        sy *= 1 - 0.015 * q;
        rot += 0.03 * q;
      } else if (Math.abs(slide) > 8) {
        // The lean art leans left; flip it to go right.
        key = 'lean';
        flip = slide > 0;
        rot += (slide > 0 ? 1 : -1) * 0.025;
      } else if (windup) {
        key = 'windup';
        rot -= 0.02;
      }
    }
    const name = pose(key);
    if (name !== this.cur) {
      setImage(this.kannan, name);
      this.cur = name;
    }
    if (flip !== this.flip) {
      this.kannan.setFlipX(flip);
      this.flip = flip;
    }
    if (tint !== this.tint) {
      this.kannan.setTint(tint);
      this.tint = tint;
    }
    const k = l.kannan;
    this.kannan.setPosition(kx + dx, k.bottom + dy).setScale(k.scale * sx, k.scale * sy).setRotation(rot);
    this.chestX = kx;
    this.chestY = k.bottom - 0.5 * k.h;
    this.feetY = k.bottom - 0.16 * k.h;
    this.handX = kx + HAND.x * k.w;
    this.handY = k.bottom - HAND.y * k.h;
    if (p) {
      this.sync(this.dips, p.dips, 'dips', DIP_SPOTS.length);
      this.sync(this.breads, p.breads, 'breads', MAX_BREADS);
    }
    this.animate(this.dips, dt, true);
    this.animate(this.breads, dt, false);
  }

  // ── The build on the counter ───────────────────────────────────────────────────────────────────────────────

  private sync(slots: Slot[], owned: (OwnedDip | OwnedBread)[], dir: 'dips' | 'breads', max: number): void {
    const n = Math.min(owned.length, max);
    while (slots.length > n) this.imgs.put((slots.pop() as Slot).img);
    for (let i = 0; i < n; i++) {
      const o = owned[i];
      let s = slots[i];
      if (!s) {
        s = { img: this.imgs.get(`${dir}/${o.id}`).setDepth(D.slot + i), id: o.id, level: o.level, pop: POP_TIME };
        slots.push(s);
        this.place(slots, dir === 'dips');
      } else if (s.id !== o.id) {
        s.id = o.id;
        setImage(s.img, `${dir}/${o.id}`);
        s.pop = POP_TIME;
        this.place(slots, dir === 'dips');
      } else if (s.level !== o.level) {
        s.level = o.level;
        s.pop = POP_TIME;
      }
    }
  }

  private sizeOf(s: Slot, dips: boolean): number {
    return ((dips ? DIP_W : BREAD_W) * this.l.w) / Math.max(s.img.width, s.img.height);
  }

  private spot(i: number, dips: boolean): void {
    const l = this.l;
    const out = this.at;
    if (dips) {
      const [fx, fy] = DIP_SPOTS[i] ?? DIP_SPOTS[0];
      counterAt(l, fx, fy, out);
      out.rot = 0;
    } else {
      const [fx, fy] = BREAD_SPOT;
      const [dx, dy] = BREAD_FAN[i] ?? BREAD_FAN[0];
      counterAt(l, fx, fy, out);
      out.x += dx * l.u;
      out.y += dy * l.u;
      out.rot = (i % 2 === 0 ? -1 : 1) * 0.12 + i * 0.05;
    }
  }

  private place(slots: Slot[], dips: boolean): void {
    if (!this.l) return;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      this.spot(i, dips);
      // Bowls sit on the counter: their base is the anchor.
      s.img.setOrigin(0.5, dips ? 0.85 : 0.5).setPosition(this.at.x, this.at.y).setRotation(this.at.rot).setScale(this.sizeOf(s, dips));
    }
  }

  private animate(slots: Slot[], dt: number, dips: boolean): void {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.pop <= 0) continue;
      s.pop = Math.max(0, s.pop - dt);
      const q = 1 - s.pop / POP_TIME;
      // Overshoot pop: 0 -> 1.25 -> 1.
      const k = q < 0.6 ? (q / 0.6) * 1.25 : 1.25 - 0.25 * ((q - 0.6) / 0.4);
      s.img.setScale(this.sizeOf(s, dips) * k);
    }
  }
}
