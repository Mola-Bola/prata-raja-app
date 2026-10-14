import { describe, expect, it } from 'vitest';

import { isOwnerEmail, sha256Hex } from '../../data/owner';
import { pickNewer } from '../saveMerge';

describe('pickNewer', () => {
  const a = { json: 'a', at: 100 };
  it('newer stamp wins, tie and missing cloud keep local', () => {
    expect(pickNewer(a, { json: 'b', at: 101 })).toBe('cloud');
    expect(pickNewer(a, { json: 'b', at: 100 })).toBe('local');
    expect(pickNewer(a, { json: 'b', at: 99 })).toBe('local');
    expect(pickNewer(a, null)).toBe('local');
    expect(pickNewer(null, a)).toBe('cloud');
    expect(pickNewer({ json: 'old', at: 0 }, a)).toBe('cloud'); // an unstamped local save loses to a stamped cloud one
  });
});

describe('isOwnerEmail', () => {
  it('checks the SHA-256 of the lower-cased email, and fails closed', async () => {
    const hashes = [await sha256Hex('owner@example.com')];
    expect(await isOwnerEmail(' Owner@Example.com ', hashes)).toBe(true);
    expect(await isOwnerEmail('other@example.com', hashes)).toBe(false);
    expect(await isOwnerEmail(null, hashes)).toBe(false);
    expect(await isOwnerEmail(null, [])).toBe(true); // no list set: any signed-in user
  });
});
