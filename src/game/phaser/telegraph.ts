// Pooled atlas strips and landing rings: warnings follow sim time and the projected hazard width.
import { FIELD, type BossAttack } from '@/core/types';

import type { Projector } from './layout';
import { D, HAZARD, WHITE } from './look';
import { ImagePool, type Img } from './pools';
import { setImage } from './tex';

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
  private marks: Img[] = [];
  private used = 0;
  private aims: Aim[] = [];
  private tells: Tell[] = [];
  private at = { x: 0, y: 0 };

  constructor(
    private imgs: ImagePool,
    private proj: Projector,
    private locate: Locator,
  ) {}

  private mark(key: string, x: number, y: number, w: number, h: number, tint: number, alpha: number, rotation = 0): void {
    const img = this.marks[this.used] ?? (this.marks[this.used] = this.imgs.get(key));
    // Each slot can switch between a strip and a landing ring.
    if (img.frame.name !== key) setImage(img, key);
    img.setVisible(true).setPosition(x, y).setDisplaySize(w, h)
      .setTint(tint).setAlpha(alpha).setRotation(rotation).setDepth(D.tele);
    this.used++;
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
    for (const img of this.marks) this.imgs.put(img);
    this.marks.length = 0;
  }

  /** The seconds of warning still to run for a boss tell (0 when none), for the boss's own pulse. */
  tellLeft(uid: number, now: number): number {
    for (const t of this.tells) if (t.uid === uid && t.until > now) return t.until - now;
    return 0;
  }

  draw(now: number, u: number): void {
    // Expire first, so the last frame of a warning is not drawn after the shot has gone.
    let k = 0;
    for (let i = 0; i < this.aims.length; i++) if (this.aims[i].until > now) this.aims[k++] = this.aims[i];
    this.aims.length = k;
    k = 0;
    for (let i = 0; i < this.tells.length; i++) if (this.tells[i].until > now) this.tells[k++] = this.tells[i];
    this.tells.length = k;
    this.used = 0;
    for (const t of this.tells) this.drawTell(t, now, u);
    for (const a of this.aims) this.drawAim(a, now, u);
    for (let i = this.used; i < this.marks.length; i++) this.marks[i].setVisible(false);
  }

  private drawAim(a: Aim, now: number, u: number): void {
    const P = this.proj;
    const live = this.locate(a.uid, this.at);
    const fx = live ? this.at.x : a.fx;
    const fy = live ? this.at.y : a.fy;
    const p = Math.min(1, (now - a.t0) / (a.until - a.t0));
    const from = P.at(fx, fy);
    const ax = from.sx;
    const ay = from.sy - 14 * u * from.s;
    const to = P.at(a.tx, LANDING_Y);
    this.dashed(ax, ay, to.sx, to.sy, u, 0.85);
    this.reticle(to.sx, to.sy, (FIELD.kannanHitHalfWidth * 2 + 14) * P.ppu, p);
  }

  /** A hazard ellipse on the counter with a ring that closes in on it as the shot nears. */
  private reticle(x: number, y: number, w: number, p: number): void {
    const pulse = 1 + 0.1 * Math.sin(p * TAU * 3);
    this.mark('fx/levelup-ring', x, y, w * pulse, w * 0.48 * pulse, HAZARD, 0.95);
    this.mark('fx/levelup-ring', x, y, w * (1.1 + 0.5 * (1 - p)), w * 0.55 * (1.1 + 0.5 * (1 - p)), WHITE, 0.85);
  }

  private dashed(x0: number, y0: number, x1: number, y1: number, u: number, a: number): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const dash = DASH * u;
    const step = dash + GAP * u;

    for (let s = 0; s < len; s += step) {
      const e = Math.min(len, s + dash);
      this.mark('fx/swoosh', x0 + ux * (s + e) / 2, y0 + uy * (s + e) / 2, e - s, 7 * u, HAZARD, a, Math.atan2(dy, dx));
    }
  }

  /** The ground quad between field x0..x1 and y0..y1, projected. */
  private band(x0: number, x1: number, y0: number, y1: number, fill: number, edge: number, u: number): void {
    const P = this.proj;
    const slices = 12;
    for (let i = 0; i < slices; i++) {
      const y = y0 + (y1 - y0) * (i + 0.5) / slices;
      const near = P.at(0, y0 + (y1 - y0) * i / slices).sy;
      const far = P.at(0, y0 + (y1 - y0) * (i + 1) / slices).sy;
      P.at((x0 + x1) / 2, y);
      const w = (x1 - x0) * P.ppu * P.s * P.laneScale;
      const x = P.sx;
      const sy = P.sy;
      this.mark('fx/swoosh', x, sy, w, Math.abs(near - far) + 2 * u, HAZARD, fill);
      this.mark('fx/swoosh', x - w / 2, sy, 6 * u, Math.abs(near - far) + 2 * u, WHITE, edge);
      this.mark('fx/swoosh', x + w / 2, sy, 6 * u, Math.abs(near - far) + 2 * u, HAZARD, edge);
    }
  }

  private drawTell(t: Tell, now: number, u: number): void {
    const P = this.proj;
    const pulse = 0.5 + 0.5 * Math.sin(TAU * 3 * (now - t.t0));
    // Keep the lane interior translucent; the thick edges carry the warning.
    const fill = 0.28 + 0.12 * pulse;
    const edge = 0.85 + 0.15 * pulse;
    const p = Math.min(1, (now - t.t0) / (t.until - t.t0));
    const half = t.width / 2;
    switch (t.kind) {
      case 'charge':
        for (const x of t.xs) this.band(x - half, x + half, 0, FIELD.depth, fill, edge, u);
        break;
      case 'rain':
        for (const x of t.xs) {
          this.band(x - half, x + half, 0, 90, fill + 0.08, edge, u);
          const c = P.at(x, 45);
          this.reticle(c.sx, c.sy, half * 2 * P.ppu * c.s, p);
        }
        break;
      case 'sweep':
        for (const x of t.xs) this.band(x - half, x + half, 0, 150, fill, edge, u);
        break;
      case 'volley': {
        const live = this.locate(t.uid, this.at);
        const from = P.at(live ? this.at.x : 0, live ? this.at.y : 600);
        const ax = from.sx;
        const ay = from.sy;
        for (const x of t.xs) {
          const to = P.at(x, LANDING_Y);
          this.dashed(ax, ay, to.sx, to.sy, u, 0.8);
          this.reticle(to.sx, to.sy, t.width * P.ppu, p);
        }
        break;
      }
      case 'summon': {
        const live = this.locate(t.uid, this.at);
        if (!live) break;
        const c = P.at(this.at.x, this.at.y);
        const w = 150 * P.ppu * c.s * (1 + 0.15 * pulse);
        this.mark('fx/levelup-ring', c.sx, c.sy - 20 * u * c.s, w, w * 0.4, HAZARD, edge);
        break;
      }
    }
  }
}
