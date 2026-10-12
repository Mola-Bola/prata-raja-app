// Design tokens. Change the look of the whole app here (type scale, radii, spacing); colours are in palette.ts and
// the typeface is in fonts.ts.
import { DarkTheme as NavDark, DefaultTheme as NavLight, type ThemeProvider } from 'expo-router';
import { configureFonts, MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { familyFor, type FontWeight, HEADING_VARIANTS } from './fontFamilies';
import { darkColors, lightColors, semantic } from './palette';

export { semantic };

type NavTheme = React.ComponentProps<typeof ThemeProvider>['value'];

export type AppTheme = MD3Theme & { colors: MD3Theme['colors'] & (typeof semantic)['light'] };

/**
 * The type scale ("Sunday market"): size / line height / weight for each Paper variant (which of them are headings, in
 * the heading family, is HEADING_VARIANTS in fonts.ts). Nothing is under 14. The phone's own font size setting multiplies these (React
 * Native does that), and Me → Larger text multiplies them again by LARGE_TEXT.
 */
type Variant =
  | 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
  | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall'
  | 'labelLarge' | 'labelMedium' | 'labelSmall' | 'default';
const SCALE: Record<Variant, [size: number, line: number, weight: FontWeight]> = {
  displayLarge: [44, 48, 900],
  displayMedium: [40, 44, 900], // the place on a postcard
  displaySmall: [32, 38, 900],
  headlineLarge: [32, 38, 900],
  headlineMedium: [30, 36, 900], // a screen's title
  headlineSmall: [24, 30, 900], // a big number or place on a card
  titleLarge: [21, 26, 900], // a section's title
  titleMedium: [18, 24, 800], // a card's title
  titleSmall: [16, 22, 800], // a row's first line
  bodyLarge: [16, 24, 600],
  bodyMedium: [15, 22, 700], // supporting text
  bodySmall: [14, 20, 700], // still 14: the family reads this on a phone
  labelLarge: [15, 20, 800], // chips and button labels
  labelMedium: [14, 18, 800],
  labelSmall: [14, 18, 800], // pill labels
  default: [16, 24, 600], // text with no variant
};

/** Me → Larger text: the type scale times this, on top of the phone's own setting. */
export const LARGE_TEXT = 1.15;

function fonts(opts: { nunito: boolean; k: number }) {
  const config = Object.fromEntries(
    Object.entries(SCALE).map(([variant, [size, line, weight]]) => [
      variant,
      {
        // Our fonts: the weight is in the family name. Without them: the system font at that weight.
        ...(opts.nunito ? { fontFamily: familyFor(weight, HEADING_VARIANTS.has(variant) ? 'heading' : 'body'), fontWeight: 'normal' as const } : { fontWeight: String(weight) as '600' }),
        fontSize: Math.round(size * opts.k),
        lineHeight: Math.round(line * opts.k),
        letterSpacing: 0,
      },
    ]),
  );
  return configureFonts({ config });
}

/**
 * Which text variant each job uses, so screens agree. Supporting text (a row's second line, a section's note) is
 * 15px; nothing is smaller than 14.
 */
export const textRole = {
  /** A page's or card's big number / place. */
  hero: 'headlineSmall',
  /** A section title. */
  section: 'titleLarge',
  /** A card's or row's first line. */
  headline: 'titleMedium',
  /** A row's second line, notes, help under a field. */
  supporting: 'bodyMedium',
  /** Times, counts, "2 h ago". */
  meta: 'bodyMedium',
  /** Pill and badge labels only. */
  pill: 'labelSmall',
} as const;

/** Paper's own parts (buttons 5 ×, dialogs 7 ×, cards 3 × this) come out soft and round. */
const ROUNDNESS = 5;

const themes = new Map<string, AppTheme>();

/** The theme for a scheme. `nunito` false is the system-font fallback; `large` is Me → Larger text. */
export function buildTheme(isDark: boolean, { nunito = true, large = false }: { nunito?: boolean; large?: boolean } = {}): AppTheme {
  const key = `${isDark}${nunito}${large}`;
  const known = themes.get(key);
  if (known) return known;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const theme: AppTheme = {
    ...base,
    roundness: ROUNDNESS,
    fonts: fonts({ nunito, k: large ? LARGE_TEXT : 1 }),
    colors: { ...base.colors, ...(isDark ? darkColors : lightColors), ...(isDark ? semantic.dark : semantic.light) },
  };
  themes.set(key, theme);
  return theme;
}

export const lightTheme = buildTheme(false);
export const darkTheme = buildTheme(true);

export function navTheme(t: AppTheme, isDark: boolean): NavTheme {
  const base = isDark ? NavDark : NavLight;
  const face = (v: Variant) => ({ fontFamily: t.fonts[v].fontFamily, fontWeight: t.fonts[v].fontWeight });
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.colors.primary,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.onSurface,
      border: t.colors.outlineVariant,
      notification: t.colors.error,
    },
    fonts: { regular: face('bodyLarge'), medium: face('titleSmall'), bold: face('titleMedium'), heavy: face('titleLarge') },
  } as NavTheme;
}

/** Header and background for every stack: the root one (sign-in, new password), the signed-in one
 * (src/app/(app)/_layout.tsx). Round, heavy titles on the card colour. */
export function stackScreenOptions(t: AppTheme) {
  return {
    headerStyle: { backgroundColor: t.colors.surface },
    headerTintColor: t.colors.onSurface,
    headerTitleStyle: { fontFamily: t.fonts.titleLarge.fontFamily, fontWeight: t.fonts.titleLarge.fontWeight, fontSize: 20 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: t.colors.background },
    headerBackButtonDisplayMode: 'minimal' as const,
    // Every screen slides and fades in over about 300 ms (still when the phone asks for reduced motion: the system
    // turns the animation off itself).
    animation: 'slide_from_right' as const,
    animationDuration: 300,
  };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Corner radii: cards and sheets 22–28, chunky buttons and tiles 16, small parts 10. */
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const MAX_WIDTH = 720;
