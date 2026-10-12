import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { friendlyError, OPENED_WITH_AUTH_LINK } from '@/data';
import { type AuthLinkResult, authLinkResult } from '@/domain';
import { useToast } from '@/ui';

/** Take "#error=…" out of the address bar once it has been dealt with, so a reload doesn't show it again. */
function clearAddressError() {
  try {
    const loc = globalThis.location;
    if (loc?.hash) globalThis.history?.replaceState(globalThis.history.state, '', `${loc.pathname}${loc.search}`);
  } catch {
    /* not a browser */
  }
}

/**
 * Web: opened from an auth link (src/data/supabase.ts reads it before supabase-js does).
 * - A "choose a new password" email signs them in: send them to /reset-password once, wherever the auth server's
 *   redirect actually landed (it falls back to the site's home page for addresses it doesn't accept).
 * - A link that was used already or ran out: show /reset-password's "This link has expired", signed in or not.
 * - Any other error the link brought back (e.g. from Google): say it, instead of landing silently.
 */
export function useOpenPasswordReset(ready: boolean, signedIn: boolean) {
  const done = useRef(false);
  const pathname = usePathname();
  const toast = useToast();

  const showProblem = (link: Exclude<AuthLinkResult, { kind: 'recovery' }>) => {
    if (link.kind === 'expired') {
      setTimeout(() => router.replace('/reset-password?expired=1'), 0);
      return;
    }
    clearAddressError();
    toast.error(friendlyError({ code: link.code, message: link.message || link.code }));
  };

  useEffect(() => {
    const link = OPENED_WITH_AUTH_LINK;
    if (!link || done.current || !ready) return;
    if (link.kind === 'recovery') {
      if (!signedIn) return;
      done.current = true;
      // Already there (the email's own address was accepted): keep its ?next=, which leads back to the page they were on.
      if (!/\/reset-password$/.test(pathname)) setTimeout(() => router.replace('/reset-password'), 0);
      return;
    }
    done.current = true;
    showProblem(link);
    // Once, when the navigator is ready (and, for a password link, signed in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signedIn]);

  // A used link opened in a tab that already shows the app only changes the #fragment: the page doesn't reload.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !ready) return;
    const onHash = () => {
      const link = authLinkResult(window.location.href);
      if (link && link.kind !== 'recovery') showProblem(link);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
