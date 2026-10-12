import { describe, expect, it } from 'vitest';

import { parseTypedDate } from '../format';

// What someone types into the date picker's "type it" box (DD/MM/YYYY). Anything that isn't a whole, real date
// must not count, or Save quietly keeps the old one.
describe('parseTypedDate', () => {
  it('reads a whole day-first date as YYYY-MM-DD', () => {
    expect(parseTypedDate('20/10/2026')).toBe('2026-10-20');
    expect(parseTypedDate(' 01/02/2027 ')).toBe('2027-02-01');
  });

  it('rejects dates that do not exist instead of rolling them over', () => {
    expect(parseTypedDate('31/02/2026')).toBeNull();
    expect(parseTypedDate('00/10/2026')).toBeNull();
    expect(parseTypedDate('10/13/2026')).toBeNull();
    expect(parseTypedDate('29/02/2028')).toBe('2028-02-29');
  });

  it('rejects partly typed dates', () => {
    expect(parseTypedDate('10/1/26')).toBeNull();
    expect(parseTypedDate('10/01/26')).toBeNull();
    expect(parseTypedDate('')).toBeNull();
  });
});
