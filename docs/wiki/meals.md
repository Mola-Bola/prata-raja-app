# Pre-run meals
Purpose: Kopi uncle cooks one meal from pantry materials; one buff for the NEXT run (Monster Hunter canteen).

## Files
- `src/meta/meals.ts` (5 meals, cookMeal, mealLabel), `src/game/ui/meal/KopiMeal.tsx`, `runRewards.ts` (meal cleared when a run ends, paid or not), `loadout.ts` (stats + `mealId`).

## How it works
- Meals: Kopi-O kosong (+70 move speed), Teh halia (+0.5 regen), Mee goreng (+30 max HP), Roti telur (+8% damage), Cendol (+10% XP). Costs are existing materials.
- Save: `meal: { id } | null`. One meal waits at a time. `mealLabel(save)` feeds the GO pill / HUD chip.

## Status
Logic, tests and screen done; hub mount and HUD chip pending. Last change 2026-10-15.

## Research
- Used: [hub-design](../research/hub-design.md) (MH canteen meal).

Related: [kannan-level](kannan-level.md), [stat-registry](stat-registry.md).
