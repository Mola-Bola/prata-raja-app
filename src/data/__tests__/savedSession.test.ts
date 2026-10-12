import { describe, expect, it } from 'vitest';

import { parseSavedSession, renewalNotAnswered, sendsAsNobody, sessionToKeep } from '../savedSession';

const SERVER = 'http://192.168.1.20:54321';
const KEY = 'sb_publishable_test';

// What supabase-js keeps in storage for a signed-in person (only the parts the app reads).
const saved = (expiresInS: number) => ({
  access_token: 'jwt',
  refresh_token: 'refresh',
  expires_at: Math.floor(Date.now() / 1000) + expiresInS,
  token_type: 'bearer',
  user: { id: '11111111-0000-4000-8000-000000000002' },
});

describe('parseSavedSession', () => {
  it('reads the session supabase-js saved, even when its access token has expired', () => {
    const s = parseSavedSession(JSON.stringify(saved(-3600)));
    expect(s?.user.id).toBe('11111111-0000-4000-8000-000000000002');
  });

  it('is null for nothing saved, broken JSON, or a session supabase-js wouldn’t use or that names nobody', () => {
    expect(parseSavedSession(null)).toBeNull();
    expect(parseSavedSession('{not json')).toBeNull();
    expect(parseSavedSession(JSON.stringify({ ...saved(60), user: undefined }))).toBeNull();
    expect(parseSavedSession(JSON.stringify({ ...saved(60), refresh_token: undefined }))).toBeNull();
    expect(parseSavedSession(JSON.stringify({ ...saved(60), expires_at: undefined }))).toBeNull();
  });
});

describe('sessionToKeep: offline never signs anyone out', () => {
  const kept = parseSavedSession(JSON.stringify(saved(-3600)));

  it('keeps the saved session when supabase-js could not renew it (offline: no session, but still saved)', () => {
    expect(sessionToKeep('GET_SESSION', null, kept)).toBe(kept);
    expect(sessionToKeep('INITIAL_SESSION', null, kept)).toBe(kept);
  });

  it('ends it on a real sign-out, even if something is still saved', () => {
    expect(sessionToKeep('SIGNED_OUT', null, kept)).toBeNull();
  });

  it('is signed out when nothing is saved', () => {
    expect(sessionToKeep('GET_SESSION', null, null)).toBeNull();
    expect(sessionToKeep('INITIAL_SESSION', null, null)).toBeNull();
  });

  it('takes a session supabase-js reports (signed in, renewed, another person)', () => {
    const fresh = parseSavedSession(JSON.stringify({ ...saved(3600), user: { id: 'someone-else' } }));
    expect(sessionToKeep('SIGNED_IN', fresh, kept)).toBe(fresh);
    expect(sessionToKeep('TOKEN_REFRESHED', fresh, kept)).toBe(fresh);
  });
});

describe('sendsAsNobody', () => {
  it('spots a data request without the person’s token (supabase-js falls back to the public key)', () => {
    expect(sendsAsNobody(`${SERVER}/rest/v1/things?select=*`, `Bearer ${KEY}`, SERVER, KEY)).toBe(true);
    expect(sendsAsNobody(`${SERVER}/rest/v1/rpc/my_balances`, null, SERVER, KEY)).toBe(true);
    expect(sendsAsNobody(`${SERVER}/storage/v1/object/items/a.jpg`, `Bearer ${KEY}`, SERVER, KEY)).toBe(true);
    expect(sendsAsNobody(`${SERVER}/functions/v1/unfurl`, null, SERVER, KEY)).toBe(true);
  });

  it('leaves requests that carry the person’s token alone', () => {
    expect(sendsAsNobody(`${SERVER}/rest/v1/things`, 'Bearer eyJhbGciOi.user.jwt', SERVER, KEY)).toBe(false);
  });

  it('leaves sign-in and session renewal alone (they never carry a person’s token)', () => {
    expect(sendsAsNobody(`${SERVER}/auth/v1/token?grant_type=refresh_token`, `Bearer ${KEY}`, SERVER, KEY)).toBe(false);
    expect(sendsAsNobody(`${SERVER}/auth/v1/health`, null, SERVER, KEY)).toBe(false);
  });

  it('leaves other servers alone', () => {
    expect(sendsAsNobody('https://example.com/rest/v1/x', null, SERVER, KEY)).toBe(false);
  });
});

describe('renewalNotAnswered: a failed session renewal that doesn’t mean the session ended', () => {
  const renew = `${SERVER}/auth/v1/token?grant_type=refresh_token`;

  it('answered by a Wi-Fi login page or a proxy, not the app’s server', () => {
    expect(renewalNotAnswered(renew, SERVER, 511, 'text/html; charset=utf-8')).toBe(true);
    expect(renewalNotAnswered(renew, SERVER, 403, null)).toBe(true);
  });

  it('“too many requests, try later”', () => {
    expect(renewalNotAnswered(renew, SERVER, 429, 'application/json')).toBe(true);
  });

  it('the app server’s own answers count, including a real “that session has ended”', () => {
    expect(renewalNotAnswered(renew, SERVER, 400, 'application/json; charset=utf-8')).toBe(false);
    expect(renewalNotAnswered(renew, SERVER, 200, 'application/json')).toBe(false);
  });

  it('only for renewing a session', () => {
    expect(renewalNotAnswered(`${SERVER}/auth/v1/token?grant_type=password`, SERVER, 403, 'text/html')).toBe(false);
    expect(renewalNotAnswered(`${SERVER}/rest/v1/things`, SERVER, 403, 'text/html')).toBe(false);
  });
});
