import { describe, expect, it } from 'vitest';

import { cleanFrom, createDeviceStore, DEVICE_KEY, FROM_MAX, parseDevice } from '../deviceState';

const ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const fresh = () => ID.replace('9b1d', 'aaaa');

describe('cleanFrom', () => {
  it('keeps a name to one short, plain line', () => {
    expect(cleanFrom('  Mum  ')).toBe('Mum');
    expect(cleanFrom('Mum\n\tand\u0000 Dad')).toBe('Mum and Dad');
    expect(cleanFrom('x'.repeat(100))).toHaveLength(FROM_MAX);
    expect(cleanFrom(undefined)).toBe('');
    expect(cleanFrom(42)).toBe('');
  });
});

describe('parseDevice', () => {
  it('reads a stored state', () => {
    expect(parseDevice(JSON.stringify({ v: 1, id: ID, from: 'Mum', analytics: false }), fresh)).toEqual({ v: 1, id: ID, from: 'Mum', analytics: false });
  });

  it('starts fresh (analytics on, a new id) when nothing is stored or it is unreadable', () => {
    for (const json of [null, '', '{nope', '[]', '"x"', 'null', '42']) {
      expect(parseDevice(json, fresh)).toEqual({ v: 1, id: fresh(), from: '', analytics: true });
    }
  });

  it('keeps what it can: a bad id is replaced, a bad name or switch falls back', () => {
    expect(parseDevice(JSON.stringify({ id: 'not-an-id', from: 7, analytics: 'yes' }), fresh)).toEqual({ v: 1, id: fresh(), from: '', analytics: true });
    expect(parseDevice(JSON.stringify({ id: ID }), fresh).analytics).toBe(true);
  });

  it('makes a real uuid by default', () => {
    expect(parseDevice(null).id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('the device store', () => {
  const io = (stored: string | null | Error) => {
    const saved: Record<string, string> = {};
    return {
      saved,
      load: async (key: string) => {
        if (stored instanceof Error) throw stored;
        expect(key).toBe(DEVICE_KEY);
        return stored;
      },
      save: async (key: string, json: string) => {
        saved[key] = json;
      },
    };
  };

  it('is empty until loaded, then gives the stored state', async () => {
    const store = createDeviceStore();
    expect(store.get()).toBeNull();
    const state = await store.load(io(JSON.stringify({ v: 1, id: ID, from: 'Dad', analytics: true })));
    expect(state).toMatchObject({ id: ID, from: 'Dad' });
    expect(store.get()).toBe(state);
  });

  it('writes a first-launch id at once, so the next launch is the same device', async () => {
    const bridge = io(null);
    const store = createDeviceStore();
    await store.load(bridge, fresh);
    expect(JSON.parse(bridge.saved[DEVICE_KEY])).toEqual({ v: 1, id: fresh(), from: '', analytics: true });
  });

  it('still works when storage cannot be read (this launch gets its own id)', async () => {
    const store = createDeviceStore();
    const state = await store.load(io(new Error('no storage')), fresh);
    expect(state).toMatchObject({ id: fresh(), analytics: true });
  });

  it('loads once: a second load returns the same state', async () => {
    const store = createDeviceStore();
    const a = await store.load(io(null), fresh);
    const b = await store.load(io(JSON.stringify({ v: 1, id: ID })), fresh);
    expect(b).toBe(a);
  });

  it('saves every change whole, tells listeners, and ignores a change that changes nothing', async () => {
    const bridge = io(null);
    const store = createDeviceStore();
    await store.load(bridge, fresh);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.update({ from: '  Kannan  ' });
    store.update({ analytics: false });
    store.update({ analytics: false });
    expect(calls).toBe(2);
    expect(JSON.parse(bridge.saved[DEVICE_KEY])).toEqual({ v: 1, id: fresh(), from: 'Kannan', analytics: false });
    off();
    store.update({ from: 'Other' });
    expect(calls).toBe(2);
  });

  it('ignores updates before it has loaded', () => {
    const store = createDeviceStore();
    store.update({ analytics: false });
    expect(store.get()).toBeNull();
  });
});
