// The warning for an enemy that has reached the counter and is biting Kannan: a red glow pulsing on the counter's edge under
// it, and a small "!" in a red badge bobbing above its head. Like the telegraphs (telegraph.ts) these are flat shapes and a glyph: a warning
// has to be exact and quick to read, so it is allowed to be code-drawn. It follows the sim (state 'attack'), so it appears the
// moment an enemy starts biting and is gone the moment it dies or is knocked back.
import * as Phaser from 'phaser';

import type { World } from '@/core/types';

import type { Actors } from './actors';
import type { Layout } from './layout';
import { D, DANGER } from './look';

const FONT = 'Fredoka, "Arial Rounded MT Bold", "Arial Black", Impact, sans-serif';
/** Pulses and bobs per second. */
const BEAT_HZ = 2.2;

export class DangerCue {
  private g: Phaser.GameObjects.Graphics;
  private badges: Phaser.GameObjects.Graphics;
  private marks: Phaser.GameObjects.Text[] = [];
  private u = 1;
  private shown = 0;

  constructor(
    private scene: Phaser.Scene,
    private actors: Actors,
  ) {
    // Over the counter's far lip (the glow sits on that edge) and under Kannan, his bowls and the shots.
    this.g = scene.add.graphics().setDepth(D.counter + 1).setVisible(false);
    this.badges = scene.add.graphics().setDepth(D.fxTop - 1).setVisible(false);
  }

  /** Design px (width / 390): sizes of the glow and the "!". Restyles the marks when it changes. */
  setUnit(u: number): void {
    if (u === this.u) return;
    this.u = u;
    for (const m of this.marks) this.style(m);
  }

  /** Draw this frame's cue. `time` is the render clock (s); `calm` (reduced motion) keeps it steady instead of pulsing. */
  update(w: World, l: Layout, time: number, calm: boolean): void {
    const u = l.u;
    const beat = calm ? 1 : 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * BEAT_HZ);
    const g = this.g;
    const b = this.badges;
    g.clear();
    b.clear();
    let n = 0;
    for (const e of w.enemies) {
      if (e.state !== 'attack' || e.hp <= 0) continue;
      const v = this.actors.viewOf(e.uid);
      if (!v) continue;
      const gw = Math.max(76 * u, v.bw * 1.3);
      const gh = gw * 0.26;
      const x = v.sx;
      const y = l.view.counterY - 2 * u;
      g.fillStyle(DANGER, 0.12 + 0.16 * beat);
      g.fillEllipse(x, y, gw * 1.35, gh * 1.6);
      g.fillStyle(DANGER, 0.24 + 0.34 * beat);
      g.fillEllipse(x, y, gw, gh);
      g.lineStyle(2 * u, DANGER, 0.45 + 0.45 * beat);
      g.strokeEllipse(x, y, gw * 0.92, gh * 0.92);
      // The badge: a red disc with a cream rim, the "!" in it. It rides above the head and bobs with the beat, high enough that the
      // damage numbers (they float up to 40 px over the head) never cover it.
      const r = 15 * u;
      const cy = Math.max(r + 26 * u, v.topY - 44 * u - r - (calm ? 0 : 6 * u * beat));
      b.fillStyle(DANGER, 1);
      b.fillCircle(x, cy, r);
      b.lineStyle(3 * u, 0xfff4e0, 1);
      b.strokeCircle(x, cy, r);
      this.mark(n++).setPosition(x, cy + 1 * u).setVisible(true);
    }
    for (let i = n; i < this.shown; i++) this.marks[i].setVisible(false);
    this.shown = n;
    g.setVisible(n > 0);
    b.setVisible(n > 0);
  }

  clear(): void {
    this.g.clear().setVisible(false);
    this.badges.clear().setVisible(false);
    for (const m of this.marks) m.setVisible(false);
    this.shown = 0;
  }

  private mark(i: number): Phaser.GameObjects.Text {
    let m = this.marks[i];
    if (!m) {
      m = this.scene.add.text(0, 0, '!', { fontFamily: FONT, fontStyle: 'bold', color: '#fff4e0' }).setOrigin(0.5, 0.5).setDepth(D.fxTop).setVisible(false);
      this.style(m);
      this.marks[i] = m;
    }
    return m;
  }

  private style(m: Phaser.GameObjects.Text): void {
    m.setFontSize(Math.round(26 * this.u));
  }
}
