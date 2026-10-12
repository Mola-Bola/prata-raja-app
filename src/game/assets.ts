// Every sprite the game draws is a .webp under assets/game/ (written by the art slicer, listed in manifest.json).
//
// They are loaded with require, not from public/. Metro bundles each file, hashes its name and ships it next to the DOM
// component's JS: in the web build, in the Android APK (inside www.bundle/) and in an OTA update (listed in its
// metadata.json), which public/ files are not (an update cannot change those). A DOM bundle is always a web bundle, so
// `require('x.webp')` gives { uri, width, height } and `uri` is what a <img>/Phaser can fetch: root-relative on web
// ("/assets/assets/game/…"), relative to the DOM page everywhere else ("assets/assets/game/…" in the APK, "<hash>.webp"
// in an OTA update), so it works from file:// in the WebView with no base URL to pick. require.context lists the
// folder at build time, so a new sprite needs no code change here.
declare global {
  interface NodeRequire {
    /** Metro's build-time folder listing (the same one Expo Router uses for src/app). */
    context(dir: string, deep: boolean, filter: RegExp): { (file: string): { uri: string; width: number; height: number }; keys(): string[] };
  }
}

const files = require.context('../../assets/game', true, /\.webp$/);

/** "enemies/roach" → the URL it is fetched from. Also the Phaser texture key. */
export const ASSET_URLS: Record<string, string> = Object.fromEntries(
  files.keys().map((file) => [file.replace(/^\.\//, '').replace(/\.webp$/, ''), files(file).uri]),
);
