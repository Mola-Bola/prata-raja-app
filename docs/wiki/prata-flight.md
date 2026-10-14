# Prata flight
Purpose: how thrown breads move and hit (the main weapon feel).

## Files
- `src/core/sim/throw.ts` (spawn per bread, bombs arc to predicted position), `shots.ts` (steer, pierce, hop, orbit, wave bar), `src/core/signature.ts`, `src/meta/signature.ts`, `src/content/breads.ts`
- Render: `src/game/phaser/actors.ts`, `look.ts` (LOB_ARC), `thosaiTexture.ts`

## How it works
- Per-bread kinds: pierce, bounce (Appam), homing (turn-rate limit), orbit, returning, Roti Bomb / Naan lobs with blast radius.
- Signature = persistent main roti; tags drive dip links.
- Experiment: "Flaky Kosong" kitchen variant (default off); Thosai roll toasted texture.

## Status
Live. Last change 2026-10-14 (Thosai roll texture); signatures 2026-10-13.

## Research
- Used: [decomp-mechanisms](../research/decomp-mechanisms.md) (sweep, hit sets).
- Not yet: homing arm time / min distance, accelerating shockwave, roti flakes (PLAN-2 #14), [decomp-more](../research/decomp-more.md) sockets/mastery.

Related: [sim-core](sim-core.md), [dips-simmer](dips-simmer.md), [test-kitchen](test-kitchen.md), [audio-sfx](audio-sfx.md). Design: [BUILDS](../BUILDS.md).
