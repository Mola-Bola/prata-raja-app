# Sim core + hit pipeline
Purpose: deterministic game rules, separate from presentation. Same seed + inputs = same world.

## Files
- `src/core/sim.ts`, `types.ts`, `rng.ts`, `view.ts`, `stats.ts` (rollHit), `autoplay.ts` (bot)
- `src/core/sim/`: `hit.ts` (hitEnemy, killEnemy), `enemies.ts`, `shots.ts`, `throw.ts`, `boss.ts`, `danger.ts`, `ctx.ts`, `spawn.ts`, `free.ts` (free-movement constants + walk/dash)
- Renderer for free mode: `src/game/phaser/{freeKannan,input}.ts` (4-dir walk frames, joystick ring, `FreeInput`), `RunScene.ts` (`?move=free`)
- `src/core/knockback.ts`, `src/content/{enemies,bosses,breads}.ts`

## How it works
- One `rngState` threaded through the tick; presentation reads events and `view.ts`.
- Hit: see Damage pipeline; shield before HP; continuous projectile sweep; per-projectile hit set.
- Knockback is finite and decelerating (experiment, `knockback.ts`).
- Kannan's hurt zone is `FIELD.kannanHitHalfWidth` = 30 u (half-width; was 34, about 12% smaller). It gates enemy shots and boss volleys landing on the counter (`enemies.ts`, `danger.ts`, `boss.ts` tells). Pickup and reach radii are untouched. The drawn sprite is unchanged (`KANNAN_W` 0.54 of width). Balance (300 seeds, `balance.test.ts`): four breads 67%, two breads 48%, solo Kosong 17%; signatures murtabak 23%, appam 18%, roti-bomb 15%; hawker-night boosted four breads 56%. All in band. 26 u (about 24% smaller) pushed four breads to 92%, two breads 88% and solo Kosong 40%, out of band, so it was not kept.
- **Free movement (milestone 1, opt-in).** `content.tune.controlMode: 'counter' | 'free'` (default counter, unchanged; Tune knob `mode.free`, dev URL `?move=free|counter`). Free mode: `RunInput.jx/jy` joystick (+y up the street) and `dodge` (rising edge); Kannan walks `stats.moveSpeed x 0.3` (210 u/s) inside x +-230, y 20..560 (`FIELD.freeMinY/freeMaxY`), auto-throws at the NEAREST pest from his own (x, y) at 0.5 of the throw rate while moving (Multitasker can raise it). Dash: 140 u in 0.18 s along the stick (or facing), i-frames (`hurtPlayer`, contact and enemy shots ignore him), 1.2 s cooldown, event `{t:'dash'}`. Pests chase (x, y) at 1.45 x speed, bite on overlap (`def.radius x 0.7 + 24`), shooters and healers park 0.6 x holdY away and aim at his position (straight shots that fly on and hit by proximity), exploders blast by distance, knockback pushes away from him. Bosses: tells carry `ys`, charge hurts when the body passes over his lane, rain marks are circles, boss hp x1.3. Arena lock (flow chapters): the stall already stops at `bossAt`; no director adds while the boss lives; 1.5 s beat after it parks before its first attack. All free-only numbers live in `FREE` (`sim/free.ts`). Bot: `autoInputFree` kites (stands and throws until pests are within 200 u, else steps to the least risky of 16 directions; dashes when a shot lands or two pests touch). Balance (100 seeds): counter 69/61/23% (4 breads / 2 / solo), free 57/53/24% (100 seeds) with boss fights 31/36/40 s. Not done: HUD (joystick is drawn by the scene, no Dodge button yet; `controls.dodge()` is ready), wave-mode bosses keep adds, thosai bars only roll up the street.
- Bosses: five attack kinds (volley, charge, summon, rain, sweep), phase on HP only.

## Damage pipeline
`damageOf` (`src/core/damage.ts`, called by `rollHit`): base -> conversion (`convertPct`, output capped `CONVERT_CAP` 0.5; the converted share also gets `dotPct`) -> additive increased (`dmgPct` + buff `dmgPct`) -> separate "more" list `moreMuls` (`moreDmg`; add dips/uniques/keystones here) -> crit (`critMult` + buff add) -> pierce falloff (`pierceFalloff` 0.15 per enemy pierced, compounding, floor `PIERCE_FLOOR` 0.4) -> target taken-multiplier. Defaults reproduce the old numbers exactly (`damage.test.ts`). `hitEnemy(..., pierced)` takes the pierce count; `shots.ts` straightHit must pass `st.pierce - s.pierceLeft` to switch falloff on (not yet). Hard cap: `ENEMY_HARD_CAP` 40 live non-boss enemies in `spawnEnemy` (overflow built, never added). Unique hooks (`loadout.hooks`) fire in `hitEnemy`: first hit on a foe freezes it (`_fh` scratch), a crit splashes a flat share (no rng, no re-splash).

## Status
Live. Last change 2026-10-15 (free-movement mode behind a toggle; damage pipeline, hard cap, uniques wired). Before: 2026-10-14 (hurt zone 34 -> 30 u). Tests: `src/core/__tests__/`.

## Research
- Used: [adjacent-mechanics](../research/adjacent-mechanics.md) (damage order, conversion cap, pierce falloff, enemy cap), [decomp-status](../research/decomp-status.md) (uniques hooks), [decomp-scrolling-flow](../research/decomp-scrolling-flow.md) (boss arena lock), [decomp-mechanisms](../research/decomp-mechanisms.md) (sweep, knockback glide), [game-feel](../research/game-feel.md).
- Not yet (see [decomp-status](../research/decomp-status.md)): staged hit pipeline with trace, named RNG streams, crit tiers, stat-stage table, boss Emitter + timeout phases, hit i-frames, flat DT armour.

## TODO
- `hitEnemy` is a monolith; single RNG stream.

Related: [director-flow](director-flow.md), [crisp-soak](crisp-soak.md), [status-vfx](status-vfx.md), [prata-flight](prata-flight.md), [stat-registry](stat-registry.md).
