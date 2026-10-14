import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content';
import { fuse, FUSIONS, FUSION_XP, fusionsOf } from '../fusion';
import { freshSaveV3, migrateMeta, parseSaveV3 } from '../migrate';
import type { SaveV3 } from '../types';

const allDips = (): SaveV3 => ({ ...freshSaveV3(), unlockedDips: Object.keys(CONTENT.dips) as SaveV3['unlockedDips'], unlocks: { signature: true } });
const rt = (s: SaveV3) => parseSaveV3(JSON.stringify(s));

describe('curry pot fusion', () => {
  it('every recipe uses real dips and an unordered pair is unique', () => {
    const keys = FUSIONS.map(f => [...f.dips].sort().join('+'));
    expect(new Set(keys).size).toBe(FUSIONS.length);
    for (const f of FUSIONS) for (const d of f.dips) expect(CONTENT.dips[d]).toBeTruthy();
  });
  it('a known pair is discovered once, either order, and gifts simmer xp once', () => {
    const s = allDips();
    const a = fuse(s, 'dhal', 'mint-chutney', CONTENT);
    expect(a.result).toBe('new');
    expect(fusionsOf(a.save)).toEqual(['cooling-dhal']);
    expect(a.save.dipXp['mint-chutney']).toBe(FUSION_XP);
    const b = fuse(a.save, 'mint-chutney', 'dhal', CONTENT);
    expect(b.result).toBe('known');
    expect(b.save).toBe(a.save);
  });
  it('unknown pair, same dip twice, or a dip you do not own fizzles and changes nothing', () => {
    const s = allDips();
    expect(fuse(s, 'masala', 'sambal', CONTENT)).toEqual({ save: s, result: 'fizzle' });
    expect(fuse(s, 'dhal', 'dhal', CONTENT).result).toBe('fizzle');
    const fresh = freshSaveV3();
    expect(fuse(fresh, 'mint-chutney', 'dhal', CONTENT).save).toBe(fresh);
  });
  it('migration: old save gets [], junk dropped, idempotent', () => {
    const { fusions, tiffin, ...old } = freshSaveV3();
    void fusions; void tiffin;
    expect(parseSaveV3(JSON.stringify(old)).fusions).toEqual([]);
    const m = migrateMeta({ fusions: ['cooling-dhal', 'nope', 7, 'cooling-dhal'], tiffin: ['kosong', 'ghost', 'tissue', 'thosai', 'kosong'] });
    expect(m.fusions).toEqual(['cooling-dhal']);
    expect(m.tiffin).toEqual(['kosong', 'tissue']);
    const once = rt({ ...allDips(), fusions: ['sweet-pull', 'bogus'] });
    expect(once.fusions).toEqual(['sweet-pull']);
    expect(rt(once)).toEqual(once);
  });
});
