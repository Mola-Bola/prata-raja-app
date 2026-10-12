import { describe, expect, it } from 'vitest';

import { firstSegment, moduleForRoute } from '../module';

describe('moduleForRoute', () => {
  const ids = ['wishes', 'my-garden'];
  it('is the extension id inside an extension, at any depth', () => {
    expect(moduleForRoute('/wishes', ids, 'kampong')).toBe('wishes');
    expect(moduleForRoute('/my-garden/beds/3', ids, 'kampong')).toBe('my-garden');
    expect(moduleForRoute('/wishes?x=1', ids, 'kampong')).toBe('wishes');
  });
  it('is the app id everywhere else', () => {
    for (const r of ['/', '/me', '/feedback/abc', '/whats-new', '']) expect(moduleForRoute(r, ids, 'kampong')).toBe('kampong');
  });
  it('is the app id when the app hosts no extensions', () => {
    expect(moduleForRoute('/wishes', [], 'kampong')).toBe('kampong');
  });
  it('matches whole segments only', () => {
    expect(moduleForRoute('/wishes-extra', ids, 'kampong')).toBe('kampong');
    expect(firstSegment('//a/b')).toBe('a');
  });
});
