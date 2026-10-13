import { describe, expect, it } from 'vitest';

import { isStartLink, startGamePath } from '../startLink';

describe('isStartLink (the app opens straight into the game only from its bare start page)', () => {
  it('is the start page: no link, the bare web address, the bare app link', () => {
    for (const url of [null, undefined, '', 'http://x', 'http://x/', 'http://localhost:9490/?utm=1', 'prata-raja://', 'prata-raja:///', 'prata-raja://?x=1']) {
      expect(isStartLink(url)).toBe(true);
    }
  });

  it('strips the web base path (GitHub Pages serves the app under /prata-raja)', () => {
    expect(isStartLink('https://example.github.io/prata-raja/', '/prata-raja')).toBe(true);
    expect(isStartLink('https://example.github.io/prata-raja', '/prata-raja')).toBe(true);
    expect(isStartLink('https://example.github.io/prata-raja/play', '/prata-raja')).toBe(false);
    expect(isStartLink('https://example.github.io/prata-raja-other/', '/prata-raja')).toBe(false);
  });

  it('is not a link to a page: that opens where it points', () => {
    for (const url of ['http://x/play', 'http://x/welcome', 'http://x/feedback/1', 'prata-raja://feedback/1', 'prata-raja:///whats-new']) {
      expect(isStartLink(url)).toBe(false);
    }
  });

  it('is not an auth link, even when it lands on the start page', () => {
    for (const url of [
      'http://x/#access_token=a&refresh_token=b&type=recovery',
      'http://x/?code=abc',
      'http://x/#error=access_denied&error_code=otp_expired&error_description=Link+expired',
      'prata-raja://auth-callback?code=1',
      'prata-raja://?code=1',
    ]) {
      expect(isStartLink(url)).toBe(false);
    }
  });

  it('is not nonsense', () => {
    expect(isStartLink('not a url')).toBe(false);
  });
});

describe('startGamePath', () => {
  it('preserves the kitchen switch from the bare page, including the Pages base path', () => {
    expect(startGamePath('https://host/?kitchen=1')).toBe('/play?kitchen=1');
    expect(startGamePath('https://host/prata-raja/?kitchen=1', '/prata-raja')).toBe('/play?kitchen=1');
    expect(startGamePath('https://host/prata-raja?kitchen=1', '/prata-raja/')).toBe('/play?kitchen=1');
    expect(startGamePath('prata-raja://?kitchen=1')).toBe('/play?kitchen=1');
  });

  it('forwards only the known switch and ignores fragment or nested switches', () => {
    expect(startGamePath('https://host/?kitchen=1&utm=foo&next=%2Ffeedback%3Fkitchen%3D0')).toBe('/play?kitchen=1');
    for (const url of [null, '', 'https://host/', 'https://host/?kitchen=0', 'https://host/?kitchen=true',
      'https://host/#kitchen=1', 'https://host/?next=%2Fplay%3Fkitchen%3D1', 'https://host/?utm=1#kitchen=1']) {
      expect(startGamePath(url)).toBe('/play');
    }
  });

  it('leaves auth callbacks and deep links untouched even when kitchen is requested', () => {
    for (const url of [
      'https://host/?kitchen=1&code=abc',
      'https://host/?kitchen=1#access_token=a&refresh_token=b&type=recovery',
      'https://host/?kitchen=1#error=access_denied&error_description=Link+expired',
      'https://host/prata-raja/feedback/1?kitchen=1&next=%2Fplay',
      'prata-raja://auth-callback?kitchen=1&code=abc',
      'prata-raja://feedback/1?kitchen=1',
      'not a url?kitchen=1',
    ]) {
      expect(startGamePath(url, '/prata-raja')).toBeNull();
    }
  });
});
