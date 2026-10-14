# Kannan level, perks, milestones
Purpose: one persistent character level; points go to a spec tree; perks and visitors at intervals.

## Files
- `src/meta/kannan.ts` (level, XP, specPoints, PERKS), `src/meta/milestones.ts` + `src/content/milestones.ts` (levels 5/10/15/20/25), `src/meta/runRewards.ts`, `src/game/ui/stall/StallProgress.tsx`, `Visitor.tsx`, `StallHub.tsx`

## How it works
- Run kills/beats feed Kannan XP; stall level and in-run level removed from UI; save keeps `stallXp` migrated.
- Spec points accrue (`specPoints` = unspent balance) and are spent in the spec tree (`SpecTree.tsx`). Milestone visitors carry small story beats.
- Gear never drops with a level the player cannot meet.

## Status
Level/perks/milestones live; spec tree built (see [spec-tree](spec-tree.md)), dip sockets logic built ([dips-simmer](dips-simmer.md)). Last change 2026-10-15.

## Research
- Used: [story-milestones](../research/story-milestones.md), [teardown-maple-poe](../research/teardown-maple-poe.md).
- Not yet: radial tree schema and node tables ([arpg-refs](../research/arpg-refs.md) section 1), keystones, [decomp-more](../research/decomp-more.md) mastery/jobs.

## TODO
- Hub must mount `SpecTree` (Spec board) and `KopiMeal`; sim `createRun` must copy `loadout.startDips` into `player.dips`.

Related: [story-beats](story-beats.md), [gear-v2](gear-v2.md), [crisp-soak](crisp-soak.md), [login-cloud-save](login-cloud-save.md).
