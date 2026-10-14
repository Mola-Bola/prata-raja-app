# Crisp / Soak
Purpose: two build axes. Crispy = crits; soggy = splash/AoE elemental; hybrids valid.

## Files
- `src/core/soak.ts` (TAG_CRISP, TAG_SOAK, rotiCrisp), `src/core/stats.ts`, `src/core/cards.ts`, `src/meta/gear.ts` (3 affixes), `src/core/__tests__/soak.test.ts`

## How it works
- Roti crisp tag raises crit; soggy tag adds soak splash; "CRISP!" crackle feedback.
- 4 cards + 3 gear affixes feed the axes. Axes are real stats in the registry.

## Status
Live. Last change 2026-10-14. Training rows hidden until unlocked.

## Research
- Used: [teardown-builds-poe-bl2](../research/teardown-builds-poe-bl2.md) (archetypes), [decomp-rpg-systems](../research/decomp-rpg-systems.md) (cooking/crit).
- Not yet: crit tier table (1-in-N), spec-tree branches by Crisp/Soak/Heat.

## TODO
- Build sheet should show axis sources clearly.

Related: [stat-registry](stat-registry.md), [gear-v2](gear-v2.md), [kannan-level](kannan-level.md), [ui-overlay](ui-overlay.md).
