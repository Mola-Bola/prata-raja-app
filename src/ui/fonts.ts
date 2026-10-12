// The app's typefaces: which font files exist and how they load. Which family each weight uses for headings (screen
// titles, section and card titles, button and chip labels) and for body text is named in brand.ts (`fonts`). Swapping a
// typeface is a change to FONT_FILES here and to the names in brand.ts; HEADING_VARIANTS (fontFamilies.ts) says which
// text variants are headings.
//
// Native text can't pick a weight inside a custom family, so each weight is its own family name
// ("Nunito_800ExtraBold"). Screens still write `fontWeight: '700'`; `setWeightFamilies` (below) turns that into the
// matching family for Paper's Text. If the fonts can't load, everything falls back to the system font.
// One import per weight (not the package root, which would bundle every weight of both families into the app).
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { familyFor, type FamilyName, HEADING_VARIANTS, type Role } from './fontFamilies';

/** The font files to load (expo-font's `useFonts` map: family name → file). */
export const FONT_FILES: Record<FamilyName, number> = {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
};

export { familyFor, FAMILIES, type FamilyName, type FontWeight, HEADING_VARIANTS, nearestWeight, type Role } from './fontFamilies';

// ── Loading ──
/** Gives up waiting after this long and shows the app in the system font (it switches to ours if the files arrive). */
const GIVE_UP_MS = 4000;

/**
 * Load the fonts. `ready` says the app can draw (loaded, failed, or gave up waiting: hold the splash until then);
 * `ok` says our fonts are usable (use them for the theme, else the system font).
 */
export function useAppFonts(): { ready: boolean; ok: boolean } {
  const [loaded, error] = useFonts(FONT_FILES);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, []);
  const ok = loaded && !error;
  // Said while rendering (not in an effect) so the very first frame of the app already uses the right families.
  // It only ever goes from off to on, so rendering twice can't disagree.
  setWeightFamilies(ok);
  return { ready: loaded || !!error || gaveUp, ok };
}

// ── Weights on Paper's Text ──
// Paper's Text takes its family from the theme's variant, then the style. A style that says `fontWeight: '700'` would
// make the browser or phone fake a bolder face of an already-bold family, so while our fonts are in use it is changed
// into the family for that weight instead. One patch here, so no screen has to change.
let weightsOn = false;
function setWeightFamilies(on: boolean) {
  weightsOn = on;
}

type Render = (props: { style?: StyleProp<TextStyle>; variant?: string }, ref: unknown) => unknown;
const paperText = Text as unknown as { render?: Render; __cellApp?: boolean };
if (typeof paperText.render === 'function' && !paperText.__cellApp) {
  const render = paperText.render;
  paperText.__cellApp = true;
  paperText.render = (props, ref) => {
    if (!weightsOn) return render(props, ref);
    const { fontWeight, ...rest } = StyleSheet.flatten(props.style) ?? {};
    if (fontWeight == null) return render(props, ref);
    const role: Role = props.variant && HEADING_VARIANTS.has(props.variant) ? 'heading' : 'body';
    return render({ ...props, style: [rest, { fontFamily: familyFor(fontWeight, role) }] }, ref);
  };
}

// ── Larger text in text boxes ──
// Paper's TextInput sets its own 16px unless its style says otherwise, so Me → Larger text would leave what people type
// small. While it is on, a box that doesn't give its own size gets this one (its label follows).
let inputSize: number | null = null;
/** The text size for typing in boxes while Larger text is on; null is Paper's own. Said while rendering, like the weights. */
export function setInputFontSize(px: number | null) {
  inputSize = px;
}

const paperInput = TextInput as unknown as { render?: Render; __cellApp?: boolean };
if (typeof paperInput.render === 'function' && !paperInput.__cellApp) {
  const render = paperInput.render;
  paperInput.__cellApp = true;
  paperInput.render = (props, ref) => {
    if (inputSize == null || StyleSheet.flatten(props.style)?.fontSize != null) return render(props, ref);
    return render({ ...props, style: [props.style, { fontSize: inputSize }] }, ref);
  };
}
