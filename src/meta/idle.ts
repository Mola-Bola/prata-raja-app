import { stallLevel } from './stall';
import type { SaveV2 } from './types';

const HOUR_MS = 3_600_000;
const CAP_HOURS = 12;

/** Integer ms times coins/hour, so rounding never drops a coin (floats gave 122 where 123 is owed). */
function accrued(save: SaveV2, now: Date) {
  const rate = 20 + 2 * (stallLevel(save.stallXp) - 1);
  const elapsed = save.idle.lastCollectedAt ? now.getTime() - Date.parse(save.idle.lastCollectedAt) : 0;
  const ms = Number.isFinite(elapsed) ? Math.min(CAP_HOURS * HOUR_MS, Math.max(0, elapsed)) : 0;
  return { rate, ms, gold: Math.floor((ms * rate) / HOUR_MS) };
}
export function preview(save: SaveV2, now: Date): { gold: number; hours: number; rate: number; capHours: number } {
  const { rate, ms, gold } = accrued(save, now);
  return { gold, hours: ms / HOUR_MS, rate, capHours: CAP_HOURS };
}
export function collect(save: SaveV2, now: Date): { save: SaveV2; rewards: ReturnType<typeof preview> } {
  const rewards = preview(save, now);
  if (!Number.isFinite(now.getTime()) || (save.idle.lastCollectedAt && now.getTime() < Date.parse(save.idle.lastCollectedAt))) return { save, rewards };
  // Keep the sub-coin time (ms) for the next collect; time above the printed cap is discarded.
  const { rate, ms, gold } = accrued(save, now);
  const keptMs = ms >= CAP_HOURS * HOUR_MS ? 0 : (ms * rate - gold * HOUR_MS) / rate;
  return { save: { ...save, gold: save.gold + gold, idle: { lastCollectedAt: new Date(now.getTime() - keptMs).toISOString() } }, rewards };
}
