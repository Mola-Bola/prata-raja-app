# Decelerating knockback experiment

Status: 300-seed balance gates pass; independent review and visible feel inspection
remain pending. Not release-ready.
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
even with equal displacement. The measurements below show a small Murtabak
signature win reduction, so equal displacement does not mean identical balance.
A Kitchen feel check and independent review remain required before claiming
that the deceleration feels better. There is no real-phone feel proof.

## Measured comparison

The lead ran the existing five balance tests with 300 seeds (1–300) for baseline
`3adfbb9` in `prata-raja-stall-layout` and after `f8834df` in this worktree.
Both completed successfully: baseline 83.09 seconds, after 85.64 seconds.
The baseline has the same `src/core` and `src/content` as this experiment's
`ff15307` base and live `e060e3a`; the source diffs are empty. The baseline/after
reports use the same seeds, builds and policies.

Evidence is in the common Git directory `.git/knockback-verification/`:
`baseline-with-report.log`, `after-with-report.log`, and the `baseline.md*` /
`after.md*` report files. `measurement.json` is an earlier manifest still marked
`running`; the completed report logs establish the result, not that stale status.

| Policy | Baseline | After | Observation |
| --- | --- | --- | --- |
| Chapter 1, up to four breads | 56% | 56% | Rounded report metrics identical |
| Chapter 1, up to two breads | 44% | 44% | Rounded report metrics identical |
| Chapter 1, solo Kosong | 21% | 21% | Rounded report metrics identical |
| Chapter 2, four breads | 190/300 | 190/300 | Median wave 10 unchanged |
| Chapter 2, two breads | 107/300 | 107/300 | Median wave 10 unchanged |
| Chapter 2, solo Kosong | 36/300 | 36/300 | Median wave 6 unchanged |
| Murtabak signature solo | 33/300 (11.0%) | 30/300 (10.0%) | Three fewer wins; median wave 9 unchanged |
| Bomb signature solo | 63/300 (21.0%) | 63/300 (21.0%) | Median wave 10 unchanged |
| Appam signature solo | 49/300 (16.3%) | 50/300 (16.7%) | One additional win; median wave 10 unchanged |

All configured gates pass. Murtabak now sits exactly at the allowed band's
10% lower bound, with no remaining margin at that bound. The comparison shows
a timing-sensitive tradeoff, not evidence of a distance-consumption bug or
identical balance. No retuning was made to improve the bands. Rounded Chapter 1
reports alone cannot establish that every underlying run/result is identical.

## Focused verification

- `./node_modules/.bin/vitest run src/core/__tests__/knockback.test.ts --maxWorkers=1`
  passes 18 tests: exact zero completion and full distance for 4/12/40/120/300
  units at 30/60 Hz, declining step displacement before the final clipped step,
  timestep subdivision equivalence, active impulse addition, stationary-enemy
  integration, resistance/boss application, zero/invalid dt, large dt and clamp.
- `./node_modules/.bin/tsc --noEmit` passes.
- The worker ran only focused tests and typecheck; the lead subsequently ran the
  baseline/after 300-seed comparisons recorded above. No full suite, check.sh,
  web export, browser test or release is claimed here. This report is not a
  pinned pipeline result.
- Pending: lead release gates, independent review and visible player feel
  verification. Balance gates alone cannot establish improved feel.
