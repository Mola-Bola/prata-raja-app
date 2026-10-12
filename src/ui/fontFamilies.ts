// The pure half of the typeface choice (no font files, no React): which family each weight uses (named in brand.ts),
// which text variants are headings, and how a written weight lands on a loaded one. fonts.ts loads the files these
// names point at.
import { brand } from './brand';

export type FontWeight = 600 | 700 | 800 | 900;
export type Role = 'heading' | 'body';

/** A loaded font family's name, e.g. "Nunito_800ExtraBold" (the weight is part of the name on native). */
export type FamilyName = string;

/** Family for each weight, for headings and for body text (set in brand.ts). */
export const FAMILIES: Record<Role, Record<FontWeight, FamilyName>> = brand.fonts;

/** The Paper text variants that are headings, titles and labels (the heading family); every other variant is body text. */
export const HEADING_VARIANTS: ReadonlySet<string> = new Set([
  'displayLarge', 'displayMedium', 'displaySmall',
  'headlineLarge', 'headlineMedium', 'headlineSmall',
  'titleLarge', 'titleMedium', 'titleSmall',
  'labelLarge',
]);

/** The nearest weight we load: nothing lighter than 600 (this look has no thin text), 'bold' is 700. */
export function nearestWeight(w: string | number | undefined | null): FontWeight {
  const n = w === 'bold' ? 700 : typeof w === 'number' ? w : parseInt(String(w ?? '600'), 10);
  if (!Number.isFinite(n) || n <= 650) return 600;
  if (n <= 750) return 700;
  if (n <= 850) return 800;
  return 900;
}

export const familyFor = (weight: string | number | undefined | null, role: Role = 'body'): FamilyName => FAMILIES[role][nearestWeight(weight)];
