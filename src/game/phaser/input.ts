// One-thumb steering. Drag anywhere below the HUD band and Kannan slides under the finger; hold still or let go and he
// throws (the sim stops throwing while `moving`). Touch and mouse behave the same.
import * as Phaser from 'phaser';

import type { RunInput } from '@/core/types';
import { unprojectX } from '@/core/view';

import type { Layout } from './layout';

/** Finger travel (design px) that counts as moving, and how long a move keeps counting. */
const MOVE_PX = 3;
const MOVE_MS = 120;

/** Android's back gesture starts at the screen's left and right edges: a drag that starts this close (CSS px) is not ours. */
const EDGE_PX = 16;

export class DragInput {
  private down = false;
  private id = -1;
  private anchorX = 0;
  private movedAt = -1e9;
  private target: number | null = null;

  private scale: Phaser.Scale.ScaleManager;

  constructor(
    scene: Phaser.Scene,
    private layout: () => Layout,
  ) {
    this.scale = scene.scale;
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.input.on('gameout', this.release, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
      scene.input.off('gameout', this.release, this);
    });
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const l = this.layout();
    // The same finger going down again means its release was never reported: start over rather than stay stuck.
    if (this.down && p.id !== this.id) return;
    if (p.y < l.hudBand) return;
    const edge = EDGE_PX * this.scale.displayScale.x;
    if (p.x < edge || p.x > l.w - edge) return;
    this.down = true;
    this.id = p.id;
    this.anchorX = p.x;
    this.target = unprojectX(p.x, l.view);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.down || p.id !== this.id) return;
    const l = this.layout();
    this.target = unprojectX(p.x, l.view);
    if (Math.abs(p.x - this.anchorX) > MOVE_PX * l.u) {
      this.anchorX = p.x;
      this.movedAt = performance.now();
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.id) this.release();
  }

  release(): void {
    this.down = false;
    this.id = -1;
    this.target = null;
    this.movedAt = -1e9;
  }

  /** Fill `out` with this frame's input (reused, so nothing is allocated). */
  read(out: RunInput): void {
    out.targetX = this.down ? this.target : null;
    out.moving = this.down && performance.now() - this.movedAt < MOVE_MS;
  }
}
