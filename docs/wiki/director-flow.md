# Director / flow
Purpose: continuous pressure-driven enemy flow over run distance, replacing waves (Direction 2.0).

## Files
- `src/core/director.ts` (+ `__tests__/director.test.ts`), `src/core/sim/spawn.ts`, `src/content/chapters.ts` (beats, bossAt), `src/core/waves.ts` (legacy, kitchen only).

## How it works
- Pressure curve over `world.dist` metres; weighted mix with budget-per-second, `ENEMY_COST` from waves.ts.
- CREDIT_CAP / LIVE_CAP (8) bound threat; bosses/elites fire at chapter beats.
- Spawn lanes: ahead and sides.
- Stall speed rises with pressure (owner answer).

## Status
Live. Last change 2026-10-14 (flow-balance retune: gentler hp scaling, stronger bosses).

## Research
- Used: [decomp-mechanisms](../research/decomp-mechanisms.md) (spawn budget), [teardown-vs-brotato-oss](../research/teardown-vs-brotato-oss.md) (pacing).
- Not yet: attack tokens for melee/shooters (decomp-status #5), spawn window by camera position and proximity spawner with cooldown ([decomp-scrolling-flow](../research/decomp-scrolling-flow.md)), boss-lock state machine.

## TODO
- No attack tokens; packs have no leader trail.
- Route shape: linear with 1-2 forks later (not built).

Related: [sim-core](sim-core.md), [story-beats](story-beats.md), [street-floor](street-floor.md), [test-kitchen](test-kitchen.md). Plan: [PLAN-2](../PLAN-2.md).
