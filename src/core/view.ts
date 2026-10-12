// Over-the-shoulder perspective: field space (x -270..270, y 0 counter .. 1000 horizon) -> screen pixels.
// Pinhole model so far things compress: s(y) = f / (f + y), with f chosen so s(horizon) = view.far.
import { FIELD } from './types';

export type View = {
  width: number;
  height: number;
  /** Screen y of the horizon (field y = 1000). */
  horizonY: number;
  /** Screen y of the counter line (field y = 0). */
  counterY: number;
  /** Sprite scale at the horizon (1 at the counter). */
  far: number;
};

/** Portrait layout: HUD band on top, horizon at 20%, counter line at 68%, counter + Kannan below. */
export function makeView(width: number, height: number, far = 0.3): View {
  return { width, height, horizonY: height * 0.2, counterY: height * 0.68, far };
}

export function depthScale(y: number, view: View): number {
  const f = (view.far * FIELD.depth) / (1 - view.far);
  return f / (f + Math.max(0, y));
}

export function project(x: number, y: number, view: View): { sx: number; sy: number; s: number } {
  const s = depthScale(y, view);
  const t = (1 - s) / (1 - view.far);
  return {
    sx: view.width / 2 + x * s * (view.width / (2 * FIELD.halfWidth)),
    sy: view.counterY - (view.counterY - view.horizonY) * t,
    s,
  };
}

/** Field x on the counter line under a screen x (for the drag input). */
export function unprojectX(sx: number, view: View): number {
  return ((sx - view.width / 2) * (2 * FIELD.halfWidth)) / view.width;
}
