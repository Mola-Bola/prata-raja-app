export type TehCue = { remaining: number; elapsed: number; scale: number; warm: boolean };

/** Follow the sim timer, so a frozen timer cannot animate or invent another activation. */
export function tehCue(previous: TehCue, remaining: number, visible = true, calm = false): TehCue {
  remaining = Math.max(0, remaining);
  const elapsed = remaining <= 0 || remaining > previous.remaining
    ? 0
    : previous.elapsed + Math.max(0, previous.remaining - remaining);
  const warm = visible && remaining > 0;
  const beat = 0.5 + 0.5 * Math.cos(elapsed * Math.PI * 4);
  const pop = elapsed < 0.24 ? 0.12 * Math.sin(elapsed / 0.24 * Math.PI) : 0;
  return { remaining, elapsed, warm, scale: warm && !calm ? 1 + 0.04 * beat + pop : 1 };
}
