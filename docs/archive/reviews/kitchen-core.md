# Test Kitchen core

Branch: `sol/kitchen-core`.

`src/core/kitchen.ts` exports `KitchenConfig`, `KitchenTuning`, defaults, numeric bounds, bread/dip/link caps, `KITCHEN_LINKABLE_DIPS`, `kitchenBreadLevelCap`, `createKitchenRun(config, content)` and `applyKitchenTuning(world, fullTuning)`.

The sandbox uses existing content and ordinary simulation steps. `startRunWave` begins a fresh world at the actual chapter wave, preserving the chapter array, HP scaling, budget, boss spawn and seeded RNG. Normal `createRun` is unchanged. The build is detached from the input config; no save/progression/reward module is imported.

Up to four distinct bread families and four distinct dips are allowed. Base breads use levels 1–5; evolved breads use level 1. At most two links are allowed, only for the existing fish curry / condensed milk / mint mechanics. Other dips remain available for all breads. No fictional target behavior, new gem tiers, gear or drinks are added.

Tuning is absolute: max HP, damage multiplier, throw-rate multiplier, critical probability and moving-fire fraction. Reapplying the same values does not compound; max-HP changes preserve the current health fraction, including zero health. Finite inputs clamp to exported bounds; non-finite inputs fail without mutating the world. XP is disabled in the sandbox stats, so normal `step` cannot interrupt the chosen build with random level-up offers. The renderer must route kitchen results separately and never apply normal run rewards.

Validation: 24 focused kitchen tests passed. `SKIP_DB=1 bash scripts/check.sh` passed typecheck, lint, brand lint and all 853 tests across 63 files. Recovered complete check logs at `/tmp/prata-kitchen-core-check.log` and `/tmp/prata-kitchen-core-check/`; no duplicate run needed.
Balance: no ordinary tuning changed; 300-seed comparison not run for this additive sandbox API.
