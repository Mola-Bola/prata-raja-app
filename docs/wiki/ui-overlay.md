# UI overlay, build sheet, tune panel
Purpose: the DOM overlay over Phaser: HUD, stall hub, sheets, build sheet, live tune panel.

## Files
- `src/game/ui/GameUi.tsx` (+css), `RunBuild.tsx`, `Tune.tsx`, `settings.tsx`, `saveStore.ts` (single save writer), `stall/*` (StallHub, Rewards, sheets), `src/game/tuneStore.ts`, `src/ui/*` (brand, theme, palette), `docs/CONTRACTS.md`

## How it works
- Build sheet: glanceable cards, stat bars, pips, chips; text behind info toggles.
- Tune panel (`?tune=1`): knobs generated from content, overlay at run creation; export/import idea open.
- One type scale; colours only in `src/ui/brand.ts`; names via `src/brand.ts`.

## Status
Live. Last change 2026-10-14 (ui-pass readability).

## Research
- Used: [malleable-dev-flow](../research/malleable-dev-flow.md) P2, [game-feel](../research/game-feel.md).
- Not yet: P9 tuning JSON export/import, P10 data hot reload, [owner-refs](../research/owner-refs-2026-10-13.md) menu patterns.

## TODO
- Real-phone pass (notch, haptics, FPS).

Related: [stat-registry](stat-registry.md), [test-kitchen](test-kitchen.md), [kannan-level](kannan-level.md).
