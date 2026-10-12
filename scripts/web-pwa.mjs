#!/usr/bin/env node
// Makes an exported web build installable ("Add to Home Screen" on iPhone and Android) and gives shared links a
// preview card (WhatsApp, iMessage): links the manifest, Apple touch icon and Open Graph tags in <head>.
// It also paints the app's background (light or dark, as the phone is set) before the JavaScript arrives, so dark
// mode doesn't open on a white page. Those colours are `background` in src/ui/brand.ts (read from there, so they can't drift).
// public/manifest.webmanifest and public/icons/* are copied by `expo export`; only these tags need the base path
// (a sub-folder when the site is hosted under one, / on the Mac). Preview images need an absolute URL, so pass siteUrl when publishing.
// It also writes the list of built files into dist/sw.js (public/sw.js), so the app is saved for offline use the
// first time it's opened, not only once each file happens to have been fetched.
//   node scripts/web-pwa.mjs <distDir> [basePath] [siteUrl]   (also imported by publish-web.mjs and ship.mjs)
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { brand, brandWords } from './brand-data.mjs';

/** Text going into an HTML attribute or element. */
const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The line in public/sw.js that the built list replaces (and replaces again when this runs twice). */
const BUILD_LINE = /^const BUILD = .*; \/\/ filled in by scripts\/web-pwa\.mjs$/m;

/** Every file the app needs, relative to the site root. Not source maps, the worker itself, or copies of the page. */
export function offlineFiles(distDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(distDir, full).split(sep).join('/'));
    }
  };
  walk(distDir);
  return out
    .filter((f) => !/\.map$|(^|\/)\.[^/]*$/.test(f) && f !== 'sw.js' && f !== 'metadata.json')
    .filter((f) => !f.endsWith('.html') || f === 'index.html') // 404.html, i/index.html: the same page
    .sort();
}

/** Write the file list, and a version that changes when any file does, into distDir/sw.js. */
export function writeOfflineList(distDir) {
  const sw = join(distDir, 'sw.js');
  if (!existsSync(sw)) throw new Error(`${distDir} has no sw.js (public/ not copied?)`);
  const files = offlineFiles(distDir);
  if (!files.includes('index.html')) throw new Error(`${distDir} has no index.html`);
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update('\0').update(readFileSync(join(distDir, f))).update('\0');
  const build = { version: hash.digest('hex').slice(0, 12), files: files.map(encodeURI) };
  const src = readFileSync(sw, 'utf8');
  if (!BUILD_LINE.test(src)) throw new Error(`${sw} has no "const BUILD = …; // filled in by scripts/web-pwa.mjs" line`);
  writeFileSync(sw, src.replace(BUILD_LINE, `const BUILD = ${JSON.stringify(build)}; // filled in by scripts/web-pwa.mjs`));
  return build;
}

const BACKGROUND = { light: brand.light.background, dark: brand.dark.background };

/** The page title is the app name from src/brand.ts (the app sets it per screen once it runs: src/ui/a11y.ts). */
export function withTitle(page) {
  const title = `<title>${html(brandWords.appName)}</title>`;
  // Callbacks, not replacement strings: a name with "$&" or "$'" in it must go in as written.
  return /<title>[^<]*<\/title>/.test(page) ? page.replace(/<title>[^<]*<\/title>/, () => title) : page.replace('</head>', () => `${title}\n</head>`);
}

/** public/manifest.webmanifest carries no names: they are filled in from src/brand.ts, so a rename is one edit. */
export function brandManifest(m) {
  return { ...m, name: brandWords.appName, short_name: brandWords.shortName, description: brandWords.description };
}

export function addPwaTags(distDir, base = '', siteUrl = '') {
  const b = base.replace(/\/$/, '');
  const site = siteUrl.replace(/\/$/, '');
  const tags = [
    '<meta name="color-scheme" content="light dark">',
    `<style id="app-background">html,body{background-color:${BACKGROUND.light}}@media (prefers-color-scheme: dark){html,body{background-color:${BACKGROUND.dark}}}</style>`,
    `<link rel="manifest" href="${b}/manifest.webmanifest">`,
    `<link rel="apple-touch-icon" href="${b}/icons/apple-touch-icon.png">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-title" content="${html(brandWords.shortName)}">`,
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta property="og:site_name" content="${html(brandWords.appName)}">`,
    `<meta property="og:title" content="${html(brandWords.appName)}">`,
    `<meta property="og:description" content="${html(brandWords.description)}">`,
    `<meta name="description" content="${html(brandWords.description)}">`,
    '<meta property="og:type" content="website">',
    ...(site ? [`<meta property="og:image" content="${site}/icons/icon-512.png">`, `<meta property="og:url" content="${site}/">`] : []),
    '<meta name="twitter:card" content="summary">',
  ].join('\n');
  for (const name of ['index.html', '404.html']) {
    const file = join(distDir, name);
    if (!existsSync(file)) continue;
    const page = withTitle(readFileSync(file, 'utf8'));
    writeFileSync(file, page.includes('rel="manifest"') ? page : page.replace('</head>', () => `${tags}\n</head>`));
  }
  const manifest = join(distDir, 'manifest.webmanifest');
  if (!existsSync(manifest)) throw new Error(`${distDir} has no manifest.webmanifest (public/ not copied?)`);
  writeFileSync(manifest, `${JSON.stringify(brandManifest(JSON.parse(readFileSync(manifest, 'utf8'))), null, 2)}\n`);
  writeOfflineList(distDir); // last: the page above is one of the files it lists
}

// (realpath: import.meta.url is the resolved path, argv[1] may go through a symlink, e.g. /var → /private/var)
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) addPwaTags(process.argv[2] ?? 'dist', process.argv[3] ?? '', process.argv[4] ?? '');
