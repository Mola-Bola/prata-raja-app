// Free-movement mode (core/sim/free.ts): Kannan drawn on the street at his field (x, y) with the Codex 4-direction walk cycle
// (kannan/walk-{up,down,left,right}-walk-1..4 and -idle), a dash smear, and the virtual joystick ring where the finger is.
// Real art frames only; the only code-drawn thing is the optional debug hitbox ring (god=1).
import * as Phaser from 'phaser';

import { FIELD, type Player } from '@/core/types';

import type { Layout, Projector } from './layout';
import { D } from './look';
import type { Img } from './pools';
import { addImage, setImage } from './tex';
import type { FreeInput } from './input';

/** Walk-cycle frames per second while moving. */
const FPS = 9;
/** Height of the walking sprite as a share of the counter-mode Kannan's height, at depth scale 1. */
const HEIGHT_SHARE = 0.6;
/** Native height of the walk frames (they are 160..223 tall; one scale for all so the cycle does not pulse). */
const NATIVE_H = 200;
const GHOSTS = 3;
const TRAIL = [2, 4, 6];
const STICK_W = 120;
const KNOB_W = 52;

type Dir = 'up' | 'down' | 'left' | 'right';

export class FreeKannan {
  private body: Img;
  private shadow: Img;
  private ghosts: Img[] = [];
  private base: Img;
  private knob: Img;
  private ring: Phaser.GameObjects.Graphics;
  private prevX = 0;
  private prevY = 0;
  private dir: Dir = 'up';
  private walkT = 0;
  private trail: { x: number; y: number }[] = [];
  private dashFade = 0;
  private cur = '';
  /** Screen position of his feet, chest and throwing hand this frame (shots leave from the hand). */
  feetX = 0;
  feetY = 0;
  chestX = 0;
  chestY = 0;
  handX = 0;
  handY = 0;
  /** Field position as drawn (interpolated). */
  fieldX = 0;
  fieldY = 0;

  constructor(scene: Phaser.Scene) {
    this.shadow = addImage(scene, 'shadow').setVisible(false).setDepth(D.shadow);
    for (let i = 0; i < GHOSTS; i++) this.ghosts.push(addImage(scene, 'kannan/walk-up-idle').setOrigin(0.5, 1).setVisible(false));
    this.body = addImage(scene, 'kannan/walk-up-idle').setOrigin(0.5, 1).setVisible(false);
    this.base = addImage(scene, 'roomui/joystick-base').setVisible(false).setDepth(D.number + 10).setAlpha(0.55);
    this.knob = addImage(scene, 'roomui/joystick-knob').setVisible(false).setDepth(D.number + 11).setAlpha(0.8);
    this.ring = scene.add.graphics().setVisible(false).setDepth(D.fxTop);
  }

  snapshot(p: Player): void {
    this.prevX = p.x;
    this.prevY = p.y;
  }

  hide(): void {
    this.body.setVisible(false);
    this.shadow.setVisible(false);
    this.base.setVisible(false);
    this.knob.setVisible(false);
    this.ring.clear().setVisible(false);
    for (const g of this.ghosts) g.setVisible(false);
  }

  update(p: Player, alpha: number, dt: number, l: Layout, proj: Projector, input: FreeInput, debug: boolean): void {
    this.fieldX = this.prevX + (p.x - this.prevX) * alpha;
    this.fieldY = this.prevY + (p.y - this.prevY) * alpha;
    proj.at(this.fieldX, this.fieldY);
    const s = proj.s;
    const sx = proj.sx;
    const sy = proj.sy;
    // Facing: the dominant axis of the last walk direction (+y is up the street).
    if (Math.abs(p.faceX) > Math.abs(p.faceY)) this.dir = p.faceX > 0 ? 'right' : 'left';
    else this.dir = p.faceY > 0 ? 'up' : 'down';
    this.walkT = p.moving ? this.walkT + dt * FPS : 0;
    const name = p.moving ? `kannan/walk-${this.dir}-walk-${1 + (Math.floor(this.walkT) % 4)}` : `kannan/walk-${this.dir}-idle`;
    if (name !== this.cur) {
      setImage(this.body, name);
      this.cur = name;
      for (const g of this.ghosts) setImage(g, name);
    }
    const k = (HEIGHT_SHARE * l.kannan.h * s) / NATIVE_H;
    const dashing = p.dashT > 0;
    this.dashFade = dashing ? 1 : Math.max(0, this.dashFade - dt / 0.18);
    // Dash smear: stretched along the heading, a little see-through.
    const stretch = dashing ? 1.18 : 1;
    const horiz = this.dir === 'left' || this.dir === 'right';
    const bob = p.moving && !dashing ? Math.abs(Math.sin(this.walkT * Math.PI)) * 3 * l.u * s : 0;
    this.body
      .setVisible(true)
      .setPosition(sx, sy - bob)
      .setScale(k * (horiz ? stretch : 1 / Math.sqrt(stretch)), k * (horiz ? 1 / Math.sqrt(stretch) : stretch))
      .setAlpha(dashing ? 0.75 : 1)
      .setDepth(sy < l.counter.top ? D.enemy + sy + 0.5 : D.kannan);
    if (p.hurtAnim > 0) this.body.setTint(0xff9a8a);
    else this.body.clearTint();
    this.shadow.setVisible(true).setPosition(sx, sy).setScale(1.1 * s * (l.kannan.w / 64) * 0.4, 0.35 * s * (l.kannan.w / 64) * 0.4).setAlpha(0.5);
    // Afterimages trail the last few frames' positions while a dash lasts.
    this.trail.unshift({ x: sx, y: sy });
    if (this.trail.length > 8) this.trail.pop();
    for (let i = 0; i < GHOSTS; i++) {
      const g = this.ghosts[i];
      const t = this.trail[TRAIL[i]];
      if (this.dashFade <= 0 || !t) { g.setVisible(false); continue; }
      g.setVisible(true).setPosition(t.x, t.y).setScale(k).setAlpha(0.32 * this.dashFade * (1 - i / GHOSTS)).setDepth(this.body.depth - 0.1 - i * 0.01);
    }
    this.feetX = sx;
    this.feetY = sy;
    const h = NATIVE_H * k;
    this.chestX = sx;
    this.chestY = sy - 0.55 * h;
    // Shots leave from his chest-height hand, on the side he faces.
    this.handX = sx + (this.dir === 'right' ? 0.2 : this.dir === 'left' ? -0.2 : 0.12) * h * 0.5;
    this.handY = sy - 0.6 * h;
    // Joystick ring from existing art, where the finger went down.
    const st = input.stick;
    if (st) {
      const w = STICK_W * l.u;
      this.base.setVisible(true).setPosition(st.ox, st.oy).setScale(w / this.base.width);
      this.knob.setVisible(true).setPosition(st.kx, st.ky).setScale((KNOB_W * l.u) / this.knob.width);
    } else {
      this.base.setVisible(false);
      this.knob.setVisible(false);
    }
    // Debug only (?god=1): his hit circle.
    const g = this.ring.clear();
    if (debug) {
      const r = FIELD.kannanRadius * proj.ppu * proj.laneScale * s;
      g.setVisible(true).lineStyle(1.5, 0xffffff, 0.6).strokeEllipse(sx, sy, r * 2, r * 0.9);
    } else g.setVisible(false);
  }
}
