#!/usr/bin/env python3
"""Regenerates every app icon from one 1024px render, and the splash from the game logo.

  python3 scripts/gen-icons.py [render.png]      (`node scripts/render-icons.mjs` runs this when the render exists)

The render (assets/icon-source/prata-raja-icon.jpg, made with AGY on 12 Oct 2026) is a crowned golden prata on an
orange-to-red radial background. Writes assets/images/{icon,android-icon-foreground,android-icon-background,
android-icon-monochrome,favicon,splash-icon}.png and public/icons/{apple-touch-icon,icon-192,icon-512}.png.

Android adaptive icons are two layers, and a launcher's circle or squircle trims the outer third of both, so the subject
(prata, crown, swooshes and the soft shadow) is cut out of the render and shrunk to 80% on a transparent canvas, over a
background layer that is the render's own gradient. The gradient is smooth and radial, so it is fitted from the pixels
that match it (outside in) and the subject is whatever differs from the fit. The thresholds suit this render: a new one
may need them nudged (look at assets/images/android-icon-foreground.png over android-icon-background.png).
The monochrome layer (Android 13 themed icons) is the subject's silhouette. The splash is the game logo, small enough
for the circle Android 12 masks splash icons with, on the cream the splash plugin paints (app.json).
Needs Pillow, numpy and scipy (dev tools only).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = lambda *p: os.path.join(ROOT, *p)  # noqa: E731
SRC = sys.argv[1] if len(sys.argv) > 1 else out('assets/icon-source/prata-raja-icon.jpg')
LOGO = out('assets/game/ui/logo.webp')
SCALE = 0.80  # the subject's share of the adaptive canvas
LAYER = 512  # adaptive layer size (the build resizes it for each screen density)

render = Image.open(SRC).convert('RGB')
assert render.size == (1024, 1024), f'expected a 1024px square render, got {render.size}'
im = np.asarray(render, dtype=np.float64)
H, W, _ = im.shape
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot(xx - (W - 1) / 2, yy - (H - 1) / 2)
RMAX = r.max()
lum = lambda a: a @ np.array([0.299, 0.587, 0.114])  # noqa: E731


def fit(sel):
    return [np.polyfit(r[sel] / RMAX, im[..., c][sel], 4) for c in range(3)]


def gradient(coefs, rr):
    return np.stack([np.polyval(coefs[c], rr / RMAX) for c in range(3)], axis=-1)


# 1. The background gradient, fitted from the outside in on the pixels that still match it.
coefs = fit(r > 0.58 * RMAX)
for lo in (0.55, 0.5, 0.47, 0.44, 0.41, 0.38, 0.35):
    dist = np.sqrt(((im - gradient(coefs, r)) ** 2).sum(axis=2))
    coefs = fit((r > lo * RMAX) & (dist < 14))
bg = gradient(coefs, r)
dist = np.sqrt(((im - bg) ** 2).sum(axis=2))

# 2. The subject: what differs from the gradient and is lighter than it. Darker patches are the shadow.
labels, n = ndi.label(ndi.binary_opening(dist > 22, structure=np.ones((3, 3))))
subject = np.zeros((H, W), bool)
for i in range(1, n + 1):
    part = labels == i
    if part.sum() >= 300 and (lum(im) - lum(bg))[part].mean() >= -5:
        subject |= part
subject = ndi.binary_fill_holes(ndi.binary_closing(subject, structure=np.ones((5, 5)), iterations=2))
mask = ndi.gaussian_filter(ndi.binary_dilation(subject, iterations=1).astype(np.float64), 1.1)
shade = ndi.gaussian_filter(np.clip((lum(bg) - lum(im)) / np.maximum(lum(bg), 1) * 1.9, 0, 0.5) * (1 - mask), 1.5)
alpha = np.clip(mask + shade * (1 - mask), 0, 1)
subject_rgba = Image.fromarray(np.dstack([np.where(mask[..., None] > 0.02, im, 0.0), alpha * 255]).astype(np.uint8))
silhouette = Image.new('RGBA', (W, H), (255, 255, 255, 0))
silhouette.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

# The subject (without its shadow) centred on the canvas, then scaled to SCALE.
ys, xs = np.where(mask > 0.5)
shift = (W // 2 - (xs.min() + xs.max()) // 2, H // 2 - (ys.min() + ys.max()) // 2)


def on_canvas(img):
    moved = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    moved.paste(img, shift)
    inner = round(LAYER * SCALE)
    small = moved.resize((LAYER, LAYER), Image.LANCZOS).resize((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (LAYER, LAYER), (0, 0, 0, 0))
    canvas.paste(small, ((LAYER - inner) // 2, (LAYER - inner) // 2), small)
    return canvas


# 3. The adaptive background: the fitted gradient, flat inside the middle (where the prata covered the render).
rr = np.hypot(*(np.mgrid[0:LAYER, 0:LAYER] - (LAYER - 1) / 2)) / (LAYER / 2) * (RMAX / np.sqrt(2))
back = Image.fromarray(np.clip(gradient(coefs, np.maximum(rr, 0.32 * RMAX)), 0, 255).astype(np.uint8))

# 4. Splash: the logo, small enough to sit inside the circle Android 12 masks the splash icon with, on a transparent canvas.
logo = Image.open(LOGO).convert('RGBA')
logo = logo.crop(logo.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
s = 0.30 * 1024 / (0.5 * np.hypot(*logo.size))
logo = logo.resize((round(logo.width * s), round(logo.height * s)), Image.LANCZOS)
splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
splash.paste(logo, ((1024 - logo.width) // 2, (1024 - logo.height) // 2), logo)

files = {
    'assets/images/icon.png': render,
    'assets/images/android-icon-foreground.png': on_canvas(subject_rgba),
    'assets/images/android-icon-background.png': back,
    'assets/images/android-icon-monochrome.png': on_canvas(silhouette),
    'assets/images/favicon.png': render.resize((96, 96), Image.LANCZOS),
    'assets/images/splash-icon.png': splash,
    'public/icons/apple-touch-icon.png': render.resize((180, 180), Image.LANCZOS),
    'public/icons/icon-192.png': render.resize((192, 192), Image.LANCZOS),
    'public/icons/icon-512.png': render.resize((512, 512), Image.LANCZOS),
}
for rel, img in files.items():
    img.save(out(rel), optimize=True)
mid = gradient(coefs, np.array([0.5 * RMAX]))[0].astype(int)
print(f'icons written from {SRC} ({len(files)} files); adaptive background colour #{mid[0]:02X}{mid[1]:02X}{mid[2]:02X} (app.json android.adaptiveIcon.backgroundColor)')
