// The overlay's two typefaces, bundled with the game so it needs no network. (The Google Fonts @import this replaces logged an
// error offline and left the screens in fallback fonts until it gave up.) Metro bundles each .ttf from @expo-google-fonts next to
// the DOM component's JS, like the sprites in assets.ts, and a @font-face points at it. The weights are the ones GameUi.css uses.
type Asset = string | { uri?: string; default?: unknown };

const FACES: [family: string, weight: number, asset: Asset][] = [
  ['Fredoka', 600, require('@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf')],
  ['Fredoka', 700, require('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf')],
  ['Nunito', 600, require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf')],
  ['Nunito', 700, require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf')],
  ['Nunito', 800, require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf')],
];

/** Where a font file is fetched from: a web bundle's require() gives { uri } (or the uri itself). */
export function fontUri(asset: Asset): string {
  if (typeof asset === 'string') return asset;
  if (asset.uri) return asset.uri;
  return asset.default ? fontUri(asset.default as Asset) : '';
}

/** Adds the @font-face rules once. Call before the first screen draws (module load of GameRoot). */
export function installFonts(): void {
  if (typeof document === 'undefined' || document.getElementById('gu-fonts')) return;
  const style = document.createElement('style');
  style.id = 'gu-fonts';
  style.textContent = FACES.map(
    ([family, weight, asset]) =>
      `@font-face{font-family:${family};font-weight:${weight};font-style:normal;font-display:swap;src:url("${fontUri(asset)}") format("truetype")}`,
  ).join('');
  document.head.appendChild(style);
  // The renderer's damage numbers draw on a canvas, which does not wait for a font: ask for the one they use now.
  void document.fonts?.load('700 18px Fredoka').catch(() => {});
}
