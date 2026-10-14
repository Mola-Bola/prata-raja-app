# Gear v2, uniques, materials, enhance
Purpose: crafted ARPG gear: seeded items, affix bands, uniques, kill-drop materials, hawker-themed enhancing.

## Files
- `src/meta/gear.ts` (rollItem, AFFIX_POOLS, upgradeItem, forge/merge3), `uniques.ts`, `recipes.ts`, `chests.ts`, `loadout.ts`, `types.ts`; tests `gearV2.test.ts`, `gear.test.ts`
- `src/meta/gear.ts.bak` is a leftover (see [stale-code](stale-code.md))

## How it works
- Item {seed, ilvl, v}; affixes drawn from an ilvl/2..ilvl window with value bands; unique hooks consumed in `sim/hit.ts`.
- Materials (flour, ghee, onion, masala...) drop on kills; enhance in hawker theme.
- Never pay-to-win; no level-gated drops.

## Forge bench (15 Oct 2026)
- `src/game/ui/stall/Forge.tsx`, opened by the hub's "Forge" button. Pick gear (grouped by slot; uniques get a gold border + rule text), see current -> next stats, cost chips (red when short), "Enhance +N". Never destroys; hammer + spark animation and crit/coin sfx, off under reduced motion.
- `rerollAffix` / `rerollCost` in `gear.ts`: rerolls one affix in the ilvl window, salted by uid + `item.rerolls` (kept by migrate), other affixes kept, no duplicate affix ids. Cost: 20+10*ilvl coins and 1+floor(ilvl/8) masala.
- Material art: masala/chilli/curryLeaves are Codex icons (were spice copies); shown in forge cost rows and the results payout.
- Unique hooks are live: `computeLoadout` puts `activeHooks(save)` in `loadout.hooks`; `sim/hit.ts` applies crit splash (towel 50% / 90 u, clogs 30% / 140 u) and first-hit freeze (thali 1.5 s, per foe). Tests in `damage.test.ts`. The forge only shows the rule text.

## Status
Live. Last change 2026-10-14. Stall bench (PLAN-2 #10) status: check code before assuming.

## Research
- Used: [decomp-mechanisms](../research/decomp-mechanisms.md) (devilution), [teardown-builds-poe-bl2](../research/teardown-builds-poe-bl2.md).
- Used in the forge: [decomp-rpg-systems](../research/decomp-rpg-systems.md) BotW cooking (per-ingredient step costs; "failure is still an item" -> enhance never destroys; its crit roll skipped, enhance stays deterministic); [decomp-more](../research/decomp-more.md) D2 sockets (rework one slot -> single-affix reroll).
- Not yet: cursed pool, per-kill drop table, decomp-rpg-systems kinstone fusion and goods bands, [arpg-refs](../research/arpg-refs.md) crafting.

Related: [kannan-level](kannan-level.md), [dips-simmer](dips-simmer.md), [crisp-soak](crisp-soak.md), [fair-monetisation](../research/fair-monetisation.md).
