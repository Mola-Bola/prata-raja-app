// First-visit station tips: which stations' one-line help the player has already seen. A UI preference, not progress: it lives
// under its own bridge key (the phone keeps it; the web build uses localStorage), never in the save.
import { bridge } from '../../bridge';

const KEY = 'prata-raja/hub-tips';
let seen: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;

/** The station ids whose tip was already shown (empty if storage fails: the tip then shows once per launch). */
export function seenTips(): Promise<Set<string>> {
  if (seen) return Promise.resolve(seen);
  loading ??= bridge.load(KEY).then((json) => {
    try { seen = new Set(JSON.parse(json ?? '[]') as string[]); } catch { seen = new Set(); }
    return seen;
  }, () => (seen = new Set()));
  return loading;
}

export function markTipSeen(id: string): void {
  if (!seen) return;
  seen.add(id);
  bridge.save(KEY, JSON.stringify([...seen])).catch(() => {});
}

export const TIPS: Record<string, string> = {
  tawa: 'Pick the roti you take on a run.',
  dips: 'Fill katori bowls with dips. Each dip changes how your rotis hit.',
  gear: 'Wear gear for stats, or forge new pieces from materials.',
  pantry: 'Your ingredients and chests live here.',
  spec: 'Spend spec points on perks that make every run stronger.',
  orders: 'Choose where the next run goes.',
  kopi: 'Have a kopi before the run for a small boost.',
  exit: 'Pick a place and head out to the street.',
};
