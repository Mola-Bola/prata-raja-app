// The overlay's one copy of the save, and the one writer of SAVE_KEY. Everything that changes progress goes through commit():
// it applies a pure update (src/meta) to the NEWEST save, so two quick taps can never both start from a stale copy, and it
// queues one write. Writes never overlap (some bridges, e.g. the phone's SQLite, can finish out of order) and are coalesced:
// whatever is newest when a write finishes is written next, so the last commit always lands last and nothing is dropped.
import { SAVE_KEY } from '@/core/save';
import { parseSaveV2 } from '@/meta/migrate';
import type { SaveV2 } from '@/meta/types';

import type { Bridge } from '../bridgeTypes';

type Io = Pick<Bridge, 'load' | 'save'>;

export type SaveStore = {
  /** The newest save: null until load() has succeeded. */
  readonly current: SaveV2 | null;
  /** True while the newest save could not be written (storage full or blocked). It stays in memory and is retried. */
  readonly failed: boolean;
  /** Reads the stored save (a v1 save from an older build is migrated). Rejects when the bridge fails: a failed read must
   *  never turn into a fresh save, or the next write would wipe the real one. */
  load(): Promise<SaveV2>;
  /** Applies `update` to the newest save and queues a write; an update that returns the same object changes nothing.
   *  Returns the new save, or null before the first load. */
  commit(update: (save: SaveV2) => SaveV2): SaveV2 | null;
  /** Tries the pending write again (after a failure). */
  retry(): Promise<void>;
  /** Resolves once the newest save is written, or the write failed. */
  flush(): Promise<void>;
  /** Called whenever `current` or `failed` changes. */
  subscribe(listener: () => void): () => void;
};

export function createSaveStore(io: Io, key: string = SAVE_KEY): SaveStore {
  let current: SaveV2 | null = null;
  let written: SaveV2 | null = null;
  let failed = false;
  let running = false;
  let lastDrain: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  async function drain(): Promise<void> {
    try {
      while (current && current !== written) {
        const snapshot = current;
        try {
          await io.save(key, JSON.stringify(snapshot));
        } catch (e) {
          console.warn('[save] write failed', e);
          if (!failed) {
            failed = true;
            notify();
          }
          return; // the next commit or retry() carries the whole newest save again
        }
        written = snapshot;
        if (failed) {
          failed = false;
          notify();
        }
      }
    } finally {
      running = false; // same tick as the last check above: a commit cannot slip in between and be left unwritten
    }
  }

  const kick = (): Promise<void> => {
    if (!running) {
      running = true;
      lastDrain = drain();
    }
    return lastDrain;
  };

  return {
    get current() {
      return current;
    },
    get failed() {
      return failed;
    },
    async load() {
      const json = await io.load(key);
      if (current) return current; // progress already in memory is newer than what was read
      current = written = parseSaveV2(json);
      notify();
      return current;
    },
    commit(update) {
      if (!current) return null;
      const next = update(current);
      if (next === current) return current;
      current = next;
      notify();
      void kick();
      return next;
    },
    retry: kick,
    async flush() {
      while (running) await lastDrain;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
