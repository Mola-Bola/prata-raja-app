import { isDisabled } from './status';
import { FIELD, type Enemy } from './types';

export const CONTACT_WINDUP = 0.3;
export const CONTACT_STRIKE = 0.2;
export const CONTACT_CYCLE = 1;
export const CONTACT_REACH_SLACK = 0.5;
const EPS = 1e-9;

/** Ordinary walkers, including a ranged definition without its shooting data. */
export function normalContactEnemy(e: Enemy): boolean {
  return !e.boss && !e.def.stealGold
    && !(e.def.kind === 'shooter' && e.def.ranged)
    && e.def.kind !== 'healer' && e.def.kind !== 'exploder';
}

/** Total strike seconds up to t; subtraction handles partial windows and any number of cycles. */
function strikeIntegral(t: number): number {
  const cycles = Math.floor(t / CONTACT_CYCLE);
  return cycles * CONTACT_STRIKE + Math.max(0, Math.min(CONTACT_STRIKE, t - cycles * CONTACT_CYCLE - CONTACT_WINDUP));
}

/** Advance only the caller's active time. Returns the exact strike overlap in seconds, without RNG. */
export function advanceContactAttack(e: Enemy, dt: number): number {
  const start = e.contactClock ?? 0;
  const end = start + dt;
  const strike = strikeIntegral(end) - strikeIntegral(start);
  const clock = end % CONTACT_CYCLE;
  e.contactClock = clock < EPS || CONTACT_CYCLE - clock < EPS ? 0 : clock;
  return strike;
}

/** Shared core-to-render timing; no cue for a corpse, displacement, special attack or disabled enemy. */
export function contactAttackPhase(e: Enemy): { phase: 'windup' | 'strike' | 'recovery'; progress: number } | null {
  if (!normalContactEnemy(e) || e.state !== 'attack' || e.hp <= 0 || e.y > FIELD.reachY + CONTACT_REACH_SLACK || isDisabled(e)) return null;
  const clock = e.contactClock ?? 0;
  if (clock < CONTACT_WINDUP - EPS) return { phase: 'windup', progress: clock / CONTACT_WINDUP };
  if (clock < CONTACT_WINDUP + CONTACT_STRIKE - EPS) return { phase: 'strike', progress: Math.max(0, (clock - CONTACT_WINDUP) / CONTACT_STRIKE) };
  return { phase: 'recovery', progress: Math.max(0, (clock - CONTACT_WINDUP - CONTACT_STRIKE) / (CONTACT_CYCLE - CONTACT_WINDUP - CONTACT_STRIKE)) };
}
