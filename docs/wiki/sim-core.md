# Sim core + hit pipeline
Purpose: deterministic game rules, separate from presentation. Same seed + inputs = same world.

## Files
- `src/core/sim.ts`, `types.ts`, `rng.ts`, `view.ts`, `stats.ts` (rollHit), `autoplay.ts` (bot)
- `src/core/sim/`: `hit.ts` (hitEnemy, killEnemy), `enemies.ts`, `shots.ts`, `throw.ts`, `boss.ts`, `danger.ts`, `ctx.ts`, `spawn.ts`
- `src/core/knockback.ts`, `src/content/{enemies,bosses,breads}.ts`

## How it works
- One `rngState` threaded through the tick; presentation reads events and `view.ts`.
- Hit: see Damage pipeline; shield before HP; continuous projectile sweep; per-projectile hit set.
- Knockback is finite and decelerating (experiment, `knockback.ts`).
- Kannan's hurt zone is `FIELD.kannanHitHalfWidth` = 30 u (half-width; was 34, about 12% smaller). It gates enemy shots and boss volleys landing on the counter (`enemies.ts`, `danger.ts`, `boss.ts` tells). Pickup and reach radii are untouched. The drawn sprite is unchanged (`KANNAN_W` 0.54 of width). Balance (300 seeds, `balance.test.ts`): four breads 67%, two breads 48%, solo Kosong 17%; signatures murtabak 23%, appam 18%, roti-bomb 15%; hawker-night boosted four breads 56%. All in band. 26 u (about 24% smaller) pushed four breads to 92%, two breads 88% and solo Kosong 40%, out of band, so it was not kept.
- Bosses: five attack kinds (volley, charge, summon, rain, sweep), phase on HP only.

## Damage pipeline
`damageOf` (`src/core/damage.ts`, called by `rollHit`): base -> conversion (`convertPct`, output capped `CONVERT_CAP` 0.5; the converted share also gets `dotPct`) -> additive increased (`dmgPct` + buff `dmgPct`) -> separate "more" list `moreMuls` (`moreDmg`; add dips/uniques/keystones here) -> crit (`critMult` + buff add) -> pierce falloff (`pierceFalloff` 0.15 per enemy pierced, compounding, floor `PIERCE_FLOOR` 0.4) -> target taken-multiplier. Defaults reproduce the old numbers exactly (`damage.test.ts`). `hitEnemy(..., pierced)` takes the pierce count; `shots.ts` straightHit must pass `st.pierce - s.pierceLeft` to switch falloff on (not yet). Hard cap: `ENEMY_HARD_CAP` 40 live non-boss enemies in `spawnEnemy` (overflow built, never added). Unique hooks (`loadout.hooks`) fire in `hitEnemy`: first hit on a foe freezes it (`_fh` scratch), a crit splashes a flat share (no rng, no re-splash).

## Status
Live. Last change 2026-10-15 (damage pipeline, hard cap, uniques wired). Before: 2026-10-14 (hurt zone 34 -> 30 u; blast damage cues, picks counter). Tests: `src/core/__tests__/`.

## Research
- Used: [adjacent-mechanics](../research/adjacent-mechanics.md) (damage order, conversion cap, pierce falloff, enemy cap), [decomp-status](../research/decomp-status.md) (uniques hooks), [decomp-mechanisms](../research/decomp-mechanisms.md) (sweep, knockback glide), [game-feel](../research/game-feel.md).
- Not yet (see [decomp-status](../research/decomp-status.md)): staged hit pipeline with trace, named RNG streams, crit tiers, stat-stage table, boss Emitter + timeout phases, hit i-frames, flat DT armour.

## TODO
- `hitEnemy` is a monolith; single RNG stream.

Related: [director-flow](director-flow.md), [crisp-soak](crisp-soak.md), [status-vfx](status-vfx.md), [prata-flight](prata-flight.md), [stat-registry](stat-registry.md).
