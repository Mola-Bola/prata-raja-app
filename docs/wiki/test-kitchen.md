# Test Kitchen
Purpose: sandbox to try any roti, dips/tiers and spawn modes with live numbers; home of experiments.

## Files
- `src/core/kitchen.ts`, `src/game/ui/Kitchen.tsx` (+css), `src/core/waves.ts` (`waves` mode), tests `kitchen.test.ts`, `flakyPrata.test.ts`

## How it works
- Fixed-spawn and waves modes; limits KITCHEN_MAX_BREADS/DIPS/LINKED_DIPS; experiments (Flaky Kosong, finite knockback) default off.
- Principle: toggles for experiments, not code branches in the sim.

## Status
Live. Last change 2026-10-14.

## Research
- Used: [malleable-dev-flow](../research/malleable-dev-flow.md) P2/P4.
- Not yet: P3 headless per-build balance sims, P5 per-tick state hash.

Related: [ui-overlay](ui-overlay.md), [director-flow](director-flow.md), [prata-flight](prata-flight.md).
