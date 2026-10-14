# Spec tree
Purpose: spend banked Kannan spec points on Crisp / Soak / Heat branches and an inner Body / Hands ring.

## Files
- `src/meta/specTree.ts` (node table, canAllocate/allocate/respec/specStats), `src/game/ui/spec/SpecTree.tsx` + `.css` (also styles `src/game/ui/meal/KopiMeal.tsx`), migration `migrateMeta` in `src/meta/migrate.ts`, applied in `src/meta/loadout.ts`.

## How it works
- 24 nodes: ring Body 3 + Hands 3; per branch 4 small (1 pt), 1 notable (2 pt), 1 keystone (3 pt). A node needs all of its `needs`; branch roots hang off the ring.
- Keystones: Golden Edge (Crisp), Monsoon (Soak), Tandoor blaze (Heat). Lock: ONE keystone in total (archetype lock); Reset all (confirm step, away from Learn) refunds every point.
- Save: `spec: { nodes }`; `specPoints` is the unspent balance, but on load it is DERIVED: `max(0, level-1 - spent(validNodes))` via `settleSpec` (nodes kept in order while needs, one-keystone and budget hold). Level is the only source of points, so a stored balance, cost edits or bad node lists can never mint or burn points. All stats are registry stats, added to the Loadout.
- Training is untouched (gold, 5 steps); the ring reuses the same stats with `spec` grants, so it is extra, not a replacement.

## Status
Done and mounted in the hub (`embedded`: no own header or Close). Screen: Core / Crisp / Soak / Heat tabs, each a vertical path of cards (icon, name, effect, cost, "Needs X" when locked); the tapped card expands in place with Learn (N), scrolled above GO; keystones are bigger with a gold frame. Looked at 390x844. Last change 2026-10-15 (r8-spec2).

## Research
- Used: [adjacent-mechanics](../research/adjacent-mechanics.md) (6 archetype lock, 7 prerequisites), [teardown-maple-poe](../research/teardown-maple-poe.md) (tree, notable/keystone).

Related: [kannan-level](kannan-level.md), [stat-registry](stat-registry.md), [crisp-soak](crisp-soak.md).
