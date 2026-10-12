import { describe, expect, it } from 'vitest';

import { AVATAR_INK, AVATAR_PASTELS, contrast, palette, type Scheme, TONES, toneColors } from '../palette';

const SCHEMES: Scheme[] = ['light', 'dark'];
// WCAG 2.x AA: 4.5:1 for normal text (pill labels are 11px, so no large-text allowance); 3:1 for the parts of a
// control or chart you need to see.
const AA_TEXT = 4.5;
const AA_UI = 3;

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBe(1);
  });
});

describe.each(SCHEMES)('%s palette', (scheme) => {
  const c = palette[scheme];

  it.each(TONES)('pill tone "%s": its text passes AA on its background', (tone) => {
    const [bg, fg] = toneColors(c, tone);
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('text on cards and pages passes AA', () => {
    const surfaces = [c.background, c.surface, c.elevation.level1, c.elevation.level2, c.elevation.level3];
    for (const s of surfaces) {
      expect(contrast(c.onSurface, s)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(c.onSurfaceVariant, s)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(c.primary, s)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('text on the coloured panels passes AA', () => {
    const pairs: [string, string][] = [
      [c.onPrimaryContainer, c.primaryContainer],
      [c.onTertiaryContainer, c.tertiaryContainer],
      [c.onWarnContainer, c.warnContainer],
      [c.onErrorContainer, c.errorContainer],
      [c.onInfoContainer, c.infoContainer],
      [c.onSuccessContainer, c.successContainer],
      [c.onPrimary, c.primary],
    ];
    for (const [fg, bg] of pairs) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('warn, success and error text read on the page', () => {
    for (const fg of [c.warn, c.success, c.error, c.info]) expect(contrast(fg, c.background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('cards stand off the page: the card edge is visible', () => {
    expect(contrast(c.cardBorder, c.background)).toBeGreaterThan(1.2);
    expect(contrast(c.cardBorder, c.elevation.level1)).toBeGreaterThan(1.15);
  });
});

describe.each(SCHEMES)('%s palette: the brand parts', (scheme) => {
  const c = palette[scheme];

  it('text on the filled buttons, the coral and the sun passes AA', () => {
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onCoral, c.coral)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onSun, c.sun)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onSurface, c.selectedTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onSurfaceVariant, c.selectedTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onSecondaryContainer, c.secondaryContainer)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.onSurfaceVariant, c.secondaryContainer)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('the coral and the leaf are visible parts on the page and on a card (3:1)', () => {
    for (const bg of [c.background, c.surface]) {
      expect(contrast(c.coral, bg)).toBeGreaterThanOrEqual(AA_UI);
      expect(contrast(c.primary, bg)).toBeGreaterThanOrEqual(AA_UI);
    }
  });

  it('the edge of a choice and of a field is visible (3:1)', () => {
    expect(contrast(c.outline, c.background)).toBeGreaterThanOrEqual(AA_UI);
    expect(contrast(c.outline, c.surface)).toBeGreaterThanOrEqual(AA_UI);
  });

  it('coral text reads on the card the live pill sits on', () => {
    // The live pill is white in light mode and the card in dark mode.
    expect(contrast(c.coralDeep, scheme === 'light' ? '#FFFFFF' : c.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('avatars', () => {
  it.each(AVATAR_PASTELS)('ink on the avatar colour %s passes AA', (bg) => {
    expect(contrast(AVATAR_INK, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
