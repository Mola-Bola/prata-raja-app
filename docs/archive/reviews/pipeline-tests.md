# Pipeline review: test suite speed

Measured 2026-10-14 with `npx vitest run --reporter=json` (raw: /tmp/claude-501/vitest-times.json).
Full suite: 77 files, 1010 tests, all passing, ~96s wall.

## Where the time goes

| Time | File | Why |
|---|---|---|
| 95.3s | scripts/__tests__/pipeline.test.ts (38 tests) | Real bash/git/node child processes per test; runs serially in one file |
| 11.3s | src/core/__tests__/balance.test.ts (5) | Autoplay bot over seeds 1..20 |
| 7.1s | src/core/__tests__/sim.test.ts (100) | Includes one 100+ enemy fuzz test (4.7s) |
| 5.7s | scripts/__tests__/fleet.test.ts (8) | Not inspected yet |
| 1.8s | scripts/__tests__/verify-fleet.test.ts | |

Everything else totals under 1s. pipeline.test.ts alone is ~99% of wall time.

## (1) Smoke subset: `test:smoke`

Measured: 8 files, 114 tests, all pass, 1.1s wall.

- src/core/__tests__/director.test.ts (includes "the autoplay bot finishes flow runs": sim proves a flow chapter)
- src/core/__tests__/save.test.ts (save round-trip: "parseSave reads back exactly what recordRun wrote")
- src/meta/__tests__/migrate.test.ts (save v2 to v3)
- src/meta/__tests__/idle-streak-migrate.test.ts (more migrate coverage)
- src/game/__tests__/hub.test.ts (UI hub module)
- src/game/__tests__/saveMerge.test.ts (cloud/local save merge)
- src/game/ui/__tests__/saveStore.test.ts (game save store module)
- src/core/__tests__/waves.test.ts (wave spawning feeding the flow run)

package.json script line (not applied, per instructions):

```json
"test:smoke": "vitest run src/core/__tests__/director.test.ts src/core/__tests__/save.test.ts src/meta/__tests__/migrate.test.ts src/meta/__tests__/idle-streak-migrate.test.ts src/game/__tests__/hub.test.ts src/game/__tests__/saveMerge.test.ts src/game/ui/__tests__/saveStore.test.ts src/core/__tests__/waves.test.ts"
```

Explicit paths are used because vitest filters are substring matches and could pull in extra files.

## (2) Move to CI-only

- scripts/__tests__/pipeline.test.ts: process and git fixtures, 95s. Highest payoff.
- src/core/__tests__/balance.test.ts: balance tuning report, 11s. Run nightly or on sim changes.
- scripts/__tests__/fleet.test.ts and verify-fleet.test.ts: 7.5s combined, needs checking whether they touch the network before deciding.
- Optional: the 100-enemy fuzz in sim.test.ts (4.7s). Keep the rest of sim.test.ts local.

CI command: `npx vitest run` (full suite, unchanged).

## (3) Vitest config speedups

Current config (vitest.config.mts) sets only the alias, include globs and `environment: 'node'`. No pool or isolate settings.

- Split pipeline.test.ts into 3 to 4 files (for example by describe block). Vitest parallelizes across files, so this is likely the largest real win. Not tested.
- Try `describe.concurrent` for the pipeline fixtures. Each test uses its own mkdtemp repo, but this needs a run to confirm no shared-state flakes (the "concurrent HEAD change" tests set git state on purpose).
- Pool/threads: the default pool is probably already sufficient. Benefit is unmeasured; the bottleneck is serial tests inside one file, not worker count.
- `isolate: false`: not recommended. Modules are shared across files, and src tests may hold module-level state. Gain is small compared to the risk.
- Use a vitest `projects` split (`smoke`, `unit`, `pipeline`) rather than changing global pool settings. This keeps the smoke path cheap without touching other tests.

## Not verified

No config change or test split was applied. Timings are from one run on a loaded Mac, so expect variance of several seconds.
