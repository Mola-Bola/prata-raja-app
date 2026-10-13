const MAX_SPEED = 600;
const DECELERATION = 3000;
const EASE_DISTANCE = MAX_SPEED * MAX_SPEED / (2 * DECELERATION);

/** Pending distance after dt: capped travel, then constant deceleration to exact rest. */
export function remainingKnockback(pending: number, dt: number): number {
  if (pending <= 0 || !Number.isFinite(dt) || dt <= 0) return pending;
  const cruiseTime = Math.max(0, pending - EASE_DISTANCE) / MAX_SPEED;
  if (dt < cruiseTime) return pending - MAX_SPEED * dt;
  const tail = Math.min(pending, EASE_DISTANCE);
  const stopTime = Math.sqrt(2 * tail / DECELERATION);
  const tailTime = dt - cruiseTime;
  if (tailTime >= stopTime) return 0;
  // Remaining distance determines velocity, so added impulses need no separate timer/state.
  return DECELERATION / 2 * (stopTime - tailTime) ** 2;
}
