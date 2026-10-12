/// <reference types="node" />
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { palette } from '../palette';

// The web page paints its own background before the JavaScript arrives (scripts/web-pwa.mjs), so it must be the
// app's background colour in each theme, or dark mode flashes white on a slow load.
function themeBackground(which: 'light' | 'dark'): string {
  return palette[which].background;
}

async function builtHead(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'web-head-'));
  writeFileSync(join(dir, 'index.html'), '<!DOCTYPE html><html><head><title>App</title></head><body><div id="root"></div></body></html>');
  writeFileSync(join(dir, 'manifest.webmanifest'), '{}');
  copyFileSync(join(process.cwd(), 'public', 'sw.js'), join(dir, 'sw.js')); // addPwaTags writes the offline file list into it
  const mod = (await import(pathToFileURL(join(process.cwd(), 'scripts', 'web-pwa.mjs')).href)) as { addPwaTags: (dist: string) => void };
  mod.addPwaTags(dir);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  return html.slice(0, html.indexOf('</head>'));
}

describe('web page head', () => {
  it('paints the theme background in light and dark before the app loads', async () => {
    const head = await builtHead();
    expect(head).toMatch(/<meta name="color-scheme" content="light dark">/);
    const css = head.slice(head.indexOf('<style'), head.indexOf('</style>'));
    const [light, dark] = css.split('prefers-color-scheme: dark');
    expect(light.toLowerCase()).toContain(`background-color:${themeBackground('light').toLowerCase()}`);
    expect(dark.toLowerCase()).toContain(`background-color:${themeBackground('dark').toLowerCase()}`);
  });
});
