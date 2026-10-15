# UI overlay, build sheet, tune panel
Purpose: the DOM overlay over Phaser: HUD, stall hub, sheets, build sheet, live tune panel.

## Files
- `src/game/ui/run/FreeRunHud.tsx` (+css): the free-movement run HUD (round 8 milestone 2), the only run HUD (counter HUD and the swap toast are gone).
- `src/game/ui/GameUi.tsx` (+css), `RunBuild.tsx`, `Tune.tsx`, `settings.tsx`, `saveStore.ts` (single save writer), `bestRun.ts` (best metres, a UI pref not the save), `stall/*` (Rewards, sheets; the old StallHub menu is deleted), `src/game/tuneStore.ts`, `src/ui/*` (brand, theme, palette), `docs/CONTRACTS.md`

## How it works
- Build sheet: glanceable cards, stat bars, pips, chips; text behind info toggles.
- Free run HUD (`?move=free`): top bar = level ring + HP | place and metres-to-boss (or boss) | coins + pause, thin XP line, meal chip (`HudState.meal`), dip-socket readouts and a 1.2 s Dodge cooldown bottom-right; bottom-left empty for the renderer's joystick. Hint: "Drag anywhere to move · auto-throw" for 3 s per run. Reduced motion: no pulse, no sweep, no hurt shake.
- Flow (r8-flow): Title (logo, Start/Continue + "Best N m · chapter", tiny version; Intro lives in hub Settings > Replay the story) -> run 1 -> Results -> hub. Hub Settings holds Replay the story, Test Kitchen (exits to the hub, setup sheet closed by default) and Tune. After run 1 (`save.runs === 1`) exactly one target glows: the GO pill (`hb-go[data-next]`, a drop-shadow glow so its box never moves) with a one-line pill. A station with nothing open shows one plain line (`lockLine`), not tabs; dead UI is hidden (tiffin slots 2-3, Special tab, "Known recipe" button).
- Pause: Resume (go), Build & stats, Settings (switches, Tell Kannan, Tune), End run (asks once: End run / Keep going). Results: one headline, metres hero number, at most three rewards (coins, Kannan XP bar, one loot chip), one "Next:" line, a Details expander (kills, run level, ingredients, simmer receipts, tip), Daydream again (go) + Back to stall (plain); fits 360 x 640 without scrolling when collapsed.
- Tune panel (`?tune=1`): knobs generated from content, overlay at run creation; export/import idea open.
- One type scale; colours only in `src/ui/brand.ts`; names via `src/brand.ts`.

## Status
Live. Last change 2026-10-15 (r8-flow: GameUi.css on the UI system, old stall menu deleted, new pause/results/title).

## Research
- Used: [malleable-dev-flow](../research/malleable-dev-flow.md) P2, [game-feel](../research/game-feel.md).
- Not yet: P9 tuning JSON export/import, P10 data hot reload, [owner-refs](../research/owner-refs-2026-10-13.md) menu patterns.

## TODO
- Real-phone pass (notch, haptics, FPS).

Related: [stat-registry](stat-registry.md), [test-kitchen](test-kitchen.md), [kannan-level](kannan-level.md).
