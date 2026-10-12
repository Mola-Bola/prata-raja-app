#!/usr/bin/env node
// Draws the app's icons as PNGs. With real artwork (assets/icon-source/prata-raja-icon.jpg, the owner-approved render) it
// runs scripts/gen-icons.py, which makes every icon and the splash from it; without one it draws placeholders (a coral
// disc with a white centre on the page colour, in the colours of src/ui/brand.ts) with no browser or image library. Keep
// the file names and sizes: app.json and public/manifest.webmanifest point at them.
//   node scripts/render-icons.mjs   → assets/images/*.png and public/icons/*.png
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';

import { brand } from './brand-data.mjs';

const ROOT = join(import.meta.dirname, '..');
if (existsSync(join(ROOT, 'assets/icon-source/prata-raja-icon.jpg'))) {
  execFileSync('python3', [join(ROOT, 'scripts/gen-icons.py')], { stdio: 'inherit' }); // needs Pillow, numpy, scipy
  process.exit(0);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BG = hex(brand.light.background);
const CORAL = hex(brand.semantic.light.coral);
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

/** Coverage (0..1) of a disc of radius r centred at (c, c) over the pixel at (x, y): a 1px soft edge. */
const disc = (x, y, c, r) => Math.min(1, Math.max(0, r - Math.hypot(x + 0.5 - c, y + 0.5 - c) + 0.5));

/** layers: [{ color, r }] drawn in order (r is a share of the size); `bg` is a colour or null for transparent. */
function png(size, bg, layers) {
  const c = size / 2;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let [r, g, b, a] = bg ? [...bg, 1] : [0, 0, 0, 0];
      for (const l of layers) {
        const k = disc(x, y, c, l.r * size);
        if (!k) continue;
        const out = k + a * (1 - k);
        const mix = (top, under) => (top * k + under * a * (1 - k)) / out;
        [r, g, b, a] = [mix(l.color[0], r), mix(l.color[1], g), mix(l.color[2], b), out];
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = Math.round(r);
      raw[o + 1] = Math.round(g);
      raw[o + 2] = Math.round(b);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const mark = (r) => [
  { color: CORAL, r },
  { color: WHITE, r: r * 0.36 },
];
const files = {
  'assets/images/icon.png': png(1024, BG, mark(0.3)),
  'assets/images/android-icon-foreground.png': png(1024, null, mark(0.22)),
  'assets/images/android-icon-background.png': png(1024, BG, []),
  // The monochrome icon is a single colour (Android tints it).
  'assets/images/android-icon-monochrome.png': png(1024, null, [{ color: BLACK, r: 0.22 }]),
  'assets/images/splash-icon.png': png(1024, null, mark(0.3)),
  'assets/images/favicon.png': png(96, BG, mark(0.34)),
  'public/icons/icon-192.png': png(192, BG, mark(0.3)),
  'public/icons/icon-512.png': png(512, BG, mark(0.3)),
  'public/icons/apple-touch-icon.png': png(180, BG, mark(0.3)),
};
for (const [rel, buf] of Object.entries(files)) {
  mkdirSync(join(ROOT, rel, '..'), { recursive: true });
  writeFileSync(join(ROOT, rel), buf);
}
console.log('rendered', Object.keys(files).length, 'icons');
