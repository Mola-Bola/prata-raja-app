// The app's colours as plain data (no React), so a unit test can check every pairing for contrast.
// The values live in brand.ts (the one file that sets an app's look); this file shapes them for the theme and holds the
// tone helpers and the contrast maths. theme.ts builds the Paper themes from these.
// Paper's `primary` is the leaf/brand colour: filled buttons, links, selected borders. The coral lives in `coral`.
import { brand } from './brand';

export const lightColors = brand.light;
export const darkColors = brand.dark;

/** Extra semantic colours Paper doesn't define. Text on a container uses its on… colour (at least 4.5:1, tested). */
export const semantic = brand.semantic;

/** Pastel circles behind a person's initial (ink text on them passes AA). */
export const AVATAR_PASTELS = brand.avatarPastels;

/** The ink for an initial on an avatar pastel. */
export const AVATAR_INK = brand.avatarInk;

/** The pastel behind a person's initial, from their name (so it never changes). Anything drawn in a person's colour uses this. */
export const avatarColour = (name: string): string => AVATAR_PASTELS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_PASTELS.length]!;

export type Scheme = 'light' | 'dark';
export type Palette = typeof lightColors & (typeof semantic)['light'];

export const palette: Record<Scheme, Palette> = {
  light: { ...lightColors, ...semantic.light },
  dark: { ...darkColors, ...semantic.dark },
};

/** Colour roles for pills and status chips. One word per role. */
export type Tone = 'neutral' | 'primary' | 'tertiary' | 'info' | 'success' | 'warn' | 'error' | 'muted';

/** [background, text] for each tone. */
export function toneColors(c: Palette, tone: Tone): [string, string] {
  switch (tone) {
    case 'neutral':
      return [c.surfaceVariant, c.onSurfaceVariant];
    case 'primary':
      return [c.primaryContainer, c.onPrimaryContainer];
    case 'tertiary':
      return [c.tertiaryContainer, c.onTertiaryContainer];
    case 'info':
      return [c.infoContainer, c.onInfoContainer];
    case 'success':
      return [c.successContainer, c.onSuccessContainer];
    case 'warn':
      return [c.warnContainer, c.onWarnContainer];
    case 'error':
      return [c.errorContainer, c.onErrorContainer];
    case 'muted':
      return [c.elevation.level3, c.onSurfaceVariant];
  }
}

export const TONES: Tone[] = ['neutral', 'primary', 'tertiary', 'info', 'success', 'warn', 'error', 'muted'];

// ── Contrast (WCAG 2.x) ──
function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an opaque #RRGGBB colour. */
export function luminance(hex: string) {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not an opaque #RRGGBB colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two opaque colours, 1 to 21. Body text needs 4.5, large text and UI parts 3. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
