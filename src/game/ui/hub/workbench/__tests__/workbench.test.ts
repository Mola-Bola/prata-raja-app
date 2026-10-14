import { describe, expect, it } from 'vitest';
import { freshSaveV3 } from '@/meta/migrate';
import { pickTarget } from '../drag';
import { packTiffin, tiffinOf, unpackTiffin } from '../TiffinBench';

describe('pickTarget', () => {
  const boxes = { a: { left: 0, top: 0, width: 40, height: 40 }, b: { left: 100, top: 0, width: 100, height: 100 } };
  it('grows small targets to 72px and picks the nearest centre', () => {
    expect(pickTarget({ x: 55, y: 20 }, boxes)).toBe('a'); // 15px outside the 40px box, inside the grown 72px one
    expect(pickTarget({ x: 70, y: 20 }, boxes)).toBeNull();
    expect(pickTarget({ x: 150, y: 50 }, boxes)).toBe('b');
  });
});
describe('tiffin', () => {
  const base = () => ({ ...freshSaveV3(), unlockedBreads: ['tissue', 'thosai'] as never, unlocks: { signature: true } });
  it('slot 1 is the start roti, others pack, max 3 slots, unpack removes', () => {
    let s = packTiffin(base(), 'tissue', 1);
    expect(tiffinOf(s)).toEqual(['tissue']);
    s = packTiffin(s, 'tissue', 0); // tissue starts; kosong swaps into the packed list
    expect([s.signatureBread, ...tiffinOf(s)]).toEqual(['tissue', 'kosong']);
    expect(packTiffin(s, 'tissue', 2)).toBe(s);
    expect(tiffinOf(unpackTiffin(s, 'kosong'))).toEqual([]);
  });
});
