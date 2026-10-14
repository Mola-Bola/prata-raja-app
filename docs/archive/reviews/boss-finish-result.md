# Boss defeat completes the wave — ledger 73

The final boss could die while the director still had spawn budget and living adds. `waveDone` then applied ordinary-wave budget/cleanup rules, and `runDirector` spawned more adds before checking completion. In both real chapters the regression reproduced an early boss defeat leaving the run in `levelup` instead of victory.

Boss waves now complete on a dead boss matching the current wave's `def.boss`, while the existing alive-boss guard remains. The director checks that boss completion before calling `spawnTick`; ordinary waves retain the original spawn-then-check order. Surviving adds do not prolong the victory, and no new adds spawn after the final boss dies. Existing combat updates and player-death precedence remain in their original order.

No new semantic field or cooldown bookkeeping is needed. `beginWave` processes its boss request synchronously; `runDirector` observes the corpse in the same combat step, then `sweepDead` removes it. Even a repeated future boss ID gets a fresh live entity before the next director call. An absent/unspawned boss or an unrelated corpse is not defeat evidence; chapter-global `bossAttempted` and `bossKills` are not used to infer completion. A malformed future boss request cannot inherit the prior corpse after sweep.

The source change is confined to `src/core/waves.ts` and `src/core/sim.ts`; no types, renderer, UI, payout formula, balance thresholds or contact-prototype changes were made.

## Verification

- 27 focused wave/completion tests pass, including nine actual-step scenarios. Both chapters defeat their real boss via status damage while budget and three adds remain: victory occurs on that step, existing adds survive, budget/next UID/wave spawn clock stay unchanged, and repeated stepping produces no further runEnd/result/gold/RNG change.
- Other scenarios cover live bosses past timeout, unspawned bosses despite prior global attempts/kills, repeated and missing future boss definitions through real start/sweep order, ordinary-wave spawning/completion, and add-caused player death on the boss-defeat step retaining a loss.
- Full `SKIP_DB=1 bash scripts/check.sh` passes: typecheck, lint, brand and 963 unit tests. Local pgTAP skipped (no DB changes). Logs: `/tmp/prata-boss-finish-check/`.
- The unchanged 300-seed release balance suite passes all five tests: 2,700 runs across nine profiles, seeds 1–300, at 30 Hz with the existing 1,200-second ceiling. Every run finishes below that ceiling. One run only; no threshold edits. Wall time 667.69 seconds under local machine load. Log: `/tmp/prata-boss-finish-balance.log`; generated reports: `.fleet/boss-finish-balance/candidate.md` and its chapter/signature suffixes.
- Source-freeze CI [38492733075](https://github.com/Mola-Bola/prata-raja-app/actions/runs/38492733075) completes successfully, including both unit/static and pgTAP jobs.
- Baseline suite passed on c0088314a2d9 in `.git/fleet-verifications/0.4.10-c0088314a2d9-620c9898-c355-4861-9ff6-240539168c5b/attempt-1/balance.log`. Pure core/meta/content are identical across that baseline, f3709ef and e17f814 (verified by Git diff). Detailed ordinary eight-profile baseline is in main `.fleet/measure/contact-attack/reports/baseline-full-summary.md`; only matching configs will be compared. The baseline release-suite log records pass/fail, not numeric rows, so it is not treated as invented exact before values.

Earlier terminal completion can legitimately shorten runs or convert a post-boss-death add loss into a win. Full-cycle difficulty is not claimed identical; the 300-seed results and unchanged acceptance limits remain required evidence. No browser export was run (core-only change and lead disk constraint). No merge, ship, cloud change or ledger rewrite was performed.


## 300-seed measurement

Measured source is `52ab118040d99d94e4b65e4ac00baaa92642d09e`. This final report update changes no source or tests. The prior detailed baseline uses `f3709ef75aa0969f1e1ec5877fb468b397d58f04`; Git confirms its core/meta/content match this task's e17f814 base. I inspected its serialized `baseline-full-config.json` and measurement harness: chapter IDs, seeds 1–300, max breads 4/2/1, 30 Hz, 1,200-second ceiling, original autoInput/autoPick, chapter 2 stall XP 1800/training 2/Rare gear RNG seed 42, and Murtabak/Appam signature XP 3100/no gear fixtures match the release balance tests. Chapter 1's event-measuring loop follows the same simulation/card policy; only its report bookkeeping differs. No contact prototype source is used.

| Profile | Baseline win rate | Candidate win rate | Existing acceptance band |
|---|---|---|---|
| Chapter 1, four breads | 56.0% (168/300) | 56% | 55–75% |
| Chapter 1, two breads | 44.0% (132/300) | 44% | 40–60% |
| Chapter 1, solo Kosong | 21.0% (63/300) | 21% | 10–25% |
| Chapter 2, four breads | 63.3% (190/300) | 63.3% (190/300) | 45–65% |
| Chapter 2, two breads | 35.7% (107/300) | 35.7% (107/300) | Report only |
| Chapter 2, solo Kosong | 12.0% (36/300) | 12.0% (36/300) | 10–25% |
| Murtabak signature solo | 10.0% (30/300) | 10.0% (30/300) | 10–25% |
| Roti Bomb signature solo | Prior release suite passed; exact count unavailable | 20.0% (60/300) | 10–25% |
| Appam signature solo | 17.0% (51/300) | 17.0% (51/300) | 10–25% |

Chapter 1's existing candidate report rounds rates to whole percentages, so exact candidate win counts are not inferred. No win-rate change is observed at the reported precision; exact counts match for the five profiles that expose counts and have a detailed baseline. These aggregate comparisons do not establish per-seed outcome identity. The prior detailed baseline has no Roti Bomb cell; its exact rate is deliberately left unavailable.

Chapter 1 candidate mean boss-fight seconds for wins are 38/39/37 (rounded), within the unchanged 30–40-second band. Median waves are 10/10/9 for chapter 1 and 10/10/6 for chapter 2, matching the prior detailed baseline. Chapter 1 candidate mean total run seconds are 275/282/242 (rounded), versus prior baseline 276.57/283.46/243.31. Earlier terminal completion is consistent with shorter post-boss cleanup; this aggregate measurement does not attribute every time difference or claim all per-run combat histories unchanged.
