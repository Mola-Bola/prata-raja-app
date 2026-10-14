import type { HapticKind } from '../bridgeTypes';

/** Wall-clock spacing: faster simulation and mixed event sources cannot multiply cues. */
export class FeedbackGate {
  private at = -Infinity;

  allow(now: number, gap = 0): boolean {
    if (now - this.at < Math.max(750, gap)) return false;
    this.at = now;
    return true;
  }

  reset(): void {
    this.at = -Infinity;
  }
}

const strength: Record<HapticKind, number> = { light: 0, medium: 1, heavy: 2, success: 3 };

/** Pick once per sim event batch; no deferred vibration to spill across pauses or runs. */
export function strongerHaptic(current: HapticKind | null, next: HapticKind): HapticKind {
  return current === null || strength[next] > strength[current] ? next : current;
}
