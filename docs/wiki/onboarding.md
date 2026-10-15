# Onboarding (first 15 minutes)
Purpose: a new player always sees one next step; stations open run by run; the first three runs never end in a loss screen.

## Files
- `src/meta/onboarding.ts` (`stationState`, `nextStep`; pure, from the save), `src/meta/__tests__/onboarding.test.ts`
- Hub: `src/game/ui/hub/HubOverlay.tsx` (locked panel line, GO pill line, hides tabs the player has not met), `src/game/phaser/HubScene.ts` (dimmed locked signs with padlock + reason, one pulse), event `hubGuide` in `src/game/hub.ts`
- Results: `Results` in `src/game/ui/GameUi.tsx`; `progress().label` in `src/game/ui/stall/helpers.ts` (no unmet names)

## How it works
- Open after: Rotis and Street from the start; Pantry and Dips after run 1; Orders run 2; Gear and Kopi run 3; Spec run 5 (or as soon as the player holds spec points).
- `nextStep` order: unopened chest (Pantry), a dip with empty sockets (Dips), spec points (Spec), unworn gear, affordable training, a cookable meal (Kopi), else Street until run 5, then null. One pulse (sign glow, halo, bob; static under reduced motion; GO glows when it is the Street) plus its line in the pill by GO. It moves only when the save changes.
- Runs 1-3 (`before.runs < 3`): a lost run reads "Tough crowd! You kept N tips." (or "A quick one!"), pays as normal, shows the guide's next step instead of the unlock list, and no tip.
- Tabs behind a closed flag or too few runs (Curry pot, All dips, Tip jar, Calendar: run 3) are hidden, not shown locked.

## Status
Live on branch claude/r8-onboard. Last change 2026-10-15. Not done: the "20 s" pulse timeout and scripted run 2/3 content from the research script (no balance changes). Research: [onboarding](../research/onboarding.md).
