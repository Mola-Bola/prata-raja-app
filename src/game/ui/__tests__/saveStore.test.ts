import { describe, expect, it, vi } from 'vitest';

import { SAVE_KEY } from '@/core/save';
import { freshSaveV2 } from '@/meta/migrate';
import type { SaveV2 } from '@/meta/types';

import { createSaveStore } from '../saveStore';

/** A bridge whose writes finish when the test says so, and which notices two writes at once. */
function fakeIo(stored: string | null = null) {
  const writes: { json: string; done: () => void; fail: (e: Error) => void }[] = [];
  const log: string[] = [];
  let active = 0;
  let maxActive = 0;
  return {
    writes,
    log,
    get maxActive() {
      return maxActive;
    },
    io: {
      load: vi.fn(async () => stored),
      save: (key: string, json: string) => {
        expect(key).toBe(SAVE_KEY);
        active++;
        maxActive = Math.max(maxActive, active);
        return new Promise<void>((resolve, reject) => {
          writes.push({
            json,
            done: () => {
              active--;
              log.push(json);
              resolve();
            },
            fail: (e) => {
              active--;
              reject(e);
            },
          });
        });
      },
    },
  };
}
const gold = (g: number) => (s: SaveV2): SaveV2 => ({ ...s, gold: g });
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('save store', () => {
  it('migrates what it loads and writes nothing until something changes', async () => {
    const f = fakeIo(JSON.stringify({ v: 1, gold: 7, runs: 2 }));
    const store = createSaveStore(f.io);
    expect(store.current).toBeNull();
    const loaded = await store.load();
    expect(loaded).toMatchObject({ v: 2, gold: 7, runs: 2 });
    expect(f.writes).toHaveLength(0);
  });

  it('refuses to invent a save when the read fails, so a later write cannot wipe the real one', async () => {
    const io = { load: vi.fn(async () => Promise.reject(new Error('locked'))), save: vi.fn(async () => {}) };
    const store = createSaveStore(io);
    await expect(store.load()).rejects.toThrow('locked');
    expect(store.current).toBeNull();
    expect(store.commit(gold(1))).toBeNull();
    await store.flush();
    expect(io.save).not.toHaveBeenCalled();
  });

  it('never overlaps writes, coalesces a burst, and the newest save is written last', async () => {
    const f = fakeIo();
    const store = createSaveStore(f.io);
    await store.load();
    store.commit(gold(1));
    store.commit(gold(2));
    store.commit(gold(3));
    store.commit(gold(4));
    expect(f.writes).toHaveLength(1); // only the first write has started
    f.writes[0].done();
    await tick();
    expect(f.writes).toHaveLength(2); // the next one carries the newest save, not gold 2 or 3
    expect(JSON.parse(f.writes[1].json).gold).toBe(4);
    f.writes[1].done();
    await store.flush();
    expect(f.maxActive).toBe(1);
    expect(f.log.map((j) => JSON.parse(j).gold)).toEqual([1, 4]);
  });

  it('a commit that lands just as a write finishes is still written', async () => {
    const f = fakeIo();
    const store = createSaveStore(f.io);
    await store.load();
    store.commit(gold(1));
    f.writes[0].done();
    store.commit(gold(2)); // same turn as the write finishing, before the store has seen it
    await tick();
    expect(JSON.parse(f.writes.at(-1)!.json).gold).toBe(2);
    f.writes.at(-1)!.done();
    await store.flush();
    expect(JSON.parse(f.log.at(-1)!).gold).toBe(2);
  });

  it('applies each update to the newest save: two quick taps both count, a repeated no-op does not write', async () => {
    const f = fakeIo();
    const store = createSaveStore(f.io);
    await store.load();
    const add = (n: number) => (s: SaveV2): SaveV2 => ({ ...s, gold: s.gold + n });
    store.commit(add(5));
    store.commit(add(5));
    expect(store.current?.gold).toBe(10);
    const before = store.current;
    expect(store.commit((s) => s)).toBe(before);
    f.writes[0].done();
    await tick();
    f.writes[1].done();
    await store.flush();
    expect(f.writes).toHaveLength(2);
  });

  it('keeps an unwritten save in memory when the write fails, reports it, and retries with the newest one', async () => {
    const f = fakeIo();
    const store = createSaveStore(f.io);
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(store.failed));
    await store.load();
    store.commit(gold(5));
    f.writes[0].fail(new Error('quota'));
    await store.flush();
    expect(store.failed).toBe(true);
    expect(store.current?.gold).toBe(5);
    store.commit(gold(9)); // the next change tries again, with everything
    expect(JSON.parse(f.writes[1].json).gold).toBe(9);
    f.writes[1].done();
    await store.flush();
    expect(store.failed).toBe(false);
    expect(seen).toContain(true);
    expect(seen.at(-1)).toBe(false);
  });

  it('retry() writes the pending save again without a new change', async () => {
    const f = fakeIo();
    const store = createSaveStore(f.io);
    await store.load();
    store.commit(gold(5));
    f.writes[0].fail(new Error('offline'));
    await store.flush();
    void store.retry();
    expect(f.writes).toHaveLength(2);
    f.writes[1].done();
    await store.flush();
    expect(store.failed).toBe(false);
    expect(JSON.parse(f.log[0]).gold).toBe(5);
  });

  it('round-trips through storage: what was written loads back unchanged', async () => {
    const f = fakeIo();
    const a = createSaveStore(f.io);
    await a.load();
    a.commit((s) => ({ ...s, gold: 12, pendingChests: [], stallXp: 190 }));
    f.writes[0].done();
    await a.flush();
    const b = createSaveStore({ load: async () => f.log[0], save: async () => {} });
    expect(await b.load()).toEqual({ ...freshSaveV2(), gold: 12, stallXp: 190, unlocks: { gear: true, towel: true } });
  });
});
