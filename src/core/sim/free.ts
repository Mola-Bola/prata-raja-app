// Free-movement mode (content.tune.controlMode 'free'): Kannan walks a 2D patch of the street with a joystick, dashes with i-frames,
// pests chase him and shooters aim at him. Counter mode (opt-in: controlMode 'counter') never touches this file's behaviour: Player.y stays 0.
import { FIELD, type Content, type World } from '../types';
import { clamp, emit, hyp, type Ctx } from './ctx';

/** Free-mode-only numbers. Tuned against the balance test (see docs/wiki/sim-core.md). */
export const FREE = {
  /** Kannan's walk speed = stats.moveSpeed (700, a counter slide) x this. */
  speedMul: 0.3,
  startY: 140,
  /** Dash: distance (u), duration (s), cooldown (s). Hits are ignored while it runs. */
  dashDist: 140,
  dashTime: 0.18,
  dashCd: 1.2,
  /** Share of the throw rate kept while walking (Multitasker can raise it). */
  moveFire: 0.5,
  /** Fastest a bread may throw (s) however much attack speed stacks (combat-feel.md). */
  cdFloor: 0.3,
  /** A contact hit deals the pest's contactDps x 0.5 s x this (i-frames make hits rarer, so each lands harder). */
  contactHit: 3.5,
  /** Pests move at this x their counter-mode speed. */
  pestSpeed: 1.31,
  /** Pest contact reach = def.radius x this + kannanRadius. */
  contactScale: 0.7,
  /** A shooter/healer parks this fraction of its holdY away from Kannan. */
  holdScale: 0.6,
  /** Enemy shot hit radius on Kannan (u), added to the shot's own radius. */
  shotHit: 0.8 * FIELD.kannanRadius,
  /** Boss hp x this in free mode (Kannan throws while kiting, so the fight is otherwise too short). */
  bossHp: 1.21,
  /** Boss: seconds of calm after it parks before its first attack. */
  bossBeat: 1.5,
} as const;

export const isFreeMode = (content: Content): boolean => content.tune?.controlMode !== 'counter';
export const isFree = (c: Ctx | { w: World } | World): boolean => isFreeMode(('w' in c ? c.w : c).content);

/** Joystick walk, dash and i-frames for one step. */
export function moveFree(c: Ctx, input: { jx?: number; jy?: number; dodge?: boolean }): void {
  const { p, dt } = c;
  let jx = input.jx ?? 0;
  let jy = input.jy ?? 0;
  let m = hyp(jx, jy);
  if (m > 1) { jx /= m; jy /= m; m = 1; }
  const press = !!input.dodge;
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.iT) p.iT = Math.max(0, p.iT - dt);
  if (press && !p.dodgeHeld && p.dashT <= 0 && p.dashCd <= 0) {
    const live = m > 0.1;
    p.dashDx = live ? jx / m : p.faceX;
    p.dashDy = live ? jy / m : p.faceY;
    p.dashT = FREE.dashTime;
    p.dashCd = FREE.dashCd;
    emit(c, { t: 'dash', x: p.x, y: p.y, dx: p.dashDx, dy: p.dashDy });
  }
  p.dodgeHeld = press;
  if (m > 0.1) { p.faceX = jx / m; p.faceY = jy / m; }
  let vx: number;
  let vy: number;
  let t = dt;
  if (p.dashT > 0) {
    t = Math.min(dt, p.dashT);
    const v = FREE.dashDist / FREE.dashTime;
    vx = p.dashDx * v;
    vy = p.dashDy * v;
    p.dashT = p.dashT - dt <= 1e-9 ? 0 : p.dashT - dt;
  } else {
    const v = p.stats.moveSpeed * FREE.speedMul;
    vx = jx * v;
    vy = jy * v;
  }
  p.x = clamp(p.x + vx * t, -FIELD.kannanMaxX, FIELD.kannanMaxX);
  p.y = clamp(p.y + vy * t, FIELD.freeMinY, FIELD.freeMaxY);
  p.targetX = p.x;
  p.moving = m > 0.1 || p.dashT > 0;
}
