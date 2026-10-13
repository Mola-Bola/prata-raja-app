# Decelerating knockback experiment

Status: ready for measurement after focused checks; not balanced or release-ready.
Branch `sol/knockback`, baseline `ff15307`, ledger 33. Independent of the parked
boss-slow experiment `codex/polish-combat-1` at `5a4a12e`, which is unchanged.

The old consumer used a constant 600 units/second until pending distance ran out.
The new consumer keeps that cap, then uses constant deceleration of 3000
units/second² through the last 60 units. Its instantaneous speed is
`min(600, sqrt(2 * 3000 * pending))`. The helper integrates this curve analytically
across the cruise/taper boundary. In the taper, remaining distance is
`3000 / 2 * (stopTime - elapsed)²`; a step reaching stopTime writes exactly zero.
There is no exponential tail, overshoot, timer, or new per-enemy state. Adding an
impulse adds pending distance as before and immediately raises speed according
to the same curve. Nonpositive or nonfinite dt consumes no distance.

Scope is the pending-distance consumer only. Bread, dip and revive impulse
calculations retain their existing resistance and boss multipliers. Ordinary
movement, status ticking and AI still run in the same order. MAX_ENEMY_Y still
clips visible displacement and consumes the clipped pending impulse, as before.
Away from that boundary, the shove contribution equals the full pending
distance; a walking enemy's net position also includes ordinary movement.

## Feel tradeoff

This preserves shove distance and maximum speed, not shove duration. Hits of
60 units or more last 0.1 seconds longer than the old consumer. A 120-unit hit
takes 0.3 seconds rather than 0.2; 300 units take 0.6 rather than 0.5. The final
60-unit tail lasts 0.2 seconds. These are initial experiment values, not measured
balance claims.

Short hits start below the speed cap: 40 units start at about 490 units/second
and finish in 0.163 seconds; 12 units start at about 268 and finish in 0.089.
A 4-unit hit finishes in 0.052 seconds (only two updates at 30 Hz), so its easing
may be difficult to see. Without storing the original impulse or velocity,
remaining distance cannot distinguish a short new hit from the tail of a large
hit. This is the deliberate cost of avoiding new enemy state. Added impulses
can raise speed abruptly, and continuous hits may stay near the cap.

Longer shove timing can affect spacing, contact damage and ranged/boss timing
even with equal displacement. It needs the separately scheduled baseline and
after comparison plus a Kitchen feel check before integration/shipping.

## Focused verification

- `./node_modules/.bin/vitest run src/core/__tests__/knockback.test.ts --maxWorkers=1`
  passes 18 tests: exact zero completion and full distance for 4/12/40/120/300
  units at 30/60 Hz, declining step displacement before the final clipped step,
  timestep subdivision equivalence, active impulse addition, stationary-enemy
  integration, resistance/boss application, zero/invalid dt, large dt and clamp.
- `./node_modules/.bin/tsc --noEmit` passes.
- No full suite, check.sh, 300-seed run, web export, browser test or release ran.
  The lead requested lightweight checks while two validation jobs and low disk
  space constrain the machine. Do not treat this as a pinned pipeline result.
- Pending: lead-scheduled baseline and after 300-seed comparisons using identical
  seeds/build inputs, independent review, and player feel verification.
