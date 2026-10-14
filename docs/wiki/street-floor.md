# Street floor + props
Purpose: the scrolling street the stall travels through (perspective ground, parallax, set dressing).

## Files
- `src/game/phaser/street.ts`, `look.ts`, `layout.ts`, `RunScene.ts`, `stall.ts` (counter, Kannan poses), `tex.ts`, `thosaiTexture.ts`
- `src/content/chapters.ts` (`chapter.floor`, places)

## How it works
- Scanline-table perspective ground plane (cached) over the painted street, driven by `world.dist`; per-place tiled floor (pavers / hawker tiles), haze into paint.
- Roadside props per chapter exist but are switched off (stools looked like floating stickers).
- URL switches for review: `?chapter=<id>&at=<m>&god=1` (dev only).

## Status
Floor live; props retired-for-now. Last change 2026-10-14 (floor polish, props off).

## Research
- Used: [decomp-scrolling-flow](../research/decomp-scrolling-flow.md) (perspective road, scanline table).
- Not yet: camera dead zone with capped step, fixed per-layer parallax ratios, eased horizon, speed-boost energy gate; [hawker-culture](../research/hawker-culture.md) set dressing per place.

## TODO
- Props need grounding (shadows, floor-aligned) before re-enabling.
- Real-phone FPS unchecked.

Related: [director-flow](director-flow.md), [ops-ship](ops-ship.md) (snap tour), [status-vfx](status-vfx.md).
