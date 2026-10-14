// The browser's side of the game bridge: localStorage, navigator.vibrate (Android Chrome; iOS Safari has none), and a
// console line for analytics. Same shape as bridge.ts (the phone's), which Metro picks on Android and iOS.
// The progress save (SAVE_KEY) is also mirrored to public.game_saves when signed in: local always wins a write, the cloud
// copy is a debounced follower, and on load the newer stamp wins (saveMerge.ts). A failed cloud write keeps the local save
// and is retried; the local stamp stays ahead of the cloud's until it lands, so a reload pushes it too.
import { SAVE_KEY } from '@/core/save';
import { SERVER_URL, SUPABASE_KEY, supabase } from '@/data/supabase';

import type { Bridge, HapticKind } from './bridgeTypes';
import { pickNewer } from './saveMerge';

const NS = 'game:';
const BUZZ: Record<HapticKind, number | number[]> = { light: 8, medium: 16, heavy: 32, success: [0, 12, 70, 20] };
const DEBOUNCE_MS = 3000;
const RETRY_MS = 30_000;
const TABLE = `${SERVER_URL}/rest/v1/game_saves`;

// Ask the browser not to evict this origin's storage (the local save is the offline copy).
try { void navigator.storage?.persist?.(); } catch { /* not supported */ }

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const stampOf = () => Number(read(`${NS}${SAVE_KEY}:at`)) || 0; // saves from before this existed have none: 0

let session: { token: string; userId: string } | null = null;
const sessionReady = supabase.auth.getSession().then(({ data }) => { session = data.session ? { token: data.session.access_token, userId: data.session.user.id } : null; }, () => {});
supabase.auth.onAuthStateChange((_e, s) => { session = s ? { token: s.access_token, userId: s.user.id } : null; });

const headers = () => ({ apikey: SUPABASE_KEY, authorization: `Bearer ${session!.token}`, 'content-type': 'application/json' });

let dirty = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Upload the current local save. `keepalive` lets it finish while the page closes. */
async function push(keepalive = false): Promise<void> {
  clearTimeout(timer);
  const json = read(NS + SAVE_KEY);
  if (!dirty || !session || !json) return;
  try {
    const data = JSON.parse(json);
    const res = await fetch(`${TABLE}?on_conflict=user_id`, {
      method: 'POST',
      keepalive,
      headers: { ...headers(), prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: session.userId, data, version: typeof data.version === 'number' ? data.version : 0, updated_at: new Date(stampOf()).toISOString() }),
    });
    if (!res.ok) throw new Error(String(res.status));
    if (read(NS + SAVE_KEY) === json) dirty = false; // a newer save made meanwhile stays dirty
  } catch {
    timer = setTimeout(() => void push(), RETRY_MS); // offline or server trouble: local is safe, try again later
  }
}

const schedule = () => { dirty = true; clearTimeout(timer); timer = setTimeout(() => void push(), DEBOUNCE_MS); };
addEventListener('pagehide', () => void push(true));

async function loadProgress(): Promise<string | null> {
  const json = read(NS + SAVE_KEY);
  await sessionReady;
  if (!session) return json;
  try {
    const res = await fetch(`${TABLE}?select=data,updated_at&user_id=eq.${session.userId}`, { headers: headers(), signal: AbortSignal.timeout(8000) });
    const row = res.ok ? ((await res.json()) as { data: unknown; updated_at: string }[])[0] : undefined;
    const local = json ? { json, at: stampOf() } : null;
    const cloud = row ? { json: JSON.stringify(row.data), at: Date.parse(row.updated_at) || 0 } : null;
    if (pickNewer(local, cloud) === 'cloud' && cloud) {
      localStorage.setItem(NS + SAVE_KEY, cloud.json);
      localStorage.setItem(`${NS}${SAVE_KEY}:at`, String(cloud.at));
      return cloud.json;
    }
    if (json && res.ok && (!row || local!.at > cloud!.at)) schedule(); // local is ahead (or the cloud has none): send it up
  } catch { /* cloud unreachable: play on the local save */ }
  return json;
}

export const bridge: Bridge = {
  haptic: async (kind) => {
    navigator.vibrate?.(BUZZ[kind]);
  },
  save: async (key, json) => {
    localStorage.setItem(NS + key, json);
    if (key === SAVE_KEY) {
      localStorage.setItem(`${NS}${key}:at`, String(Date.now()));
      schedule();
    }
  },
  load: async (key) => (key === SAVE_KEY ? loadProgress() : localStorage.getItem(NS + key)),
  track: async (event, props) => console.log('[track]', event, JSON.stringify(props)),
};
