// Warnings drawn on the street: a shooter's dashed aim line with a closing ring where its chilli will land, and a boss's
// pulsing lane / counter marks. They run on sim time, so a pause or a hit-stop freezes them mid-pulse. These are the
// only Graphics shapes in the game besides the chain bolt: telegraphs have to be exact and are allowed to be code-drawn.
import * as Phaser from 'phaser';

import { FIELD, type BossAttack } from '@/core/types';

import type { Projector } from './layout';
import { D, HAZARD } from './look';

type Aim = { uid: number; fx: number; fy: number; tx: number; t0: number; until: number };
type Tell = { kind: BossAttack['kind']; uid: number; xs: number[]; width: number; t0: number; until: number };

/** Fills `out` with the live field position of an enemy; false when it is gone. */
export type Locator = (uid: number, out: { x: number; y: number }) => boolean;

const TAU = Math.PI * 2;
/** Landing marks sit just above the counter line (field y = 0 itself is behind the counter). */
const LANDING_Y = FIELD.reachY + 14;
const DASH = 12;
const GAP = 9;

export class Telegraphs {
  private g: Phaser.GameObjects.Graphics;
  private aims: Aim[] = [];
  private tells: Tell[] = [];
  private at = { x: 0, y: 0 };
  /** Frames to keep the warm-up speck on screen so it is really rendered once. */
  private warm = 2;

  constructor(
    scene: Phaser.Scene,
    private proj: Projector,
    private locate: Locator,
  ) {
    // The flat-shape shader compiles the first time Graphics is drawn, a visible hitch on a phone if that is the first
    // warning mid-fight. Draw a nearly invisible speck now (while the title shows); the first draw() hides it.
    this.g = scene.add.graphics().setDepth(D.tele);
    this.g.fillStyle(0, 0.01);
    this.g.fillTriangle(0, 0, 2, 0, 0, 2);
    this.g.lineStyle(1, 0, 0.01);
    this.g.lineBetween(0, 0, 2, 2);
  }

  aim(uid: number, fx: number, fy: number, tx: number, now: number, time: number): void {
    this.aims.push({ uid, fx, fy, tx, t0: now, until: now + time });
  }

  tell(kind: BossAttack['kind'], uid: number, xs: number[], width: number, now: number, time: number): void {
    this.tells.push({ kind, uid, xs: xs.slice(), width, t0: now, until: now + time });
  }

  clear(): void {
    this.aims.length = 0;
    this.tells.length = 0;
    this.g.clear();
    this.g.setVisible(false);
  }

  /** The seconds of warning still to run for a boss tell (0 when none), for the boss's own pulse. */
  tellLeft(uid: number, now: number): number {
    for (const t of this.tells) if (t.uid === uid && t.until > now) return t.until - now;
    return 0;
  }

  draw(now: number, u: number): void {
    if (this.warm > 0) {
      this.warm--;
      return;
    }
    // Expire first, so the last frame of a warning is not drawn after the shot has gone.
    let k = 0;
    for (let i = 0; i < this.aims.length; i++) if (this.aims[i].until > now) this.aims[k++] = this.aims[i];
    this.aims.length = k;
    k = 0;
    for (let i = 0; i < this.tells.length; i++) if (this.tells[i].until > now) this.tells[k++] = this.tells[i];
    this.tells.length = k;
    const g = this.g;
    if (this.aims.length + this.tells.length === 0) {
      if (g.visible) {
        g.clear();
        g.setVisible(false);
      }
      return;
    }
    g.setVisible(true);
    g.clear();
    for (const t of this.tells) this.drawTell(g, t, now, u);
    for (const a of this.aims) this.drawAim(g, a, now, u);
  }

  private drawAim(g: Phaser.GameObjects.Graphics, a: Aim, now: number, u: number): void {
    const P = this.proj;
    const live = this.locate(a.uid, this.at);
    const fx = live ? this.at.x : a.fx;
    const fy = live ? this.at.y : a.fy;
    const p = Math.min(1, (now - a.t0) / (a.until - a.t0));
    const from = P.at(fx, fy);
    const ax = from.sx;
    const ay = from.sy - 14 * u * from.s;
    const to = P.at(a.tx, LANDING_Y);
    this.dashed(g, ax, ay, to.sx, to.sy, u, 0.85);
    this.reticle(g, to.sx, to.sy, (FIELD.kannanHitHalfWidth * 2 + 14) * P.ppu, p, u);
  }

  /** A hazard ellipse on the counter with a ring that closes in on it as the shot nears. */
  private reticle(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, p: number, u: number): void {
    const h = w * 0.42;
    g.fillStyle(HAZARD, 0.18 + 0.14 * p);
    g.fillEllipse(x, y, w, h);
    g.lineStyle(2.5 * u, HAZARD, 0.95);
    g.strokeEllipse(x, y, w, h);
    const r = 1 + 0.9 * (1 - p);
    g.lineStyle(2 * u, 0xffffff, 0.8 * p + 0.2);
    g.strokeEllipse(x, y, w * r, h * r);
  }

  private dashed(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, u: number, a: number): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const dash = DASH * u;
    const step = dash + GAP * u;
    g.lineStyle(2.5 * u, HAZARD, a);
    for (let s = 0; s < len; s += step) {
      const e = Math.min(len, s + dash);
      g.lineBetween(x0 + ux * s, y0 + uy * s, x0 + ux * e, y0 + uy * e);
    }
  }

  /** The ground quad between field x0..x1 and y0..y1, projected. */
  private band(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y0: number, y1: number, fill: number, edge: number, u: number): void {
    const P = this.proj;
    const a = P.at(x0, y0);
    const ax = a.sx;
    const ay = a.sy;
    const b = P.at(x1, y0);
    const bx = b.sx;
    const by = b.sy;
    const c = P.at(x1, y1);
    const cx = c.sx;
    const cy = c.sy;
    const d = P.at(x0, y1);
    const dx = d.sx;
    const dy = d.sy;
    g.fillStyle(HAZARD, fill);
    g.fillTriangle(ax, ay, bx, by, cx, cy);
    g.fillTriangle(ax, ay, cx, cy, dx, dy);
    g.lineStyle(3 * u, HAZARD, edge);
    g.lineBetween(ax, ay, dx, dy);
    g.lineBetween(bx, by, cx, cy);
    g.lineBetween(ax, ay, bx, by);
  }

  private drawTell(g: Phaser.GameObjects.Graphics, t: Tell, now: number, u: number): void {
    const P = this.proj;
    const pulse = 0.5 + 0.5 * Math.sin(TAU * 3 * (now - t.t0));
    // Never brighter than 0.35: the telegraph must not drown the enemies behind it.
    const fill = 0.14 + 0.2 * pulse;
    const edge = 0.55 + 0.4 * pulse;
    const p = Math.min(1, (now - t.t0) / (t.until - t.t0));
    const half = t.width / 2;
    switch (t.kind) {
      case 'charge':
        for (const x of t.xs) this.band(g, x - half, x + half, 0, FIELD.depth, fill, edge, u);
        break;
      case 'rain':
        for (const x of t.xs) {
          this.band(g, x - half, x + half, 0, 90, fill + 0.08, edge, u);
          const c = P.at(x, 45);
          this.reticle(g, c.sx, c.sy, half * 2 * P.ppu * c.s, p, u);
        }
        break;
      case 'sweep':
        for (const x of t.xs) this.band(g, x - half, x + half, 0, 150, fill, edge, u);
        break;
      case 'volley': {
        const live = this.locate(t.uid, this.at);
        const from = P.at(live ? this.at.x : 0, live ? this.at.y : 600);
        const ax = from.sx;
        const ay = from.sy;
        for (const x of t.xs) {
          const to = P.at(x, LANDING_Y);
          this.dashed(g, ax, ay, to.sx, to.sy, u, 0.8);
          this.reticle(g, to.sx, to.sy, t.width * P.ppu, p, u);
        }
        break;
      }
      case 'summon': {
        const live = this.locate(t.uid, this.at);
        if (!live) break;
        const c = P.at(this.at.x, this.at.y);
        const w = 150 * P.ppu * c.s * (1 + 0.15 * pulse);
        g.lineStyle(3 * u, HAZARD, edge);
        g.strokeEllipse(c.sx, c.sy - 20 * u * c.s, w, w * 0.4);
        break;
      }
    }
  }
}
