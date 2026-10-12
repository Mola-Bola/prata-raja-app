import { describe, expect, it } from 'vitest';

import { brand } from '../brand';
import { FAMILIES, familyFor, HEADING_VARIANTS, nearestWeight } from '../fontFamilies';

describe('nearestWeight()', () => {
  it('lands any written weight on one we load (nothing lighter than 600)', () => {
    expect([undefined, 'normal', '400', '500', 400, '600', 600].map(nearestWeight)).toEqual([600, 600, 600, 600, 600, 600, 600]);
    expect(['700', 'bold', 700].map(nearestWeight)).toEqual([700, 700, 700]);
    expect(['800', 800].map(nearestWeight)).toEqual([800, 800]);
    expect(['900', 900].map(nearestWeight)).toEqual([900, 900]);
  });
});

describe('familyFor()', () => {
  it('uses the brand file’s family for each weight, for headings and for body text', () => {
    expect(familyFor('900', 'heading')).toBe(brand.fonts.heading[900]);
    expect(familyFor('600', 'heading')).toBe(brand.fonts.heading[600]);
    expect(familyFor('800')).toBe(brand.fonts.body[800]);
    expect(familyFor('bold')).toBe(brand.fonts.body[700]);
    expect(familyFor(undefined)).toBe(brand.fonts.body[600]);
  });

  it('no family is shared between headings and body text', () => {
    const heading = new Set(Object.values(FAMILIES.heading));
    expect(Object.values(FAMILIES.body).some((f) => heading.has(f))).toBe(false);
  });

  it('titles, labels and the big place are headings; supporting text is not', () => {
    for (const v of ['headlineMedium', 'titleLarge', 'titleMedium', 'labelLarge', 'displayMedium']) expect(HEADING_VARIANTS.has(v)).toBe(true);
    for (const v of ['bodyLarge', 'bodyMedium', 'bodySmall', 'labelSmall']) expect(HEADING_VARIANTS.has(v)).toBe(false);
  });
});
