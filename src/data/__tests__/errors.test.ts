import { afterEach, describe, expect, it } from 'vitest';

import { brandWords } from '../../brand';
import { setDeviceOnline, setServerDown } from '../connection';
import { ownerChanged } from '../deviceScope';
import { friendlyError, friendlyLoadError, isNetworkError } from '../errors';

afterEach(() => {
  setDeviceOnline(true);
  setServerDown(false);
});

describe('friendlyError', () => {
  it('turns a broken id in a link into a plain sentence, not a Postgres error', () => {
    const e = friendlyError({ code: '22P02', message: 'invalid input syntax for type uuid: "not-a-uuid"' });
    expect(e.code).toBe('bad_id');
    expect(e.message).not.toMatch(/uuid|syntax/i);
  });

  it('keeps the bad_transition code so screens can tell it apart from a network error', () => {
    const e = friendlyError({ code: 'P0001', message: 'bad_transition' });
    expect(e.code).toBe('bad_transition');
  });

  it('marks PostgREST "no row" as not_found', () => {
    expect(friendlyError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }).code).toBe('not_found');
  });
});

describe('friendlyError: network failures', () => {
  const fetchFailed = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };

  it('says the server can’t be reached (not “offline”) when the device is online', () => {
    const e = friendlyError(fetchFailed);
    expect(e.code).toBe('unreachable');
    expect(e.message).not.toMatch(/offline/i);
    expect(e.message).toContain(`Can’t reach ${brandWords.appName}`);
  });

  it('says offline when the device has no connection', () => {
    setDeviceOnline(false);
    expect(friendlyError(fetchFailed).code).toBe('offline');
  });

  it('never promises a retry for a save that failed', () => {
    for (const online of [true, false]) {
      setDeviceOnline(online);
      const m = friendlyError(fetchFailed).message;
      expect(m).toMatch(/didn’t go through/);
      expect(m).not.toMatch(/We’ll try again/);
    }
  });

  it('recognises Safari, Android and timeout wording', () => {
    for (const message of ['TypeError: Load failed', 'TypeError: Network request failed', 'AbortError: signal is aborted without reason']) {
      expect(isNetworkError({ message })).toBe(true);
    }
    expect(isNetworkError({ message: 'bad_transition' })).toBe(false);
  });

  it('load failures say what happens next instead of “didn’t go through”', () => {
    expect(friendlyLoadError(fetchFailed).message).toContain(`Can’t reach ${brandWords.appName} right now`);
    expect(friendlyLoadError(fetchFailed).message).not.toMatch(/didn’t go through|wasn’t saved/);
    setDeviceOnline(false);
    expect(friendlyLoadError(fetchFailed).message).toMatch(/offline/);
    expect(friendlyLoadError(null).message).toMatch(/offline/);
  });

  it('a screen that couldn’t load says there’s no saved copy yet (it only shows when nothing is saved)', () => {
    setDeviceOnline(false);
    expect(friendlyLoadError(null).message).toMatch(/isn’t saved on this phone yet/);
    setDeviceOnline(true);
    setServerDown(true);
    expect(friendlyLoadError(null).message).toMatch(/isn’t saved on this phone yet/);
  });

  it('a screen waiting for an unreachable server says so, not “offline”', () => {
    setServerDown(true);
    expect(friendlyLoadError(null).message).toContain(`Can’t reach ${brandWords.appName} right now`);
    expect(friendlyError(fetchFailed).code).toBe('unreachable');
  });

  it('a missing error is never shown as “null”', () => {
    expect(friendlyError(null).message).not.toBe('null');
    expect(friendlyLoadError(undefined).message).not.toBe('undefined');
  });
});

describe('friendlyError: auth', () => {
  it('maps GoTrue’s “email_exists” (already been registered) to the app’s copy', () => {
    const e = friendlyError({ code: 'email_exists', message: 'A user with this email address has already been registered' });
    expect(e.code).toBe('user_already_exists');
    expect(e.message).toMatch(/already an account/);
  });

  it('still maps sign-up’s “User already registered”', () => {
    expect(friendlyError({ code: 'user_already_exists', message: 'User already registered' }).code).toBe('user_already_exists');
  });

  it('says “that’s your current password” for same_password, not “choose a longer password”', () => {
    // GoTrue 422: { code: 'same_password', message: 'New password should be different from the old password.' }
    const e = friendlyError({ code: 'same_password', message: 'New password should be different from the old password.' });
    expect(e.code).toBe('same_password');
    expect(e.message).toMatch(/current password/);
    // Without the code (older servers), the message alone still maps.
    expect(friendlyError({ message: 'New password should be different from the old password.' }).code).toBe('same_password');
  });

  it('still maps a too-short password to weak_password', () => {
    expect(friendlyError({ code: 'weak_password', message: 'Password should be at least 6 characters.' }).code).toBe('weak_password');
    expect(friendlyError({ message: 'Password should be at least 6 characters.' }).code).toBe('weak_password');
  });

  it('has guest-specific copy that doesn’t send them off to sign in', () => {
    const e = friendlyError({ message: 'guest_email_taken' });
    expect(e.message).toMatch(/different email/);
    expect(e.message).not.toMatch(/Sign in instead/);
  });
});

describe('ownerChanged (device data belongs to one person)', () => {
  it('keeps data for the same person', () => expect(ownerChanged('u1', 'u1')).toBe(false));
  it('keeps signed-out data while still signed out', () => expect(ownerChanged('', null)).toBe(false));
  it('clears when someone else signs in', () => expect(ownerChanged('u1', 'u2')).toBe(true));
  it('clears when the session ends without “Sign out”', () => expect(ownerChanged('u1', null)).toBe(true));
  it('clears data of unknown owner (from older app versions)', () => {
    expect(ownerChanged(null, 'u1')).toBe(true);
    expect(ownerChanged(null, null)).toBe(true);
  });
});

describe('not found', () => {
  it('turns PostgREST’s “no row” into not_found through must(), so screens can show their not-found page', async () => {
    const { must, mustOne, isNotFound } = await import('../errors');
    let thrown: unknown;
    try {
      must({ data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as { code?: string }).code).toBe('not_found');
    expect(isNotFound(thrown)).toBe(true);
    expect(() => mustOne({ data: null, error: null })).toThrow(/can’t find that/);
    expect(mustOne({ data: { id: 1 }, error: null })).toEqual({ id: 1 });
  });

  it('counts a broken or cut-short id in a link as not found, so it gets the way out and not “Try again”', async () => {
    const { isNotFound } = await import('../errors');
    expect(isNotFound({ code: '22P02', message: 'invalid input syntax for type uuid: "not-a-uuid"' })).toBe(true);
    expect(isNotFound({ message: 'TypeError: Failed to fetch' })).toBe(false);
  });
});
