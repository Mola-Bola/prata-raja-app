// Short-lived effects, all pooled: sprite particles (impact, puffs, splashes, explosions, sparkles that fly to Kannan),
// damage numbers and the chain-lightning lines. Nothing here touches the sim; the scene spawns them from events.
import * as Phaser from 'phaser';

import { D, MAX_NUMBERS, MAX_PARTICLES, NUMBER_COLOR, NUMBER_SCALE_FLOOR } from './look';
import type { Img } from './pools';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);
const easeIn = (u: number): number => u * u;

/** One sprite effect. Fluent setters return it, so a spawn reads as one line. Sizes are display widths in px. */
export class Particle {
  on = false;
  img: Img | null = null;
  t = 0;
  dur = 1;
  x0 = 0;
  y0 = 0;
  x1 = 0;
  y1 = 0;
  w0 = 1;
  w1 = 1;
  /** Vertical squash of the sprite (1 = none). */
  flat = 1;
  a0 = 1;
  a1 = 0;
  /** Share of the life spent at a0 before fading to a1. */
  hold = 0;
  r0 = 0;
  rv = 0;
  arc = 0;
  /** 0 linear, 1 ease-out, 2 ease-in. */
  ease = 1;
  /** Ends on the live target (Kannan) instead of x1/y1. */
  follow = false;

  fade(a0: number, a1: number, hold = 0): this {
    this.a0 = a0;
    this.a1 = a1;
    this.hold = hold;
    return this;
  }
  to(x1: number, y1: number, ease = 1, arc = 0): this {
    this.x1 = x1;
    this.y1 = y1;
    this.ease = ease;
    this.arc = arc;
    return this;
  }
  spin(r0: number, rv: number): this {
    this.r0 = r0;
    this.rv = rv;
    return this;
  }
  tint(c: number): this {
    this.img?.setTint(c);
    return this;
  }
  add(): this {
    this.img?.setBlendMode(Phaser.BlendModes.ADD);
    return this;
  }
  squash(f: number): this {
    this.flat = f;
    return this;
  }
  /** Fly to Kannan, wherever he is when it arrives. */
  seek(): this {
    this.follow = true;
    this.ease = 2;
    return this;
  }
  /** Wait this long (s) before showing. */
  delay(s: number): this {
    this.t = -s;
    return this;
  }
}

type Num = {
  txt: Phaser.GameObjects.Text;
  on: boolean;
  /** The colour the text is drawn in now: changing a Text's style redraws it, so only do that when it differs. */
  color: string;
  t: number;
  x: number;
  y: number;
  /** The enemy it floats over (merging hits on one enemy). */
  uid: number;
  kind: 0 | 1 | 2;
  perspective: number;
  value: number;
  pop: number;
  base: number;
  /** A crit's little "!" flick rather than a damage number. */
  mark: boolean;
  still?: boolean;
};

type Bolt = { pts: number[]; t: number; dur: number };

/** Of the MAX_NUMBERS floating numbers, at most this many are damage-over-time ticks. */
const MAX_DOT_NUMBERS = 8;
const MAX_TARGET_NUMBERS = 3;
const NUM_LIFE = 0.6;
const MARK_LIFE = 0.25;
const NUM_RISE_T = 0.5;
const NUM_FADE_FROM = 0.36;
const NUM_MERGE = 0.3;
const FONT = 'Fredoka, "Arial Rounded MT Bold", "Arial Black", Impact, sans-serif';

export class Fx {
  /** The live target for seeking sparkles (Kannan's chest), set by the scene each frame. */
  tx = 0;
  ty = 0;
  private design = 1;

  private parts: Particle[] = [];
  private free: Particle[] = [];
  private dead = new Particle();
  private nums: Num[] = [];
  private bolts: Bolt[] = [];
  private boltGfx: Phaser.GameObjects.Graphics;
  private liveNums = 0;
  /** Frames to keep the warm-up speck on screen so it is really rendered once. */
  private warm = 2;

  constructor(
    private scene: Phaser.Scene,
    private pool: { get(key: string): Img; put(img: Img): void },
  ) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = new Particle();
      this.parts.push(p);
      this.free.push(p);
    }
    this.boltGfx = scene.add.graphics().setDepth(D.fxTop);
    // (Same warm-up as telegraph.ts: a speck for one frame; updateBolts hides it when there is nothing to draw.)
    this.boltGfx.fillStyle(0, 0.01);
    this.boltGfx.fillTriangle(0, 0, 2, 0, 0, 2);
    for (let i = 0; i < MAX_NUMBERS; i++) {
      const txt = scene.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontStyle: 'bold',
          fontSize: '24px',
          color: '#ffffff',
          stroke: '#2a1408',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(D.number)
        .setVisible(false);
      this.nums.push({ txt, on: false, color: '#ffffff', t: 0, x: 0, y: 0, uid: 0, kind: 0, perspective: 1, value: 0, pop: 1, base: 1, mark: false });
    }
  }

  /** Design px (width / 390), for sizes of text and lines. Setting it restyles the number pool. */
  get u(): number {
    return this.design;
  }
  set u(v: number) {
    if (v === this.design) return;
    this.design = v;
    for (const n of this.nums) {
      n.txt.setFontSize(Math.round(24 * v));
      n.txt.setStroke('#2a1408', Math.max(2, Math.round(4 * v)));
    }
  }

  /** Start a particle with this texture, centred on (x, y), depth `depth`, living `dur` seconds and growing from width
   *  w0 to w1. Returns an inert dummy when the pool is empty (the effect is simply skipped). */
  spawn(key: string, x: number, y: number, depth: number, dur: number, w0: number, w1: number): Particle {
    const p = this.free.pop();
    if (!p) return this.dead;
    const img = this.pool.get(key);
    img.setDepth(depth).setPosition(x, y).setAlpha(1).setOrigin(0.5, 0.5);
    p.img = img;
    p.on = true;
    p.t = 0;
    p.dur = dur;
    p.x0 = x;
    p.y0 = y;
    p.x1 = x;
    p.y1 = y;
    p.w0 = w0;
    p.w1 = w1;
    p.flat = 1;
    p.a0 = 1;
    p.a1 = 0;
    p.hold = 0;
    p.r0 = 0;
    p.rv = 0;
    p.arc = 0;
    p.ease = 1;
    p.follow = false;
    return p;
  }

  private kill(p: Particle): void {
    if (p.img) this.pool.put(p.img);
    p.img = null;
    p.on = false;
    this.free.push(p);
  }

  update(dt: number): void {
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (!p.on || !p.img) continue;
      p.t += dt;
      if (p.t < 0) {
        p.img.setVisible(false);
        continue;
      }
      const u = p.t / p.dur;
      if (u >= 1) {
        this.kill(p);
        continue;
      }
      const img = p.img;
      const e = p.ease === 2 ? easeIn(u) : p.ease === 1 ? easeOut(u) : u;
      const ex = p.follow ? this.tx : p.x1;
      const ey = p.follow ? this.ty : p.y1;
      const w = p.w0 + (p.w1 - p.w0) * easeOut(u);
      const a = u <= p.hold ? p.a0 : p.a0 + (p.a1 - p.a0) * ((u - p.hold) / (1 - p.hold));
      const s = w / img.width;
      img
        .setVisible(true)
        .setPosition(p.x0 + (ex - p.x0) * e, p.y0 + (ey - p.y0) * e - p.arc * 4 * u * (1 - u))
        .setScale(s, s * p.flat)
        .setAlpha(a < 0 ? 0 : a)
        .setRotation(p.r0 + p.rv * p.t);
    }
    this.updateNumbers(dt);
    this.updateBolts(dt);
  }

  // ── Damage numbers ─────────────────────────────────────────────────────────────────────────────────────────

  /** A number floating up from (x, y). kind 0 hit, 1 crit, 2 damage over time.
   *  Hits on the same enemy within 300 ms merge into one number. */
  number(uid: number, x: number, y: number, value: number, kind: 0 | 1 | 2, perspective = 1): void {
    for (let i = 0; i < this.nums.length; i++) {
      const n = this.nums[i];
      if (n.on && !n.mark && n.uid === uid && n.t < NUM_MERGE && n.kind === kind) {
        n.value += value;
        n.x = x;
        n.y = y;
        n.perspective = Math.max(NUMBER_SCALE_FLOOR, Math.min(1, perspective));
        this.setText(n, kind);
        n.t = Math.min(n.t, 0.04);
        return;
      }
    }
    let slot: Num | null = null;
    let oldest: Num | null = null;
    let dots = 0;
    let clustered = 0;
    let targetOldest: Num | null = null;
    for (let i = 0; i < this.nums.length; i++) {
      const n = this.nums[i];
      if (!n.on) {
        slot ??= n;
        continue;
      }
      if (n.kind === 2) dots++;
      if (n.uid === uid && !n.mark) {
        clustered++;
        if (!targetOldest || n.t > targetOldest.t) targetOldest = n;
      }
      if (!oldest || n.t > oldest.t) oldest = n;
    }
    // Damage-over-time numbers never crowd out the hits: at most MAX_DOT_NUMBERS of them on screen.
    if (kind === 2 && dots >= MAX_DOT_NUMBERS) return;
    // Over the cap: DoT ticks are dropped, hits take the place of the oldest number.
    const n = clustered >= MAX_TARGET_NUMBERS ? targetOldest : slot ?? (kind === 2 ? null : oldest);
    if (!n) return;
    if (!n.on) this.liveNums++;
    n.on = true;
    n.mark = false;
    n.t = 0;
    n.x = x + ((clustered % 3) - 1) * 12 * this.u;
    n.y = y - (clustered % 2) * 10 * this.u;
    n.uid = uid;
    n.kind = kind;
    n.perspective = Math.max(NUMBER_SCALE_FLOOR, Math.min(1, perspective));
    n.value = value;
    this.setText(n, kind);
    n.txt.setVisible(true);
  }

  /** A small gold "!" that flicks out up and right of a crit number for 0.25 s. Takes a free slot only; with
   *  `still` (reduced motion) it does not move, it just shows in the colour for a moment. */
  critMark(x: number, y: number, still: boolean): void {
    const n = this.nums.find((m) => !m.on);
    if (!n) return;
    this.liveNums++;
    n.on = true;
    n.mark = true;
    n.still = still;
    n.t = 0;
    n.uid = -1;
    n.perspective = 1;
    n.x = x + 16 * this.u;
    n.y = y - 4 * this.u;
    n.kind = 1;
    n.color = NUMBER_COLOR.big;
    n.txt.setColor(NUMBER_COLOR.big).setText('!').setRotation(0.35).setVisible(true);
  }

  private setText(n: Num, kind: 0 | 1 | 2): void {
    const big = kind === 1 || (kind === 0 && n.value >= 35);
    const c = big ? NUMBER_COLOR.big : kind === 2 ? NUMBER_COLOR.dot : NUMBER_COLOR.chip;
    n.pop = big ? 1.5 : 1.2;
    n.base = (big ? 1.25 : kind === 2 ? 0.85 : 1) * n.perspective;
    // Every Text setter redraws its canvas, so set the colour only when it changes and the style never (see `u`).
    if (c !== n.color) {
      n.color = c;
      n.txt.setColor(c);
    }
    const v = String(Math.max(1, Math.round(n.value)));
    n.txt.setText(v);
  }

  get numbersLive(): number {
    return this.liveNums;
  }

  private updateNumbers(dt: number): void {
    const rise = 40 * this.u;
    for (let i = 0; i < this.nums.length; i++) {
      const n = this.nums[i];
      if (!n.on) continue;
      n.t += dt;
      if (n.mark) {
        if (n.t >= MARK_LIFE) {
          n.on = false;
          n.mark = false;
          n.txt.setVisible(false).setRotation(0);
          this.liveNums--;
          continue;
        }
        const k = n.t / MARK_LIFE;
        const fly = n.still ? 0 : easeOut(k) * 10 * this.u;
        n.txt.setPosition(n.x + fly, n.y - fly).setScale((n.still ? 0.8 : 1.5 - 0.7 * k) * n.perspective).setAlpha(1 - k * k);
        continue;
      }
      if (n.t >= NUM_LIFE) {
        n.on = false;
        n.txt.setVisible(false);
        this.liveNums--;
        continue;
      }
      const popU = clamp01(n.t / 0.1);
      const scale = n.base * (n.pop + (1 - n.pop) * easeOut(popU));
      const a = n.t < NUM_FADE_FROM ? 1 : 1 - (n.t - NUM_FADE_FROM) / (NUM_LIFE - NUM_FADE_FROM);
      n.txt
        .setPosition(n.x, n.y - rise * easeOut(clamp01(n.t / NUM_RISE_T)))
        .setScale(scale)
        .setAlpha(a);
    }
  }

  // ── Chain lightning ────────────────────────────────────────────────────────────────────────────────────────

  /** A bright zig-zag line through screen points [x0, y0, x1, y1, ...]. */
  bolt(pts: number[]): void {
    if (this.bolts.length < 8) this.bolts.push({ pts, t: 0, dur: 0.16 });
  }

  private updateBolts(dt: number): void {
    const g = this.boltGfx;
    if (this.warm > 0) {
      this.warm--;
      return;
    }
    if (this.bolts.length === 0) {
      if (g.visible) {
        g.clear();
        g.setVisible(false);
      }
      return;
    }
    g.setVisible(true);
    g.clear();
    let keep = 0;
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      b.t += dt;
      if (b.t >= b.dur) continue;
      this.bolts[keep++] = b;
      const a = 1 - b.t / b.dur;
      g.lineStyle(5 * this.u, 0xffd23f, 0.55 * a);
      this.stroke(g, b.pts);
      g.lineStyle(2 * this.u, 0xffffff, a);
      this.stroke(g, b.pts);
    }
    this.bolts.length = keep;
  }

  private stroke(g: Phaser.GameObjects.Graphics, pts: number[]): void {
    for (let i = 2; i < pts.length; i += 2) {
      // A kink in the middle makes it read as lightning, not a ruler line.
      const mx = (pts[i - 2] + pts[i]) / 2 + (((i * 7) % 5) - 2) * 3 * this.u;
      const my = (pts[i - 1] + pts[i + 1]) / 2 + (((i * 11) % 5) - 2) * 3 * this.u;
      g.lineBetween(pts[i - 2], pts[i - 1], mx, my);
      g.lineBetween(mx, my, pts[i], pts[i + 1]);
    }
  }

  /** Hide everything (a run ended or restarted). */
  clear(): void {
    for (const p of this.parts) if (p.on) this.kill(p);
    for (const n of this.nums) {
      n.on = false;
      n.txt.setVisible(false);
    }
    this.liveNums = 0;
    this.bolts.length = 0;
    this.boltGfx.clear();
    this.boltGfx.setVisible(false);
  }
}
