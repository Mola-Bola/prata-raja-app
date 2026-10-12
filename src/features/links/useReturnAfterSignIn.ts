import * as Linking from 'expo-linking';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { returnPathAfterSignIn } from '@/domain';

// Web: the address the page was opened with, read before the router sends a signed-out visitor to Welcome.
const LAUNCH_URL = Platform.OS === 'web' ? (globalThis.location?.href ?? null) : null;
const BASE = process.env.EXPO_BASE_URL ?? '';
// Web keeps it for this tab only (it survives Google sign-in, which leaves the page and comes back).
const KEY = 'prata-raja-return-to';
let pending: string | null = null;

const remember = (to: string) => {
  pending = to;
  try {
    globalThis.sessionStorage?.setItem(KEY, to);
  } catch {
    /* storage unavailable */
  }
};
const take = (): string | null => {
  let to = pending;
  try {
    to = to ?? globalThis.sessionStorage?.getItem(KEY) ?? null;
    globalThis.sessionStorage?.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  pending = null;
  return to;
};

/**
 * A link to a page that needs an account (a detail page…) opened while signed out lands on Welcome.
 * Remember it, and open it once they've signed in, instead of dropping them on Home.
 */
export function useReturnAfterSignIn(ready: boolean, signedIn: boolean) {
  const pathname = usePathname();
  const signedInRef = useRef(signedIn);
  useEffect(() => {
    signedInRef.current = signedIn;
  }, [signedIn]);

  // Opened signed out, straight onto a page that needs an account.
  useEffect(() => {
    if (!ready || signedIn) return;
    const to = returnPathAfterSignIn(Platform.OS === 'web' ? LAUNCH_URL : Linking.getLinkingURL(), BASE);
    if (to) remember(to);
    // Once, when the navigator first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Apps: links that arrive later, while signed out.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      const to = returnPathAfterSignIn(url);
      if (!signedInRef.current && to) remember(to);
    });
    return () => sub.remove();
  }, []);

  // Went to a password link instead: that flow decides where they end up.
  useEffect(() => {
    if (!signedIn && /^\/(i|reset-password)(\/|$)/.test(pathname)) take();
  }, [pathname, signedIn]);

  // Signed in: open the page they were after.
  useEffect(() => {
    if (!ready || !signedIn) return;
    const to = take();
    if (to) setTimeout(() => router.replace(to as never), 0);
  }, [ready, signedIn]);
}
