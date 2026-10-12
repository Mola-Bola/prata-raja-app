import { describe, expect, it } from 'vitest';

import { returnPathAfterSignIn } from '../links';

// The app's link scheme. In the starter itself the placeholder is not a valid URL scheme (underscores), so a stand-in is
// used there; in a made app it is the app id.
const SCHEME = /^[a-z][a-z0-9+.-]*$/.test('prata-raja') ? 'prata-raja' : 'starter-app';

describe('returnPathAfterSignIn (a link opened while signed out opens after signing in)', () => {
  it('keeps the page and its query', () => {
    expect(returnPathAfterSignIn('http://localhost:8192/appointments/88888888-0000-4000-8000-000000000011')).toBe('/appointments/88888888-0000-4000-8000-000000000011');
    expect(returnPathAfterSignIn('http://localhost:8192/log?day=2#top')).toBe('/log?day=2');
  });

  it('strips the web base path (GitHub Pages serves the app under /prata-raja)', () => {
    expect(returnPathAfterSignIn('https://example.github.io/prata-raja/log', '/prata-raja')).toBe('/log');
    expect(returnPathAfterSignIn('https://example.github.io/prata-raja/', '/prata-raja')).toBeNull();
    expect(returnPathAfterSignIn('https://example.github.io/prata-raja', '/prata-raja')).toBeNull();
  });

  it('reads app links too', () => {
    expect(returnPathAfterSignIn(`${SCHEME}://appointments/1`)).toBe('/appointments/1');
    expect(returnPathAfterSignIn(`${SCHEME}:///log?day=2`)).toBe('/log?day=2');
  });

  it('ignores the start page and screens that work signed out', () => {
    for (const url of [
      'http://x/',
      'http://x',
      'http://x/welcome',
      'http://x/sign-in?mode=up',
      'http://x/reset-password',
      'http://x/auth-callback?code=1',
      'http://x/play',
      `${SCHEME}://`,
      `${SCHEME}:///`,
    ]) {
      expect(returnPathAfterSignIn(url)).toBeNull();
    }
  });

  it('ignores nothing and nonsense', () => {
    expect(returnPathAfterSignIn(null)).toBeNull();
    expect(returnPathAfterSignIn('')).toBeNull();
    expect(returnPathAfterSignIn('not a url')).toBeNull();
  });

  it('keeps pages whose name only starts like a public one', () => {
    expect(returnPathAfterSignIn('http://x/log-in-later')).toBe('/log-in-later');
    expect(returnPathAfterSignIn('http://x/welcome-back')).toBe('/welcome-back');
    expect(returnPathAfterSignIn('http://x/playlists')).toBe('/playlists');
  });
});
