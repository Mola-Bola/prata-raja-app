# Boss defeat completes the wave — ledger 73

The final boss could die while the director still had spawn budget and living adds. `waveDone` then applied ordinary-wave budget/cleanup rules, and `runDirector` spawned more adds before checking completion. In both real chapters the regression reproduced an early boss defeat leaving the run in `levelup` instead of victory.

Boss waves now complete on a dead boss matching the current wave's `def.boss`, while the existing alive-boss guard remains. The director checks that boss completion before calling `spawnTick`; ordinary waves retain the original spawn-then-check order. Surviving adds do not prolong the victory, and no new adds spawn after the final boss dies. Existing combat updates and player-death precedence remain in their original order.

No new semantic field or cooldown bookkeeping is needed. `beginWave` processes its boss request synchronously; `runDirector` observes the corpse in the same combat step, then `sweepDead` removes it. Even a repeated future boss ID gets a fresh live entity before the next director call. An absent/unspawned boss or an unrelated corpse is not defeat evidence; chapter-global `bossAttempted` and `bossKills` are not used to infer completion. A malformed future boss request cannot inherit the prior corpse after sweep.

The source change is confined to `src/core/waves.ts` and `src/core/sim.ts`; no types, renderer, UI, payout formula, balance thresholds or contact-prototype changes were made.

## Verification

- 27 focused wave/completion tests pass, including nine actual-step scenarios. Both chapters defeat their real boss via status damage while budget and three adds remain: victory occurs on that step, existing adds survive, budget/next UID/wave spawn clock stay unchanged, and repeated stepping produces no further runEnd/result/gold/RNG change.
- Other scenarios cover live bosses past timeout, unspawned bosses despite prior global attempts/kills, repeated and missing future boss definitions through real start/sweep order, ordinary-wave spawning/completion, and add-caused player death on the boss-defeat step retaining a loss.
- Full `SKIP_DB=1 bash scripts/check.sh` passes: typecheck, lint, brand and 963 unit tests. Local pgTAP skipped (no DB changes). Logs: `/tmp/prata-boss-finish-check/`.
- The unchanged 300-seed release balance suite is running with seeds 1–300 and its existing nine profiles/acceptance bands. Candidate reports are in `.fleet/boss-finish-balance/`; completion and comparison are appended after measurement. No threshold tweaks or reruns for a green result are planned.
- Baseline suite passed on c0088314a2d9 in `.git/fleet-verifications/0.4.10-c0088314a2d9-620c9898-c355-4861-9ff6-240539168c5b/attempt-1/balance.log`. Pure core/meta/content are identical across that baseline, f3709ef and e17f814 (verified by Git diff). Detailed ordinary eight-profile baseline is in main `.fleet/measure/contact-attack/reports/baseline-full-summary.md`; only matching configs will be compared. The baseline release-suite log records pass/fail, not numeric rows, so it is not treated as invented exact before values.

Earlier terminal completion can legitimately shorten runs or convert a post-boss-death add loss into a win. Full-cycle difficulty is not claimed identical; the 300-seed results and unchanged acceptance limits remain required evidence. No browser export was run (core-only change and lead disk constraint). No merge, ship, cloud change or ledger rewrite was performed.
