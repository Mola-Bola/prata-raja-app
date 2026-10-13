// What this device remembers about itself, outside the progress save (src/core/save.ts, which the stall owns): an anonymous
// device id, the optional name notes are sent "From", and the Analytics switch. It lives under its own bridge key because the
// game's WebView has no localStorage: the phone keeps it (bridge.save/load), the web build uses localStorage.
// Pure parse/serialise + a small store; nothing here knows about PostHog or the feedback sheet.
import { uuid } from '@/data/bytes';

import type { Bridge } from './bridgeTypes';

export const DEVICE_KEY = 'prata-raja/device';
export const FROM_MAX = 40;

export type DeviceState = {
  v: 1;
  /** Random per install; the only identity analytics and notes carry. Never linked to an account. */
  id: string;
  /** Who notes are "From" (optional, typed by the person). */
  from: string;
  /** Private feedback credential. Never pass to analytics or event context. */
  secret: string | null;
  /** The Analytics switch in the pause sheet: default on. */
  analytics: boolean;
};

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SECRET = /^[0-9a-f-]{36}\.[0-9a-f-]{36}$/i;

function newSecret(): string | null {
  // Authentication must never use uuid()'s Math.random fallback on old WebViews.
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) return null;
  const secureUuid = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  return `${secureUuid()}.${secureUuid()}`;
}

/** A name as typed: control characters out, runs of spaces folded, at most FROM_MAX characters. */
export function cleanFrom(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, FROM_MAX).trim();
}

/** The stored JSON, or a fresh state when it is missing, broken or from some other version. Always has a valid id. */
export function parseDevice(json: string | null, makeId: () => string = uuid): DeviceState {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = json === null ? null : JSON.parse(json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
  } catch {
    // unreadable: start fresh
  }
  return {
    v: 1,
    id: typeof raw.id === 'string' && ID.test(raw.id) ? raw.id : makeId(),
    from: cleanFrom(raw.from),
    secret: typeof raw.secret === 'string' && SECRET.test(raw.secret) && raw.secret.split('.').every(part => ID.test(part)) ? raw.secret : newSecret(),
    analytics: typeof raw.analytics === 'boolean' ? raw.analytics : true,
  };
}

type Listener = () => void;
type Io = Pick<Bridge, 'load' | 'save'>;

/**
 * One per page. `get()` is null until the first load answers; a failed load still ends in a usable state (a new id for
 * this launch), so analytics and notes never wait on storage. Every change is written back whole.
 */
export function createDeviceStore() {
  let state: DeviceState | null = null;
  let io: Io | null = null;
  let secretSaved = false;
  const subs = new Set<Listener>();
  const set = (next: DeviceState) => {
    state = next;
    subs.forEach((fn) => fn());
  };
  const persist = () => {
    if (io && state) {
      const secret = state.secret;
      try {
        io.save(DEVICE_KEY, JSON.stringify(state)).then(() => {
          if (secret && state?.secret === secret && !secretSaved) { secretSaved = true; subs.forEach(fn => fn()); }
        }).catch(() => {});
      } catch { /* Private actions remain disabled when persistence fails. */ }
    }
  };
  return {
    get: (): DeviceState | null => state,
    secretSaved: (): boolean => secretSaved,
    subscribe(fn: Listener): () => void {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    /** Read the stored state once (later calls return it). Resolves with the state either way. */
    async load(bridge: Io, makeId?: () => string): Promise<DeviceState> {
      io = bridge;
      if (state) return state;
      let json: string | null = null;
      try {
        json = await bridge.load(DEVICE_KEY);
      } catch {
        // no storage: this launch gets its own id
      }
      if (!state) {
        set(parseDevice(json, makeId));
        persist(); // a first launch writes its id at once, so the next launch is the same device
      }
      return state!;
    },
    update(patch: Partial<Pick<DeviceState, 'from' | 'analytics'>>): void {
      if (!state) return;
      const next: DeviceState = {
        ...state,
        ...(patch.from !== undefined ? { from: cleanFrom(patch.from) } : {}),
        ...(patch.analytics !== undefined ? { analytics: patch.analytics } : {}),
      };
      if (next.from === state.from && next.analytics === state.analytics) return;
      set(next);
      persist();
    },
  };
}

export type DeviceStore = ReturnType<typeof createDeviceStore>;
