// Me → "Larger text": a display setting kept on this device (not per person, like the phone's own font size). It
// multiplies the type scale by LARGE_TEXT (src/ui/theme.ts) on top of the system font scale. localStorage is
// expo-sqlite's on the phones and the browser's on the web.
import { useSyncExternalStore } from 'react';

const KEY = 'prata-raja-large-text';

function read(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let on = read();
const listeners = new Set<() => void>();

export function setLargeText(next: boolean) {
  on = next;
  try {
    if (next) globalThis.localStorage?.setItem(KEY, '1');
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* storage unavailable: it still applies until the app closes */
  }
  listeners.forEach((l) => l());
}

export const useLargeText = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => on,
    () => false,
  );
