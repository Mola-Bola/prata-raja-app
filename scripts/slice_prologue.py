#!/usr/bin/env python3
"""Slice waiting 0.3.1 art with the original S1 magenta-key pipeline; story/scenes stay DOM-only."""
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
SOURCE = Path.home() / 'cell/.design/prata-raja-2026-10-12/s1'
ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / 'assets/game'
spec = importlib.util.spec_from_file_location('s1', SOURCE / 'slice_s1.py')
s1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s1)
s1.OUT = str(GAME)

manifest = json.loads((GAME / 'manifest.json').read_text())


def save(im, group, name, alpha=False):
    s1.save(im, group, name, 90 if alpha else 82, alpha=alpha)
    manifest[f'{group}/{name}'] = {'w': im.width, 'h': im.height}


# Full portrait panels have no key background: preserve the composition, compress only.
for i in range(1, 7):
    save(Image.open(SOURCE / f'raw/story-{i}.png').convert('RGB'), 'story', f'prologue-{i}')

# Connected silhouettes overlap in x (wing / grate), so isolate components before cropping.
im = Image.open(SOURCE / 'raw/pests-new.png').convert('RGB')
_, keyed = s1.key_masks(np.asarray(im).astype(int), s1.TOL_DEFAULT)
labels, _ = s1.ndi.label(s1.ndi.binary_dilation(~keyed, iterations=s1.DILATE))
cells = [[], [], []]
for label, box in enumerate(s1.ndi.find_objects(labels), 1):
    if box is None or int(((labels == label) & ~keyed).sum()) < s1.MIN_AREA:
        continue
    cx = (box[1].start + box[1].stop) / 2
    cells[min(2, int(cx * 3 / im.width))].append(label)
for labels_in_cell, group, name, size in zip(cells, ['enemies', 'enemies', 'bosses'],
        ['mynah-thief', 'drain-rat', 'grade-inspector'], [256, 256, 512]):
    rgba = im.convert('RGBA')
    rgba.putalpha(s1.alpha_of(keyed | ~np.isin(labels, labels_in_cell)))
    rgba = s1.sprite(s1.tight(rgba), size)
    assert all(rgba.getchannel('A').getpixel(p) == 0 for p in [(0, 0), (0, rgba.height-1), (rgba.width-1, 0), (rgba.width-1, rgba.height-1)])
    save(rgba, group, name, True)

# Three clearly separated full scenes; no attempt to extract worn gear from a painted background.
im = Image.open(SOURCE / 'raw/world-tiers.png').convert('RGB')
for i, (left, right) in enumerate([(0, 556), (564, 1116), (1124, 1680)]):
    save(im.crop((left, 0, right, im.height)), 'scene', f'hub-tier-{[1, 5, 10][i]}')

(GAME / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Sliced six story panels, three pests and three stall scenes; gear looks deferred.')
