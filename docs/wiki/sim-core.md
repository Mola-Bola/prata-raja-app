# Sim core + hit pipeline
Purpose: deterministic game rules, separate from presentation. Same seed + inputs = same world.

## Files
- `src/core/sim.ts`, `types.ts`, `rng.ts`, `view.ts`, `stats.ts` (rollHit), `autoplay.ts` (bot)
- `src/core/sim/`: `hit.ts` (hitEnemy, killEnemy), `enemies.ts`, `shots.ts`, `throw.ts`, `boss.ts`, `danger.ts`, `ctx.ts`, `spawn.ts`, `free.ts` (free-movement constants + walk/dash)
- Renderer for free mode: `src/game/phaser/{freeKannan,input}.ts` (4-dir walk frames, joystick ring, `FreeInput`), `RunScene.ts`
- `src/core/knockback.ts`, `src/content/{enemies,bosses,breads}.ts`

## How it works
- One `rngState` threaded through the tick; presentation reads events and `view.ts`.
- Hit: see Damage pipeline; shield before HP; continuous projectile sweep; per-projectile hit set.
- Knockback is finite and decelerating (experiment, `knockback.ts`).
- `FIELD.kannanHitHalfWidth` = 30 u now only sizes boss tell lanes and the aim reticle. Pickup and reach radii are untouched. The drawn sprite is unchanged (`KANNAN_W` 0.54 of width). Balance (300 seeds, `balance.test.ts`): four breads 67%, two breads 48%, solo Kosong 17%; signatures murtabak 23%, appam 18%, roti-bomb 15%; hawker-night boosted four breads 56%. All in band. 26 u (about 24% smaller) pushed four breads to 92%, two breads 88% and solo Kosong 40%, out of band, so it was not kept.
- **Free movement (the only mode since 15 Oct night; counter mode, `controlMode`, `?move=` and Tune `mode.free` are deleted).** `RunInput.jx/jy` joystick (+y up the street) and `dodge` (rising edge); Kannan walks `stats.moveSpeed x 0.3` (210 u/s) inside x +-230, y 20..560 (`FIELD.freeMinY/freeMaxY`), auto-throws at the NEAREST pest from his own (x, y) at 0.5 of the throw rate while moving (Multitasker can raise it). Dash: 140 u in 0.18 s along the stick (or facing), i-frames (`hurtPlayer`, contact and enemy shots ignore him), 1.2 s cooldown, event `{t:'dash'}`. Pests chase (x, y) at 1.45 x speed, bite on overlap (`def.radius x 0.7 + 24`), shooters and healers park 0.6 x holdY away and aim at his position (straight shots that fly on and hit by proximity), exploders blast by distance, knockback pushes away from him. Bosses: tells carry `ys`, charge hurts when the body passes over his lane, rain marks are circles, boss hp x1.3. Arena lock (flow chapters): the stall already stops at `bossAt`; no director adds while the boss lives; 1.5 s beat after it parks before its first attack. All free-only numbers live in `FREE` (`sim/free.ts`). Bot: `autoInputFree` kites (stands and throws until pests are within 200 u, else steps to the least risky of 16 directions; dashes when a shot lands or two pests touch). Balance (300 seeds, 4 breads / 2 / solo): counter 57/51/21% (boss 34/35/39 s), free 57/54/25% (boss 31/34/39 s). Final retune: Kosong base cooldown 0.8 -> 0.84 (counter solo had drifted to 30%), `FREE.pestSpeed` 1.31, `bossHp` 1.25, `contactScale` 0.7 (very sensitive: 0.6 gives 74% four breads). Chapter-2 and signature balance tests pin counter content. Not done: HUD (joystick is drawn by the scene, no Dodge button yet; `controls.dodge()` is ready), wave-mode bosses keep adds, thosai bars only roll up the street.
- Bosses: five attack kinds (volley, charge, summon, rain, sweep), phase on HP only.

## Damage pipeline
`damageOf` (`src/core/damage.ts`, called by `rollHit`): base -> conversion (`convertPct`, output capped `CONVERT_CAP` 0.5; the converted share also gets `dotPct`) -> additive increased (`dmgPct` + buff `dmgPct`) -> separate "more" list `moreMuls` (`moreDmg`; add dips/uniques/keystones here) -> crit (`critMult` + buff add) -> pierce falloff (`pierceFalloff` 0.15 per enemy pierced, compounding, floor `PIERCE_FLOOR` 0.4) -> target taken-multiplier. Defaults reproduce the old numbers exactly (`damage.test.ts`). `hitEnemy(..., pierced)` takes the pierce count; `shots.ts` straightHit must pass `st.pierce - s.pierceLeft` to switch falloff on (not yet). Hard cap: `ENEMY_HARD_CAP` 40 live non-boss enemies in `spawnEnemy` (overflow built, never added). Unique hooks (`loadout.hooks`) fire in `hitEnemy`: first hit on a foe freezes it (`_fh` scratch), a crit splashes a flat share (no rng, no re-splash).

## Free-mode feel (r8-feel)
- `sim/crowd.ts`: after pests move, one separation pass (3x3 spatial hash, module-level arrays, array order, no rng) pushes pests apart (`CROWD.sep` x radii, `push` 320 u/s), backs them out of Kannan's body (he is never moved), treats bosses and frozen pests as walls. `aimAt` sends a far pest to a ring point `_th` radians round Kannan (ring widens with distance); `_side` makes a crowded pest slip sideways 0.6 s then rest 0.8 s. Spawn draws `_th`, `_sj` (speed 0.85-1.15) and an x spread (free only).
- Contact is one hit per pest per 0.5 s (dps x 0.5 x `FREE.contactHit`), blocked by dash and `Player.iT`; every landed hit (contact, shot, blast, boss) sets `iT = clamp(0.4 dmg / (0.15 maxHp), 0.2, 0.4)`. A hitting pest bounces back 14 u (tanks do not).
- Throws: target = nearest, within 10 % the one along Kannan's facing; he turns to it while standing; cooldown floor `FREE.cdFloor` 0.3 s.
- Balance: `FREE.contactHit` is the knob (i-frames and spreading made the old dps far too soft).

## Status
Live. Last change 2026-10-15 (free-movement mode behind a toggle; damage pipeline, hard cap, uniques wired). Before: 2026-10-14 (hurt zone 34 -> 30 u). Tests: `src/core/__tests__/`.

## Research
- Used: [adjacent-mechanics](../research/adjacent-mechanics.md) (damage order, conversion cap, pierce falloff, enemy cap), [decomp-status](../research/decomp-status.md) (uniques hooks), [decomp-scrolling-flow](../research/decomp-scrolling-flow.md) (boss arena lock), [decomp-mechanisms](../research/decomp-mechanisms.md) (sweep, knockback glide), [game-feel](../research/game-feel.md).
- Not yet (see [decomp-status](../research/decomp-status.md)): staged hit pipeline with trace, named RNG streams, crit tiers, stat-stage table, boss Emitter + timeout phases, hit i-frames, flat DT armour.

## TODO
- `hitEnemy` is a monolith; single RNG stream.

Related: [director-flow](director-flow.md), [crisp-soak](crisp-soak.md), [status-vfx](status-vfx.md), [prata-flight](prata-flight.md), [stat-registry](stat-registry.md).

## 15 Oct night: counter mode deleted
One control mode. Gone: `controlMode`, `isFree`, `Player.targetX`, `RunInput.targetX/moving`, counter walk/contact/holdAt/shots, `flushContact`, `grantFind`/`swapFind`/`World.find` (only the tiffin pickup remains), the counter bot, `core/view.ts`, and in the renderer `stall.ts`, `street.ts`, `danger.ts`, `hurtZone.ts`, `tehPour.ts`, `DragInput`. Projector is top-down only. Balance retune: see log.
Retune (300 seeds, 4 breads / 2 / solo): main before 43/40/17% (boss 30/33/38 s) -> now 57/56/24% (boss 27/32/40 s). Levers: `FREE.contactHit` 3.5 -> 2.9, `FREE.bossHp` 1.21 -> 1.27, `NEW_ROTI_LEVEL` 3 -> 4 (only multi-roti builds take new rotis). Open: 4-bread boss time 27 s (band 30), and chapter-2 / signature solo tests (previously pinned to counter content) now read 92% / 57% / 47% / 91% in free: need their own retune.
