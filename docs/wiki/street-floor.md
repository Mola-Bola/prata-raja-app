# Street floor + props
Purpose: the scrolling street the stall travels through (perspective ground, parallax, set dressing).

## Files
- `src/game/phaser/street.ts`, `look.ts`, `layout.ts`, `RunScene.ts`, `stall.ts` (counter, Kannan poses), `tex.ts`, `thosaiTexture.ts`
- `src/content/chapters.ts` (`chapter.floor`, places)

## How it works
- Scanline-table perspective ground plane (cached) over the painted street, driven by `world.dist`; per-place tiled floor (pavers / hawker tiles), haze into paint.
- Roadside props per chapter exist but are switched off (stools looked like floating stickers).
- URL switches for review: `?chapter=<id>&at=<m>&god=1` (dev only).

## Top-down street (free movement, the default)
- `topStreet.ts`: one scrolling world from the Codex street kit (`assets/game/street/top/<kit>-{road,left-1,left-2,right-1,right-2}.webp`, loose textures): road TileSprite spanning the walkable width, shopfront strips (recycled sprites) alternating 1/2 along both edges, a few seeded kerb props. Chapter -> kit table lives at the top of the file.
- `Projector.top` (layout.ts): in free runs field -> screen is orthographic (no depth, `Layout.top` = road/strip widths, ppu, ppuY, groundY); every sprite already goes through the projector, so enemies, shots and telegraphs follow.
- The painted backdrop, counter strip and counter slots are hidden in free mode (`Stall.setTop`): the counter art is seen from behind and breaks a top-down view. Counter mode (`?move=counter`) keeps the perspective street below.

## Status
Top-down street live for free runs (kopitiam, hawker-centre kits; pasar-malam, wet-market, food-street mapped for later chapters). Perspective floor kept for counter mode; its props stay retired. Last change 2026-10-15 (r8-street).

## Research
- Used: [decomp-scrolling-flow](../research/decomp-scrolling-flow.md) (perspective road, scanline table).
- Not yet: camera dead zone with capped step, fixed per-layer parallax ratios, eased horizon, speed-boost energy gate; [hawker-culture](../research/hawker-culture.md) set dressing per place.

## TODO
- Props need grounding (shadows, floor-aligned) before re-enabling.
- Real-phone FPS unchecked.

Related: [director-flow](director-flow.md), [ops-ship](ops-ship.md) (snap tour), [status-vfx](status-vfx.md).
