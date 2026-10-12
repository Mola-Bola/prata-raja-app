import { describe, expect, it } from 'vitest';

import { authLinkResult, isNativeAuthLink, resetReturnPath } from '../links';

describe('authLinkResult (what an email link brought back in the address)', () => {
  it('spots a password link that signed them in', () => {
    expect(authLinkResult('http://localhost:8192/#access_token=a&refresh_token=r&type=recovery&expires_in=3600')).toEqual({ kind: 'recovery' });
    expect(authLinkResult('https://x.github.io/prata-raja/reset-password#access_token=a&type=recovery')).toEqual({ kind: 'recovery' });
  });

  it('a used or expired link that fell back to the home page is “expired”', () => {
    const url = 'http://localhost:8192/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(authLinkResult(url)).toEqual({ kind: 'expired' });
  });

  it('any error on the password page is “expired”, even without a code', () => {
    expect(authLinkResult('https://x.github.io/prata-raja/reset-password#error=server_error')).toEqual({ kind: 'expired' });
    expect(authLinkResult('http://localhost:8181/reset-password?error=access_denied&error_description=Nope')).toEqual({ kind: 'expired' });
  });

  it('other errors (e.g. from Google) come back with their code and message', () => {
    const url = 'http://localhost:8181/#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user';
    expect(authLinkResult(url)).toEqual({ kind: 'error', code: 'identity_already_exists', message: 'Identity is already linked to another user' });
  });

  it('ordinary pages are not auth links', () => {
    expect(authLinkResult('http://localhost:8181/')).toBeNull();
    expect(authLinkResult('http://localhost:8181/log?day=2026-10-01')).toBeNull();
    expect(authLinkResult(null)).toBeNull();
  });
});

describe('resetReturnPath (where to go after choosing a new password)', () => {
  it('goes back to an in-app page', () => {
    expect(resetReturnPath('/log')).toBe('/log');
    expect(resetReturnPath('/appointments/abc')).toBe('/appointments/abc');
  });
  it('ignores anything that is not a plain in-app path, so the link can’t send people elsewhere', () => {
    expect(resetReturnPath('https://evil.example/x')).toBe('/');
    expect(resetReturnPath('//evil.example/x')).toBe('/');
    expect(resetReturnPath('/sign-in')).toBe('/');
    expect(resetReturnPath('/a/../../x')).toBe('/');
    expect(resetReturnPath(undefined)).toBe('/');
    expect(resetReturnPath(['/log', '/me'])).toBe('/log');
  });
});

describe('isNativeAuthLink (a sign-in coming back into the app)', () => {
  it('accepts the confirm-email and password links, with tokens, a code or an error', () => {
    expect(isNativeAuthLink('prata-raja://auth-callback#access_token=a&refresh_token=r&type=signup')).toBe(true);
    expect(isNativeAuthLink('prata-raja://auth-callback?code=abc')).toBe(true);
    expect(isNativeAuthLink('prata-raja://reset-password#access_token=a&refresh_token=r&type=recovery')).toBe(true);
    expect(isNativeAuthLink('prata-raja://auth-callback#error=access_denied&error_code=otp_expired')).toBe(true);
  });

  it('ignores everything else', () => {
    expect(isNativeAuthLink('prata-raja://auth-callback')).toBe(false);
    expect(isNativeAuthLink('prata-raja://log?code=1')).toBe(false);
    expect(isNativeAuthLink('https://x.github.io/prata-raja/#access_token=a')).toBe(false);
    expect(isNativeAuthLink(null)).toBe(false);
  });
});
