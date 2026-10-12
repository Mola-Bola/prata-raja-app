#!/usr/bin/env python3
"""Pack assets/game sprites (manifest.json, minus 'scene') into 2048x2048 WebP atlases for Phaser.

Each sprite is trimmed to its alpha bbox. Its edge pixels are copied 1 px outward (extrusion, so bilinear
sampling never reads a neighbour), and 1 px of transparent padding goes outside that: neighbouring frames are
2 px of padding apart. Frames are placed with a best-short-side-fit MaxRects packer, first-fit over the atlases.
Anything over 1024 px on a side is downscaled first; its frame gets "scale" and sourceSize keeps the original size.

Writes assets/game-atlas/atlas-<n>.webp (quality 90, alpha) and atlas-<n>.json (Phaser JSON Hash).
Run: python3 scripts/pack_atlas.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / 'assets' / 'game'
OUT = ROOT / 'assets' / 'game-atlas'
SIZE = 2048        # atlas edge in px (power of two, so WebGL1 can mipmap it)
MAX_SIDE = 1024    # larger sprites are downscaled to fit
EXTRUDE = 1        # px of replicated edge around each frame
M = 2              # px from a frame edge to its slot edge: EXTRUDE plus 1 px transparent padding


class MaxRects:
    """One atlas page: best-short-side-fit placement, no rotation."""

    def __init__(self):
        self.free = [(0, 0, SIZE, SIZE)]  # (x, y, w, h)

    def insert(self, w, h):
        fits = [(min(fw - w, fh - h), max(fw - w, fh - h), x, y) for x, y, fw, fh in self.free if w <= fw and h <= fh]
        if not fits:
            return None
        _, _, x, y = min(fits)
        self._cut(x, y, w, h)
        return x, y

    def _cut(self, x, y, w, h):
        out = []
        for fx, fy, fw, fh in self.free:
            if x >= fx + fw or x + w <= fx or y >= fy + fh or y + h <= fy:  # untouched by the placed rect
                out.append((fx, fy, fw, fh))
                continue
            if x > fx:
                out.append((fx, fy, x - fx, fh))
            if x + w < fx + fw:
                out.append((x + w, fy, fx + fw - x - w, fh))
            if y > fy:
                out.append((fx, fy, fw, y - fy))
            if y + h < fy + fh:
                out.append((fx, y + h, fw, fy + fh - y - h))
        # drop free rects that sit inside another one (of a pair of identical rects, keep the first)
        self.free = [r for i, r in enumerate(out) if not any(j != i and inside(r, o) and (o != r or j < i) for j, o in enumerate(out))]


def inside(r, o):
    return o[0] <= r[0] and o[1] <= r[1] and r[0] + r[2] <= o[0] + o[2] and r[1] + r[3] <= o[1] + o[3]


def extrude(im):
    """The sprite plus a 1 px ring copied from its edge pixels (corners copy the corner pixel)."""
    w, h = im.size
    out = Image.new('RGBA', (w + 2, h + 2))
    out.paste(im, (1, 1))
    out.paste(im.crop((0, 0, w, 1)), (1, 0))
    out.paste(im.crop((0, h - 1, w, h)), (1, h + 1))
    out.paste(im.crop((0, 0, 1, h)), (0, 1))
    out.paste(im.crop((w - 1, 0, w, h)), (w + 1, 1))
    for sx, sy, dx, dy in ((0, 0, 0, 0), (w - 1, 0, w + 1, 0), (0, h - 1, 0, h + 1), (w - 1, h - 1, w + 1, h + 1)):
        out.paste(im.getpixel((sx, sy)), (dx, dy, dx + 1, dy + 1))
    return out


def load(name):
    src = Image.open(GAME / f'{name}.webp').convert('RGBA')
    box = src.getchannel('A').getbbox()
    if box is None:
        raise SystemExit(f'{name}: fully transparent')
    art = src.crop(box)
    scale = min(1.0, MAX_SIDE / max(art.size))
    if scale < 1:
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.Resampling.LANCZOS)
    return {'name': name, 'src': src.size, 'box': box, 'scale': scale, 'art': art, 'ext': extrude(art)}


def main():
    manifest = json.loads((GAME / 'manifest.json').read_text())
    sprites = [load(n) for n in sorted(manifest) if not n.startswith('scene/')]

    # First fit over the pages; tallest sprites first so the big ones pack tightly.
    pages = []  # [(MaxRects, [(sprite, slot_x, slot_y)])]
    for s in sorted(sprites, key=lambda s: (-s['art'].height, -s['art'].width, s['name'])):
        side = (s['art'].width + 2 * M, s['art'].height + 2 * M)
        for rects, placed in pages:
            pos = rects.insert(*side)
            if pos:
                break
        else:
            rects, placed = MaxRects(), []
            pages.append((rects, placed))
            pos = rects.insert(*side)
        assert pos, f"{s['name']} does not fit an empty {SIZE} page"
        placed.append((s, *pos))

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('atlas-*'):  # stale pages from an earlier, larger run
        old.unlink()
    atlas_bytes = 0
    for n, (_, placed) in enumerate(pages):
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        frames, used = {}, 0
        for s, sx, sy in sorted(placed, key=lambda p: p[0]['name']):
            fw, fh = s['art'].size
            canvas.paste(s['ext'], (sx + M - EXTRUDE, sy + M - EXTRUDE))
            used += (fw + 2 * M) * (fh + 2 * M)
            box = s['box']
            frames[s['name']] = {
                'frame': {'x': sx + M, 'y': sy + M, 'w': fw, 'h': fh},
                'rotated': False,
                'trimmed': True,
                'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1]},
                'sourceSize': {'w': s['src'][0], 'h': s['src'][1]},
                **({'scale': round(s['scale'], 6)} if s['scale'] < 1 else {}),
            }
        image = f'atlas-{n}.webp'
        canvas.save(OUT / image, 'WEBP', quality=90)
        data = {'frames': frames, 'meta': {'image': image, 'size': {'w': SIZE, 'h': SIZE}, 'scale': '1'}}
        (OUT / f'atlas-{n}.json').write_text(json.dumps(data, indent=2) + '\n')
        atlas_bytes += (OUT / image).stat().st_size
        print(f'{image}: {len(frames)} frames, fill {100 * used / SIZE ** 2:.1f}%, {(OUT / image).stat().st_size / 1024:.0f} KB')

    loose = sum((GAME / f"{s['name']}.webp").stat().st_size for s in sprites)
    print(f'{len(pages)} atlases, {atlas_bytes / 1024:.0f} KB (webp) vs {loose / 1024:.0f} KB loose (same frames)')


if __name__ == '__main__':
    main()
