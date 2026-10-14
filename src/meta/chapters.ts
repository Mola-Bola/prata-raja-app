import { beatsOf } from './story';
import type { SaveV2 } from './types';

/** The beat that opens each chapter (null: open from the start). Legacy saves that paid three boss attempts stay open too. */
const GATE: Record<string, string | null> = { 'kopitiam-street': null, 'hawker-night': 'kopitiam-street-done' };
const LEGACY_ATTEMPTS: Record<string, string> = { 'hawker-night': 'kopitiam-street' };

export function chapterUnlocked(save: SaveV2, id: string): boolean {
  if (!Object.hasOwn(GATE, id)) return false;
  const gate = GATE[id];
  if (gate === null || beatsOf(save).includes(gate)) return true;
  const legacy = LEGACY_ATTEMPTS[id];
  return legacy !== undefined && (save.bossAttempts[legacy] ?? 0) >= 3;
}
