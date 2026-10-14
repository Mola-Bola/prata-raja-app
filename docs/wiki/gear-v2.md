# Gear v2, uniques, materials, enhance
Purpose: crafted ARPG gear: seeded items, affix bands, uniques, kill-drop materials, hawker-themed enhancing.

## Files
- `src/meta/gear.ts` (rollItem, AFFIX_POOLS, upgradeItem, forge/merge3), `uniques.ts`, `recipes.ts`, `chests.ts`, `loadout.ts`, `types.ts`; tests `gearV2.test.ts`, `gear.test.ts`
- `src/meta/gear.ts.bak` is a leftover (see [stale-code](stale-code.md))

## How it works
- Item {seed, ilvl, v}; affixes drawn from an ilvl/2..ilvl window with value bands; unique hooks consumed in `sim/hit.ts`.
- Materials (flour, ghee, onion, masala...) drop on kills; enhance in hawker theme.
- Never pay-to-win; no level-gated drops.

## Status
Live. Last change 2026-10-14. Stall bench (PLAN-2 #10) status: check code before assuming.

## Research
- Used: [decomp-mechanisms](../research/decomp-mechanisms.md) (devilution), [teardown-builds-poe-bl2](../research/teardown-builds-poe-bl2.md).
- Not yet: cursed pool, per-kill drop table, [decomp-rpg-systems](../research/decomp-rpg-systems.md) kinstone fusion and goods bands, [arpg-refs](../research/arpg-refs.md) crafting.

Related: [kannan-level](kannan-level.md), [dips-simmer](dips-simmer.md), [crisp-soak](crisp-soak.md), [fair-monetisation](../research/fair-monetisation.md).
