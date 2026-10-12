// Whether the app server answers. When requests fail without an answer while the device is online, the server
// counts as unreachable: the query client treats that like being offline (reads keep showing saved data and wait,
// offline writes queue) and the banner says "Can't reach the app". Meanwhile the server is checked every few
// seconds; once it answers, everything resumes by itself, without a tap.
import { useSyncExternalStore } from 'react';

import { isDeviceOnline, isServerDown, setServerDown, subscribeConnection } from './connection';
import { SERVER_URL, SUPABASE_KEY } from './supabase';

const PROBE_MS = 5000;

let timer: ReturnType<typeof setInterval> | null = null;

const stopProbing = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

async function probe() {
  try {
    // Any answer below 500 means the server is up (this endpoint needs no session).
    const res = await fetch(`${SERVER_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY } });
    if (res.status < 500) reportServerOk();
  } catch {
    /* still can't reach it */
  }
}

/** A request got no answer. If the device is online, the server is unreachable until a check says otherwise. */
export function reportServerUnreachable() {
  if (!isDeviceOnline()) return; // offline: the offline banner and reconnecting handle it
  setServerDown(true);
  if (!timer) timer = setInterval(probe, PROBE_MS);
}

/** Something got an answer from the server. */
export function reportServerOk() {
  if (!isServerDown()) return;
  stopProbing();
  setServerDown(false);
}

// Going offline supersedes "can't reach the server"; once back online, requests find out again.
subscribeConnection(() => {
  if (!isDeviceOnline() && isServerDown()) reportServerOk();
});

/** True while the device is online but the app server isn't answering. */
export function useServerDown() {
  return useSyncExternalStore(subscribeConnection, isServerDown, isServerDown);
}
