# Dips + simmer
Purpose: dips are gem-like supports linked to a roti; simmer = earned levels; collection UI.

## Files
- `src/content/dips.ts`, `src/core/dipLinks.ts` (families, link bonuses gated by roti tags), `src/core/dipProgression.ts`, `src/meta/dipProgression.ts`, `src/game/ui/stall/DipCollection.tsx`

## How it works
- Dip levels/tiers in data rows; linked combos by family; simmer earned through play.
- Themed effects: mint chills/freezes, curry spicy DoT, masala sneeze.

## Status
Live. Sockets logic built 2026-10-15 (`src/meta/sockets.ts`, no screen yet; sim must copy `loadout.startDips`). Last change 2026-10-15.

## Research
- Used: [teardown-builds-poe-bl2](../research/teardown-builds-poe-bl2.md) (links/supports).
- Used: [decomp-more](../research/decomp-more.md) (sockets). Sockets: 1-3 per roti (`BASE_SOCKETS`), Kannan L10 mastery +1, forge +1 (400 gold + 3 ghee), cap 3; save `sockets: Record<breadId,(dipId|null)[]>`; the start roti's socketed dips start the run via `Loadout.startDips`.
- Not yet: trigger/param rows ([decomp-status](../research/decomp-status.md) #1), [arpg-refs](../research/arpg-refs.md) gems.

## TODO
- Sockets screen (pick a roti, tap a katori, choose a dip).

Related: [prata-flight](prata-flight.md), [status-vfx](status-vfx.md), [gear-v2](gear-v2.md), [BUILDS](../BUILDS.md).
