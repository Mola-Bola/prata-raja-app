// Where everything sits for a given canvas size. Recomputed on every resize; the scene reads it, nothing caches pixels.
import { FIELD } from '@/core/types';
import { makeView, type View } from '@/core/view';

import { KANNAN_W, LANE } from './look';

/** scene/background.webp is 1080 x 1919; the street's vanishing point is at (vx, vy) as shares of it. */
export const ART_BG = { w: 1080, h: 1919, vx: 0.54, vy: 0.4 };
/** scene/counter.webp: the steel counter seen from behind, its far edge at the top, tawa in the middle, plate at the right. */
export const ART_COUNTER = { w: 1080, h: 527 };
/** The bottom rows of the art (the dark front panel) are stretched down to the screen's bottom edge where the art ends above it. */
export const COUNTER_LIP_ROWS = 12;
/** The counter art is this much wider than the screen (1 = exactly as wide; more crops its left and right steel). */
export const COUNTER_K = 1;
/** Every kannan/* pose shares this canvas. */
export const ART_KANNAN = { w: 512, h: 480 };

export type Layout = {
  w: number;
  h: number;
  /** Design px: 1 at a 390 px wide screen (2 on a 2x phone). Multiply every pixel constant by it. */
  u: number;
  view: View;
  /** Screen px per field unit across the field at depth scale 1. */
  ppu: number;
  /** Touches above this y are the HUD's, not the game's. */
  hudBand: number;
  /** Slack past every edge that the camera shake can reveal. */
  margin: number;
  bg: { x: number; y: number; scale: number };
  /** The counter's top edge is the counter line. `ext` is how far the art's front panel is stretched down to reach the screen's
   *  bottom (0 when the art already does); counterAt() maps a point of the art to the screen. */
  counter: { scale: number; left: number; top: number; w: number; h: number; ext: number };
  kannan: { scale: number; bottom: number; w: number; h: number; minX: number; maxX: number };
  /** Free-movement runs look straight down: the road spans the walkable width (ppu px per field unit across, ppuY up the street,
   *  stretched so the far end of the field, where pests appear, lands under the HUD), `groundY` is field y = 0, strips are the
   *  shopfronts either side. */
  top: { roadW: number; stripW: number; ppu: number; ppuY: number; groundY: number };
};

/** Share of the screen width each shopfront strip takes in the top-down street; the road takes the rest. */
export const TOP_STRIP = 0.2;

export function makeLayout(w: number, h: number): Layout {
  const u = w / 390;
  const margin = 14 * u;
  // The counter fills the bottom of the screen from the counter line (its far steel edge) down. Its art is scaled to the screen
  // width; if it ends above the bottom edge, the art's front panel is stretched down to fill the rest (`ext`).
  const cs = (w / ART_COUNTER.w) * COUNTER_K;
  const counterW = ART_COUNTER.w * cs;
  const counterH = ART_COUNTER.h * cs;
  const counterTop = h * LANE.counter;
  // Enemies stand on the counter line, with the far lip of the counter hiding a few px of their feet.
  const view = { ...makeView(w, h, 0.42), horizonY: h * LANE.horizon, counterY: counterTop + 6 * u };
  // The background is placed so the street's vanishing point sits on the field's horizon: enemies then walk down the
  // road instead of through the sky. It is zoomed (never squeezed) until it covers the canvas plus the shake margin.
  const k = Math.max((w + 2 * margin) / ART_BG.w, (h - view.horizonY + margin) / ((1 - ART_BG.vy) * ART_BG.h));
  const bgW = ART_BG.w * k;
  const bgX = Math.min(-margin, Math.max(w + margin - bgW, w / 2 - ART_BG.vx * bgW));
  const bgY = view.horizonY - ART_BG.vy * ART_BG.h * k;
  const roadW = w * (1 - 2 * TOP_STRIP);
  const topPpu = roadW / (2 * FIELD.halfWidth);
  const groundY = h - 84 * u;
  const hudBand = Math.max(0.1 * h, 72 * u);
  const ks = (KANNAN_W * w) / ART_KANNAN.w;
  const kw = ART_KANNAN.w * ks;
  return {
    w,
    h,
    u,
    view,
    ppu: w / (2 * FIELD.halfWidth),
    hudBand,
    margin,
    bg: { x: bgX, y: bgY, scale: k },
    counter: { scale: cs, left: (w - counterW) / 2, top: counterTop, w: counterW, h: counterH, ext: Math.max(0, h + margin - (counterTop + counterH)) },
    // He is as wide as KANNAN_W of the screen and slides with the finger, but never out of sight: his sprite stays inside.
    top: { roadW, stripW: w * TOP_STRIP, ppu: topPpu, ppuY: Math.min(1.6 * topPpu, (groundY - hudBand - 8 * u) / FIELD.depth), groundY },
    kannan: { scale: ks, bottom: h + margin + 6 * u, w: kw, h: ART_KANNAN.h * ks, minX: kw / 2, maxX: w - kw / 2 },
  };
}

/** A point of the counter art (shares of its width and height) on the screen. */
export function counterAt(l: Layout, fx: number, fy: number, out: { x: number; y: number }): void {
  out.x = l.counter.left + fx * l.counter.w;
  out.y = l.counter.top + fy * l.counter.h;
}

/** Field to screen without allocating: call at(), then read sx, sy and s before the next call. The same pinhole as project()
 *  in core/view.ts (which returns a fresh object per call, too slow for hundreds of sprites a frame), with the near plane
 *  moved to where enemies bite: field y = FIELD.reachY lands exactly on the counter line (depth scale 1) and the few units
 *  nearer than that (Kannan's own square) continue below it, behind the counter. */
export class Projector {
  view: View = makeView(390, 844);
  ppu = 1;
  sx = 0;
  sy = 0;
  s = 1;
  /** Street width opens smoothly from the vanishing point to the fighting lanes. */
  laneScale = 1;
  f = 1;
  /** Top-down (free-movement) street: no depth, equal size everywhere, field y goes straight up the screen. */
  top = false;
  private l!: Layout;

  setLayout(l: Layout): void {
    this.l = l;
    this.view = l.view;
    this.ppu = this.top ? l.top.ppu : l.ppu;
    // s = f / (f + depth) with depth measured from the near plane, and s(far end) = view.far.
    this.f = (l.view.far * (FIELD.depth - FIELD.reachY)) / (1 - l.view.far);
  }

  setTop(on: boolean): void {
    this.top = on;
    if (this.l) this.setLayout(this.l);
  }

  at(x: number, y: number): this {
    const v = this.view;
    if (this.top) {
      this.s = 1;
      this.laneScale = 1;
      this.sx = v.width / 2 + x * this.ppu;
      this.sy = this.l.top.groundY - y * this.l.top.ppuY;
      return this;
    }
    const d = Math.max(y - FIELD.reachY, -0.25 * this.f);
    const s = this.f / (this.f + d);
    this.s = s;
    const road = Math.min(1, Math.max(0, (FIELD.depth - y) / 350));
    this.laneScale = 0.15 + 0.85 * road * road * (3 - 2 * road);
    this.sx = v.width / 2 + x * s * this.ppu * this.laneScale;
    this.sy = v.counterY - (v.counterY - v.horizonY) * ((1 - s) / (1 - v.far));
    return this;
  }
}
