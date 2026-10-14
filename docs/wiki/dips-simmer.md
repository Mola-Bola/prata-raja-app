# Dips + simmer
Purpose: dips are gem-like supports linked to a roti; simmer = earned levels; collection UI.

## Files
- `src/content/dips.ts`, `src/core/dipLinks.ts` (families, link bonuses gated by roti tags), `src/core/dipProgression.ts`, `src/meta/dipProgression.ts`, `src/game/ui/stall/DipCollection.tsx`

## How it works
- Dip levels/tiers in data rows; linked combos by family; simmer earned through play.
- Themed effects: mint chills/freezes, curry spicy DoT, masala sneeze.

## Status
Live. Last change 2026-10-14 (earned linked simmer + collection).

## Research
- Used: [teardown-builds-poe-bl2](../research/teardown-builds-poe-bl2.md) (links/supports).
- Not yet: trigger/param rows ([decomp-status](../research/decomp-status.md) #1), socket system ([decomp-more](../research/decomp-more.md)), [arpg-refs](../research/arpg-refs.md) gems.

## TODO
- Dip sockets (no link-slot system yet).

Related: [prata-flight](prata-flight.md), [status-vfx](status-vfx.md), [gear-v2](gear-v2.md), [BUILDS](../BUILDS.md).
