import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { type AuthLinkResult, authLinkResult } from '@/domain';

import { isDeviceOnline, isServerDown, subscribeConnection } from './connection';
import type { Database } from './database.types';
import { parseSavedSession, renewalNotAnswered, sendsAsNobody } from './savedSession';

const SERVER_KEY = 'prata-raja-server-url';
const DEFAULT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function readOverride(): string | null {
  try {
    return globalThis.localStorage?.getItem(SERVER_KEY) || null;
  } catch {
    return null;
  }
}

/** Server the app talks to. Overridable at runtime (local-first review: the Mac's LAN IP can change). */
export const SERVER_URL = readOverride() ?? DEFAULT_URL;
export const DEFAULT_SERVER_URL = DEFAULT_URL;

/** Save a new server URL (or null to reset). Takes effect after the app restarts/reloads. */
export function setServerUrl(next: string | null) {
  try {
    if (next) globalThis.localStorage?.setItem(SERVER_KEY, next.trim().replace(/\/$/, ''));
    else globalThis.localStorage?.removeItem(SERVER_KEY);
  } catch {
    /* storage unavailable */
  }
}

const url = SERVER_URL;
/** Publishable (public) key: safe in the app; used for the few calls made outside supabase-js. */
export const SUPABASE_KEY = key;

/** Base for links back into the web app. Follows a server override (same host, web port 8181) so links stay valid. */
export const WEB_URL = (
  readOverride()?.replace(/:55321$/, ':8181') ?? process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8181'
).replace(/\/$/, '');


/**
 * Web: this page was opened from an auth link: a "choose a new password" email (Supabase adds #…type=recovery), or one
 * that was already used or ran out (#error_code=otp_expired…). Read before the client consumes the URL. The root layout
 * then opens /reset-password (src/features/links/useOpenPasswordReset.ts), even if the email's link fell back to the
 * site's home page because the auth server didn't accept the /reset-password address.
 */
export const OPENED_WITH_AUTH_LINK: AuthLinkResult | null =
  Platform.OS === 'web' && typeof window !== 'undefined' ? authLinkResult(window.location.href) : null;
export const OPENED_FOR_PASSWORD_RESET = OPENED_WITH_AUTH_LINK?.kind === 'recovery';

/** Where supabase-js saves the session (its default name for this server, spelled out so the app can read it too). */
const AUTH_STORAGE_KEY = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;

/** The session saved on this device, even if its access token has expired (src/data/savedSession.ts). */
export function savedSession() {
  try {
    return parseSavedSession(globalThis.localStorage?.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Sign out on this device only: what supabase-js does itself, for when it can't (a session it couldn't renew). */
export function forgetSavedSession() {
  for (const k of [AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-user`, `${AUTH_STORAGE_KEY}-code-verifier`]) {
    try {
      globalThis.localStorage?.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  }
}

/**
 * Web: this page is the end of a sign-in link (email confirmation, Google). supabase-js signs in from the URL, so
 * the session saved on this device may be about to change.
 */
export const OPENED_WITH_SIGN_IN =
  Platform.OS === 'web' && typeof window !== 'undefined' && /(^|[#&?])(access_token|code|error_description)=/.test(`${window.location.hash}&${window.location.search}`);

/**
 * Every request supabase-js makes. While a session is saved but couldn't be renewed yet (offline, or the app wasn't
 * answering), supabase-js sends data requests as nobody. The server would answer with empty lists and "not found",
 * which would replace the saved copy and show things that aren't true. Those requests fail like an unanswered one
 * instead, so screens keep the saved copy and try again once the session is renewed. A renewal answered by a Wi-Fi
 * login page or a proxy, or turned away for now, also counts as unanswered, not as the session ending
 * (src/data/savedSession.ts).
 */
const guardedFetch: typeof fetch = async (input, init) => {
  const href = typeof input === 'string' ? input : 'url' in input ? input.url : input.href;
  const authorization = new Headers(init?.headers).get('Authorization');
  if (sendsAsNobody(href, authorization, url, key) && savedSession()) {
    throw new TypeError('Failed to fetch: the session is waiting to be renewed');
  }
  const res = await fetch(input, init);
  if (renewalNotAnswered(href, url, res.status, res.headers.get('Content-Type'))) {
    throw new TypeError(`Failed to fetch: HTTP ${res.status} while renewing the session`);
  }
  return res;
};

export const supabase = createClient<Database>(url, key, {
  // TanStack Query does the retrying (src/data/query.tsx). Supabase's own retries on top made a screen spin for
  // ~15 s before saying anything when the server was down. The timeout stops a request hanging when it never answers.
  db: { retry: false, timeout: 30_000 },
  global: { fetch: guardedFetch },
  auth: {
    storage: globalThis.localStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    // Web: the email-confirmation link lands on the web app with a session in the URL; sign them straight in.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Back in touch with the app: renew a session that expired meanwhile straight away, so screens load as the person
 * rather than waiting. supabase-js holds off for a minute after a failed renewal; that failure was while offline,
 * so it's forgotten (a private field of supabase-js: if it goes away, renewal just happens a little later).
 */
subscribeConnection(() => {
  if (!isDeviceOnline() || isServerDown()) return;
  const s = savedSession();
  if (!s?.expires_at || s.expires_at * 1000 - Date.now() > 90_000) return;
  const auth = supabase.auth as unknown as { lastRefreshFailure?: unknown };
  if ('lastRefreshFailure' in auth) auth.lastRefreshFailure = null;
  void supabase.auth.getSession();
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
