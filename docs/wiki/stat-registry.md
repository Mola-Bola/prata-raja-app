# Stat registry
Purpose: one source of truth for every stat (label, unit, group, source); training rows and sheets are generated from it.

## Files
- `src/core/statRegistry.ts`, `src/core/stats.ts`, `src/core/__tests__/statCoverage.test.ts`, `src/meta/training.ts`, `src/game/ui/RunBuild.tsx`

## How it works
- Add a stat once; coverage test fails if sim/gear/training miss it.
- Principle: every axis is a real stat with clear sources and shows on the stat sheet (owner).

## Status
Live. Last change 2026-10-14.

## Research
- Used: [malleable-dev-flow](../research/malleable-dev-flow.md) P1 (numbers in data).
- Not yet: derived stats and flat armour DT ([decomp-status](../research/decomp-status.md)), [arpg-refs](../research/arpg-refs.md) parse-free affix definitions.

Related: [crisp-soak](crisp-soak.md), [training](training.md), [gear-v2](gear-v2.md), [ui-overlay](ui-overlay.md).
