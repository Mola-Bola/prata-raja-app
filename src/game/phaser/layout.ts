// Where everything sits for a given canvas size. Recomputed on every resize; the scene reads it, nothing caches pixels.
import { FIELD } from '@/core/types';

import { KANNAN_W } from './look';

/** Every kannan/* pose shares this canvas. */
const ART_KANNAN = { w: 512, h: 480 };

export type Layout = {
  w: number;
  h: number;
  /** Design px: 1 at a 390 px wide screen (2 on a 2x phone). Multiply every pixel constant by it. */
  u: number;
  /** Touches above this y are the HUD's, not the game's. */
  hudBand: number;
  /** Slack past every edge that the camera shake can reveal. */
  margin: number;
  /** The walking Kannan's reference size (he is KANNAN_W of the screen wide). */
  kannan: { w: number; h: number };
  /** The street looks straight down: the road spans the walkable width (ppu px per field unit across, ppuY up the street,
   *  stretched so the far end of the field, where pests appear, lands under the HUD), `groundY` is field y = 0, strips are the
   *  shopfronts either side. */
  top: { roadW: number; stripW: number; ppu: number; ppuY: number; groundY: number };
};

/** Share of the screen width each shopfront strip takes in the top-down street; the road takes the rest. */
const TOP_STRIP = 0.2;

export function makeLayout(w: number, h: number): Layout {
  const u = w / 390;
  const margin = 14 * u;
  const roadW = w * (1 - 2 * TOP_STRIP);
  const topPpu = roadW / (2 * FIELD.halfWidth);
  const groundY = h - 84 * u;
  const hudBand = Math.max(0.1 * h, 72 * u);
  const ks = (KANNAN_W * w) / ART_KANNAN.w;
  return {
    w,
    h,
    u,
    hudBand,
    margin,
    top: { roadW, stripW: w * TOP_STRIP, ppu: topPpu, ppuY: Math.min(1.6 * topPpu, (groundY - hudBand - 8 * u) / FIELD.depth), groundY },
    kannan: { w: ART_KANNAN.w * ks, h: ART_KANNAN.h * ks },
  };
}

/** Field to screen without allocating: call at(), then read sx, sy before the next call. Top-down: no depth, equal size
 *  everywhere (s and laneScale stay 1), field y goes straight up the screen. */
export class Projector {
  ppu = 1;
  sx = 0;
  sy = 0;
  readonly s = 1;
  readonly laneScale = 1;
  private l!: Layout;

  setLayout(l: Layout): void {
    this.l = l;
    this.ppu = l.top.ppu;
  }

  at(x: number, y: number): this {
    this.sx = this.l.w / 2 + x * this.ppu;
    this.sy = this.l.top.groundY - y * this.l.top.ppuY;
    return this;
  }
}
