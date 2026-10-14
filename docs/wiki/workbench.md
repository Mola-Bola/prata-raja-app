# Workbench (drag and drop in the hub panels)

Status: built on branch claude/r8-bench (milestone 4 of docs/plans/round8-fusion.md). Last change: 2026-10-15.

Pointer-based drag and drop (touch + mouse, no library) inside the hub station panels. Drag helper `useDnD` (ghost follows the
finger, targets grown to at least 72 px and lit on hover, snap-back on a miss; touch needs a 180 ms hold so the panel still
scrolls) and `useUndo` (every drop shows an "Undo" toast for 5 s; undo = `commit(() => previousSave)`, so it also rolls back
anything committed in between; the toast goes if the panel closes).

- Gear rack, Forge tab: drag gear onto the hot tawa = `enhance` (cost shown first; unaffordable shakes and refuses), `playSfx('enhance')`. Reroll stays a button, plus a tap-able Enhance button.
- Dip shelf, Katori tab: start roti (Signature, else Kosong) with its sockets; drag a dip in (`socket` sfx), drag out onto the shelf to empty, "+1 katori" at the forge cost (sockets.ts). Tap a dip then a socket also works.
- Dip shelf, Curry pot tab: two dips in the pot. A known pair is discovered once (src/meta/fusion.ts, `fusions: string[]` on the save, `fuse` sfx); unknown pair fizzles ("Not a match") and nothing is spent (dips are never consumed). Discovery grid shows ??? until found.
- Tawa, Tiffin tab: 3 slots. Slot 1 = start roti (Signature, the only roti a run starts with); slots 2-3 pack extra rotis (`tiffin: string[]`, max 2). Packed rotis do not change the run yet.
- Dip shelf, Collection tab: the old DipCollection.

Fusion recipes (reward: one-time +60 dip-simmer XP to the recipe's simmer dip; never pay-to-win, no stat, no repeat farming):
mint chutney + dhal (Cooling dhal), fish curry + sambal, condensed milk + teh tarik (Sweet pull), masala + ghee (Golden masala),
mutton + chicken curry (Double curry), mint chutney + condensed milk (Cool cream).

Files: src/game/ui/hub/workbench/{drag.tsx,shared.tsx,GearBench.tsx,DipBench.tsx,PotBench.tsx,TiffinBench.tsx,workbench.css} (+ __tests__),
HubOverlay.tsx (tab wiring), src/meta/fusion.ts, `migrateMeta` in src/meta/migrate.ts (fusions, tiffin), types.ts, e2e/web/workbench.spec.ts.

Gaps: no multi-roti runs; fusion reward is XP only; undo restores the whole previous save.

Research used: docs/research/decomp-rpg-systems.md (Kinstone fusion as a discovery collection), docs/research/teardown-ballpit-terraria.md (fusion, reforging as enhance).
