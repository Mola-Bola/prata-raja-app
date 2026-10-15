// Free-movement input: an anywhere-touch virtual joystick (or WASD / arrows) and a dash button. Touch and mouse behave the same.
import * as Phaser from 'phaser';

import type { RunInput } from '@/core/types';

import type { Layout } from './layout';

/** Android's back gesture starts at the screen's left and right edges: a drag that starts this close (CSS px) is not ours. */
const EDGE_PX = 16;

/** Joystick radius (design px) at which the stick reads full tilt, and the dead zone below which it reads zero. */
const STICK_R = 54;
const DEAD = 0.14;
/** Touches on the top third of the screen belong to the HUD / far street, not the joystick. */
const STICK_TOP = 1 / 3;

/** Anywhere-touch virtual joystick in the lower two thirds of the screen (the finger's first position is the origin, the drag is
 *  the direction), WASD / arrows on a keyboard, Space / Shift or dodge() for the dash. Reads into RunInput.jx / jy / dodge. */
export class FreeInput {
  /** Screen positions for the renderer's ring: origin (ox, oy) and knob (kx, ky); null when no finger is down. */
  stick: { ox: number; oy: number; kx: number; ky: number } | null = null;
  private id = -1;
  private jx = 0;
  private jy = 0;
  private dodgeQueued = false;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private scaleMgr: Phaser.Scale.ScaleManager;

  constructor(
    scene: Phaser.Scene,
    private layout: () => Layout,
  ) {
    this.scaleMgr = scene.scale;
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.input.on('gameout', this.release, this);
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({ w: K.W, a: K.A, s: K.S, d: K.D, up: K.UP, left: K.LEFT, down: K.DOWN, right: K.RIGHT }) as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on('keydown-SPACE', this.dodge, this);
      kb.on('keydown-SHIFT', this.dodge, this);
    }
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
      scene.input.off('gameout', this.release, this);
      kb?.off('keydown-SPACE', this.dodge, this);
      kb?.off('keydown-SHIFT', this.dodge, this);
    });
  }

  /** The next read() reports a dodge press (the sim reacts to its rising edge). The HUD's Dodge button calls this too. */
  dodge(): void {
    this.dodgeQueued = true;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const l = this.layout();
    if (this.id !== -1 && p.id !== this.id) return;
    if (p.y < Math.max(l.hudBand, l.h * STICK_TOP)) return;
    const edge = EDGE_PX * this.scaleMgr.displayScale.x;
    if (p.x < edge || p.x > l.w - edge) return;
    this.id = p.id;
    this.stick = { ox: p.x, oy: p.y, kx: p.x, ky: p.y };
    this.jx = 0;
    this.jy = 0;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.id || !this.stick) return;
    const l = this.layout();
    const r = STICK_R * l.u;
    let dx = p.x - this.stick.ox;
    let dy = p.y - this.stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > r) { dx = (dx / d) * r; dy = (dy / d) * r; }
    this.stick.kx = this.stick.ox + dx;
    this.stick.ky = this.stick.oy + dy;
    const m = Math.min(1, d / r);
    this.jx = m < DEAD ? 0 : (dx / (d || 1)) * m;
    this.jy = m < DEAD ? 0 : (-dy / (d || 1)) * m; // screen down is down the street
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.id) this.release();
  }

  release(): void {
    this.id = -1;
    this.stick = null;
    this.jx = 0;
    this.jy = 0;
  }

  read(out: RunInput): void {
    let jx = this.jx;
    let jy = this.jy;
    const k = this.keys;
    if (k.a && (k.a.isDown || k.left.isDown)) jx -= 1;
    if (k.d && (k.d.isDown || k.right.isDown)) jx += 1;
    if (k.w && (k.w.isDown || k.up.isDown)) jy += 1;
    if (k.s && (k.s.isDown || k.down.isDown)) jy -= 1;
    const m = Math.hypot(jx, jy);
    if (m > 1) { jx /= m; jy /= m; }
    out.jx = jx;
    out.jy = jy;
    out.dodge = this.dodgeQueued;
    this.dodgeQueued = false;
  }
}
