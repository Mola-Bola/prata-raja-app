// The farthest run, for the title ("Best 1,200 m · Kopitiam Street") and the results "New best". A UI preference, not progress:
// the save has no metres field and its format is frozen, so this lives under its own bridge key (like hub/tips.ts).
import { bridge } from '../bridge';

const KEY = 'prata-raja/best-run';
export type BestRun = { metres: number; chapterId: string };

export async function loadBest(): Promise<BestRun | null> {
  try {
    const raw = JSON.parse((await bridge.load(KEY)) ?? 'null') as Partial<BestRun> | null;
    return raw && Number.isFinite(raw.metres) && typeof raw.chapterId === 'string' ? { metres: raw.metres!, chapterId: raw.chapterId } : null;
  } catch { return null; }
}

/** The new best if this run beat `prev`, else null (nothing is written). */
export function beaten(prev: BestRun | null, metres: number, chapterId: string): BestRun | null {
  if (!(metres > 0) || (prev && metres <= prev.metres)) return null;
  const next = { metres: Math.round(metres), chapterId };
  bridge.save(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}
