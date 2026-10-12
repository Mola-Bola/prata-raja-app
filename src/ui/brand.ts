// Brand file (preset: oleh): the whole look of the app that is NOT structure. Edit these values to tune the app; nothing else
// has to change. Pure data (no imports) so tools can read it. src/ui/palette.ts builds the Paper theme from it and
// src/ui/__tests__/palette.test.ts checks every text pairing for contrast (WCAG AA), so run `npx vitest run src/ui`
// after any colour change.
//
// Keys (same in every brand): Paper's colour roles (primary = the one thing to tap and "go / done / selected"),
// `semantic` (colours Paper has no role for: success / warn / info containers, the coral hero + its lip, the leaf lip,
// card borders), the avatar pastels, and the typeface.
//
// Typeface: `fonts` names the loaded family for each weight. To change typeface: `npx expo install @expo-google-fonts/<font>`,
// import its weights in src/ui/fonts.ts (FONT_FILES), and change the names below.

// "Sunday market": a bright, soft page with white cards, ink text, a leaf green for the one thing to tap, a coral hero and sun yellow.
export const brand = {
  id: 'oleh',
  light: {
    primary: '#167A55',
    onPrimary: '#FFFFFF',
    primaryContainer: '#DDF5EA',
    onPrimaryContainer: '#0B3D2A',
    secondary: '#4458A0',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DCE6FF',
    onSecondaryContainer: '#1B2340',
    tertiary: '#1A7F7D',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#D2F0EC',
    onTertiaryContainer: '#0A3533',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#F5F7FC',
    onBackground: '#1B2340',
    surface: '#FFFFFF',
    onSurface: '#1B2340',
    surfaceVariant: '#E3E8F4',
    onSurfaceVariant: '#515B78',
    outline: '#7A85A6',
    outlineVariant: '#E3E8F4',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#1B2340',
    inverseOnSurface: '#F5F7FC',
    inversePrimary: '#3CCB8C',
    // Cards are white on the pale page; level3 and up are the sky tints (chips, wells).
    elevation: { level0: 'transparent', level1: '#FFFFFF', level2: '#FFFFFF', level3: '#EFF3FB', level4: '#E8EEFA', level5: '#DCE6FF' },
    surfaceDisabled: 'rgba(27, 35, 64, 0.12)',
    onSurfaceDisabled: 'rgba(27, 35, 64, 0.38)',
    // Behind sheets and dialogs: the standard Material 3 scrim (black at 32%).
    backdrop: 'rgba(27, 35, 64, 0.4)',
  },
  dark: {
    primary: '#3CCB8C',
    onPrimary: '#06281B',
    primaryContainer: '#14432F',
    onPrimaryContainer: '#C4F4DE',
    secondary: '#A9BBFF',
    onSecondary: '#1B2340',
    secondaryContainer: '#2A3456',
    onSecondaryContainer: '#EEF1FA',
    tertiary: '#6FD6CF',
    onTertiary: '#06302D',
    tertiaryContainer: '#144A47',
    onTertiaryContainer: '#C7F2EE',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#121628',
    onBackground: '#EEF1FA',
    surface: '#1C2238',
    onSurface: '#EEF1FA',
    surfaceVariant: '#2A3456',
    onSurfaceVariant: '#A6AFCB',
    outline: '#7C87AB',
    outlineVariant: '#2C3452',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#EEF1FA',
    inverseOnSurface: '#1B2340',
    inversePrimary: '#167A55',
    elevation: { level0: 'transparent', level1: '#1C2238', level2: '#222A45', level3: '#2A3456', level4: '#313C63', level5: '#38446F' },
    surfaceDisabled: 'rgba(238, 241, 250, 0.12)',
    onSurfaceDisabled: 'rgba(238, 241, 250, 0.38)',
    // Darker than light mode's: a light scrim barely shows on a dark page.
    backdrop: 'rgba(6, 8, 18, 0.7)',
  },
  semantic: {
    light: {
      success: '#167A55',
      successContainer: '#DDF5EA',
      onSuccessContainer: '#0B3D2A',
      warn: '#8A5000', // 5:1 or better on every light surface, including warnContainer
      warnContainer: '#FFF0C2',
      onWarnContainer: '#6B4200',
      /** Blue: things under way (in progress, booked). Not the brand colour, so status never competes with the one hero. */
      info: '#2A5CB8',
      infoContainer: '#DCE6FF',
      onInfoContainer: '#0F2C66',
      /** Hairline round cards so they don't melt into the page. */
      cardBorder: '#D5DCEE',
      /** The coral: the postcard hero, the + button, the mic. White (onCoral) on it passes AA. */
      coral: '#CC4529',
      onCoral: '#FFFFFF',
      /** Coral text on white or on a card (the live pill). */
      coralDeep: '#A8341C',
      /** The bottom "lip" under a coral thing. */
      coralLip: '#A8341C',
      /** The bottom "lip" under a leaf (primary) button. */
      leafLip: '#0E5A3E',
      /** The lip under a ghost button and an unselected choice: the page's line, a touch darker. */
      lip: '#D5DCEE',
      sun: '#FFD25A',
      onSun: '#1B2340',
      /** A soft green behind a selected choice. */
      selectedTint: '#EEFBF4',
      /** The dashed edge of an "add" tile. */
      dash: '#A9B4D2',
    },
    dark: {
      success: '#3CCB8C',
      successContainer: '#14432F',
      onSuccessContainer: '#C4F4DE',
      warn: '#FFC857',
      warnContainer: '#4A3500',
      onWarnContainer: '#FFE3A0',
      info: '#A9BBFF',
      infoContainer: '#26396E',
      onInfoContainer: '#DCE6FF',
      cardBorder: '#2C3452',
      coral: '#FF7A5C',
      onCoral: '#2B0D06',
      coralDeep: '#FF9C84',
      coralLip: '#C9563C',
      leafLip: '#1F8F63',
      lip: '#0B0E1C',
      sun: '#FFD25A',
      onSun: '#1B2340',
      selectedTint: '#16372B',
      dash: '#46507A',
    },
  },
  /** Pastel circles behind a person's initial (ink text on them passes AA). */
  avatarPastels: ['#FFC1B4', '#BFE3FF', '#CFF3A8', '#FFE08A', '#E4CCFF', '#B9F0E3', '#FFD1E8'],
  /** The ink for an initial on an avatar pastel. */
  avatarInk: '#1B2340',
  /** Family name per weight, for headings and for body text (Fredoka stops at 700, so its 800 and 900 are its 700). */
  fonts: {
    heading: { 600: 'Fredoka_600SemiBold', 700: 'Fredoka_700Bold', 800: 'Fredoka_700Bold', 900: 'Fredoka_700Bold' },
    body: { 600: 'Nunito_600SemiBold', 700: 'Nunito_700Bold', 800: 'Nunito_800ExtraBold', 900: 'Nunito_900Black' },
  },
};
