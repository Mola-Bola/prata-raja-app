import { describe, expect, it } from 'vitest';

import { addDays, daysUntil, fmtDate, parseAmount, todayIso } from '../format';

describe('parseAmount', () => {
  it('reads typed numbers', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('1,299')).toBe(1299);
    expect(parseAmount(' 3 ')).toBe(3);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('15a')).toBe('invalid');
  });
});

describe('dates', () => {
  it('formats and adds days across month ends', () => {
    expect(fmtDate('2026-10-17', new Date(2026, 5, 1))).toBe('17 Oct');
    expect(fmtDate('2025-01-02', new Date(2026, 5, 1))).toBe('2 Jan 2025');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(todayIso(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(daysUntil('2026-10-04', new Date(2026, 9, 1))).toBe(3);
  });
});
