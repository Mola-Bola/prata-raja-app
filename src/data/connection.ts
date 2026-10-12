// Two separate facts about the connection: is the device online, and does the app server answer. The device can be
// online while the server can't be reached (it's down, or the phone is on another network), and people need to be
// told which. Plain state with no imports, so errors.ts (and its tests) can read it.
// Kept up to date by src/data/query.tsx (device) and src/data/reachability.ts (server).

let deviceOnline = true;
let serverDown = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const isDeviceOnline = () => deviceOnline;
export const isServerDown = () => serverDown;

export function setDeviceOnline(next: boolean) {
  if (deviceOnline === next) return;
  deviceOnline = next;
  emit();
}

export function setServerDown(next: boolean) {
  if (serverDown === next) return;
  serverDown = next;
  emit();
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
