import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Reads what scripts/pack_atlas.py wrote. atlas.ts itself is not imported: it needs Metro's require.context.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel: string) => JSON.parse(readFileSync(ROOT + rel, 'utf8'));

type Rect = { x: number; y: number; w: number; h: number };
type Atlas = { frames: Record<string, { frame: Rect }>; meta: { size: { w: number; h: number } } };

const manifest = read('assets/game/manifest.json') as Record<string, unknown>;
const expected = Object.keys(manifest).filter((name) => !name.startsWith('scene/') && !name.startsWith('story/')).sort();
const atlases = readdirSync(ROOT + 'assets/game-atlas')
  .filter((f) => /^atlas-\d+\.json$/.test(f))
  .sort()
  .map((f) => read(`assets/game-atlas/${f}`) as Atlas);

/** Frame rect plus the 2 px padding the packer leaves around it (1 px extrusion, 1 px transparent). */
const padded = (r: Rect): Rect => ({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('texture atlases', () => {
  it('holds every non-scene/non-story manifest entry as a frame in exactly one atlas', () => {
    const names = atlases.flatMap((a) => Object.keys(a.frames)).sort();
    expect(names).toEqual(expected);
  });

  it('keeps every frame inside its 2048 px atlas', () => {
    for (const a of atlases) {
      expect(a.meta.size).toEqual({ w: 2048, h: 2048 });
      const outside = Object.entries(a.frames)
        .filter(([, { frame: r }]) => r.x < 0 || r.y < 0 || r.x + r.w > 2048 || r.y + r.h > 2048)
        .map(([name]) => name);
      expect(outside).toEqual([]);
    }
  });

  it('keeps frames apart: padded rects never overlap within an atlas', () => {
    for (const a of atlases) {
      const frames = Object.entries(a.frames);
      const clashes: string[][] = [];
      for (let i = 0; i < frames.length; i++)
        for (let j = i + 1; j < frames.length; j++)
          if (overlaps(padded(frames[i][1].frame), padded(frames[j][1].frame))) clashes.push([frames[i][0], frames[j][0]]);
      expect(clashes).toEqual([]);
    }
  });

  it('packs into at most 3 atlases', () => {
    expect(atlases.length).toBeGreaterThan(0);
    expect(atlases.length).toBeLessThanOrEqual(3);
  });
});
