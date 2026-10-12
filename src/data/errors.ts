// Turns database/RPC errors into sentences people can act on. Add new codes here, not in screens.
import { brandWords } from '../brand';
import { isDeviceOnline, isServerDown } from './connection';

const APP_NAME = brandWords.appName;

const MESSAGES: Record<string, string> = {
  bad_transition: 'That change isn’t possible right now. Someone may have just updated it. Pull to refresh.',
  not_signed_in: 'Please sign in first.',
  // Saving a guest account with an email that already has an account. "Sign in instead" would leave behind
  // everything they added as a guest, so say that.
  guest_email_taken:
    'That email already has an account. Use a different email to save this one. If you sign in to the other account instead, what you added here won’t come with you.',
};

// Supabase Auth errors, matched on the AuthError code or its message.
const AUTH_MESSAGES: [RegExp, string, string][] = [
  [/invalid_credentials|Invalid login credentials/i, 'That email and password don’t match. Check them, or tap “Forgot password?”.', 'invalid_credentials'],
  [/email_not_confirmed|Email not confirmed/i, 'Please confirm your email first: tap the link we sent you, then sign in.', 'email_not_confirmed'],
  // Sign-up says "User already registered"; changing a guest's email says "email_exists … has already been registered".
  [/user_already_exists|email_exists|already (been )?registered/i, 'There’s already an account with that email. Sign in instead.', 'user_already_exists'],
  [/email_address_not_authorized|Email address not authorized/i, `${APP_NAME} can’t send email to that address yet, so it can’t confirm it. Use “Continue with Google” if you see it, or ask the person who invited you.`, 'email_address_not_authorized'],
  [/over_email_send_rate_limit|email rate limit/i, 'Too many emails went out just now. Please try again in an hour.', 'over_email_send_rate_limit'],
  // same_password before weak_password: its message ("New password should be different…") would match a loose "Password should be".
  [/same_password|should be different from the old/i, 'That’s your current password. Choose a new one.', 'same_password'],
  [/weak_password|Password should be at least/i, 'Choose a longer password (at least 6 characters).', 'weak_password'],
  [/manual_linking_disabled|Manual linking is disabled/i, 'Saving with Google isn’t switched on yet. Use an email and password for now.', 'manual_linking_disabled'],
  [/identity_already_exists|Identity is already linked/i, `That Google account already has a ${APP_NAME} account. Use a different Google account, or save this one with an email.`, 'identity_already_exists'],
  [/over_request_rate_limit|Request rate limit/i, 'Too many attempts. Wait a few minutes and try again.', 'over_request_rate_limit'],
];

type PgLikeError = { message?: string; code?: string; details?: string; hint?: string };

/** PostgREST's "no row": missing, or hidden because it isn't shared with you. */
const NOT_FOUND = 'PGRST116';

export class AppError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** A request that never got an answer: no connection, the server is down, or it timed out ("Load failed" is Safari). */
const NETWORK = /Failed to fetch|Network request failed|NetworkError|Load failed|fetch failed|AbortError|ERR_INTERNET_DISCONNECTED/i;

/** The device itself has no connection (as opposed to the app server not answering). */
function deviceOffline(): boolean {
  return !isDeviceOnline() || (globalThis.navigator as { onLine?: boolean } | undefined)?.onLine === false;
}

// A failed save or sign-in is not queued, so never promise to try again.
const NETWORK_ACTION = {
  offline: 'You’re offline, so that didn’t go through. Try again when you’re back online.',
  unreachable: `Can’t reach ${APP_NAME} right now, so that didn’t go through. Try again in a moment.`,
};
// Loads do come back by themselves: on reconnect, or when the server answers again (src/data/reachability.ts).
// A screen only says this when it has no saved copy to show instead (ErrorView), so it says that too: the thing isn't
// missing or empty, this phone just hasn't got it yet.
const NETWORK_LOAD = {
  offline: 'You’re offline, and this isn’t saved on this phone yet. It’ll load when you’re back online.',
  unreachable: `Can’t reach ${APP_NAME} right now, and this isn’t saved on this phone yet. We’ll keep trying.`,
};

export function friendlyError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e == null) return new AppError('Something went wrong. Please try again.');
  const err = e as PgLikeError;
  const raw = err.message ?? String(e);
  for (const [code, msg] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return new AppError(msg, code);
  }
  for (const [pattern, msg, code] of AUTH_MESSAGES) {
    if (pattern.test(`${err.code ?? ''} ${raw}`)) return new AppError(msg, code);
  }
  // Postgres "numeric field overflow" (22003): a number too big for its column, e.g. a payment of 123456789.
  if (err.code === '22003' || /numeric field overflow/i.test(raw)) return new AppError('That number is too big. Check the amount.', '22003');
  // PostgREST's "no row" (PGRST116) becomes 'not_found'; screens check isNotFound() to show a not-found page with a way out.
  if (err.code === NOT_FOUND || err.code === 'not_found' || /Cannot coerce the result to a single JSON object/i.test(raw))
    return new AppError('We can’t find that. It may have been deleted, or it isn’t shared with you.', 'not_found');
  // A link whose id is broken or cut short, e.g. /things/abc (Postgres 22P02 on a uuid).
  if (/invalid input syntax for type uuid/i.test(raw)) return new AppError('That link doesn’t work. It may be incomplete.', 'bad_id');
  if (err.code === '42501' || /row-level security/i.test(raw)) return new AppError('You don’t have permission to do that.', '42501');
  if (NETWORK.test(raw)) {
    const code = deviceOffline() ? 'offline' : 'unreachable';
    return new AppError(NETWORK_ACTION[code], code);
  }
  return new AppError(raw || 'Something went wrong.', err.code);
}

/** "No such row, or you can't see it" (deleted, or not shared with you), whether raw (PGRST116) or already friendly. */
/** Nothing to show, and trying again won't change that: no row, or a link whose id is broken or cut short. */
export const isNotFound = (e: unknown) => {
  const { code } = friendlyError(e);
  return code === 'not_found' || code === 'bad_id';
};

/** Unwrap a single-row response (from .maybeSingle()); no row is a not-found error, without the browser's 406. */
export function mustOne<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw friendlyError(res.error);
  if (res.data == null) throw friendlyError({ code: NOT_FOUND, message: 'No row' });
  return res.data as NonNullable<T>;
}

/** True when the request never reached the server (offline, server down, timed out). */
export function isNetworkError(e: unknown): boolean {
  const code = friendlyError(e).code;
  return code === 'offline' || code === 'unreachable';
}

/** A load waiting for the app (offline, or the server isn't answering) with nothing saved on this device to show. */
export function notSavedYet(): AppError {
  const code = isServerDown() && !deviceOffline() ? 'unreachable' : 'offline';
  return new AppError(NETWORK_LOAD[code], code);
}

/** Wording for a screen that couldn't load (ErrorView). A query waiting for the connection has no error yet. */
export function friendlyLoadError(e: unknown): AppError {
  if (e == null && isServerDown()) return new AppError(NETWORK_LOAD.unreachable, 'unreachable');
  if (e == null && deviceOffline()) return new AppError(NETWORK_LOAD.offline, 'offline');
  const f = friendlyError(e);
  return f.code === 'offline' || f.code === 'unreachable' ? new AppError(NETWORK_LOAD[f.code], f.code) : f;
}

/** Unwrap a supabase-js response or throw a friendly error. */
export function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw friendlyError(res.error);
  return res.data as NonNullable<T>;
}
