// Staying signed in while the app can't be reached. An access token lasts an hour; after that supabase-js renews it with
// the refresh token, which needs the server. Offline (or while the app is down) the renewal fails, and supabase-js then
// reports "no session" but keeps the session saved. That is not a sign-out: the person is still signed in, and their
// saved data stays. Only a real sign-out (which also removes the saved session) or a different person ends it.
// Pure helpers (no supabase import), so they can be unit-tested; src/data/supabase.ts and auth.tsx use them.
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/** The session supabase-js saved, if it looks like one (a person and a refresh token). Expired ones count. */
export function parseSavedSession(raw: string | null | undefined): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Session> | null;
    if (!s || typeof s !== 'object') return null;
    // What supabase-js itself needs to use it (it drops a saved session without these), plus who it is.
    if (typeof s.access_token !== 'string' || typeof s.refresh_token !== 'string' || typeof s.expires_at !== 'number') return null;
    if (typeof s.user?.id !== 'string') return null;
    return s as Session;
  } catch {
    return null;
  }
}

/**
 * Who is signed in after supabase-js reports `next` for `event` ('GET_SESSION' for getSession()). No session from
 * supabase-js while one is still saved means it couldn't be renewed (offline): keep it. SIGNED_OUT always ends it.
 */
export function sessionToKeep(event: AuthChangeEvent | 'GET_SESSION', next: Session | null, saved: Session | null): Session | null {
  if (next) return next;
  if (event === 'SIGNED_OUT') return null;
  return saved;
}

/**
 * Is this a data request (not sign-in) going out without a person's token? supabase-js sends the public key instead
 * when it has no usable session, and the server then answers as nobody: empty lists and "not found".
 */
export function sendsAsNobody(url: string, authorization: string | null, serverUrl: string, publicKey: string): boolean {
  const base = serverUrl.replace(/\/+$/, '');
  if (!url.startsWith(`${base}/`)) return false;
  if (!/^\/(rest|storage|functions)\/v1\//.test(url.slice(base.length))) return false;
  return !authorization || authorization === `Bearer ${publicKey}`;
}

/**
 * A failed session renewal that doesn't mean the session has ended: the answer isn't from the app's server (which always
 * answers in JSON) but from a Wi-Fi login page or a proxy, or the server said "too many requests, try later".
 * supabase-js would sign the person out; it's really "can't reach the app right now", so it's treated as no answer.
 */
export function renewalNotAnswered(url: string, serverUrl: string, status: number, contentType: string | null): boolean {
  const base = serverUrl.replace(/\/+$/, '');
  if (!url.startsWith(`${base}/auth/v1/token`) || !/[?&]grant_type=refresh_token(&|$)/.test(url)) return false;
  return status === 429 || (status >= 400 && !/json/i.test(contentType ?? ''));
}
