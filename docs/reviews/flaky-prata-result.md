# Flaky Kosong: Kitchen-only readability prototype

14 Oct 2026. Ledger 38. Default off. No normal-run adoption, balance threshold edits, save-schema changes, new art, dependencies, native changes or deployment.

In Kitchen setup, select Kosong and enable **Experimental: Flaky Kosong**. Each unblocked impact sheds two forward pieces at ±0.35 radians around the incoming heading. Each deals 10% of that impact's **base** damage (before crit, player multipliers and target vulnerability), travels at 600 units/s for at most 120 world units, and ends on its first contact. Pieces cannot hop, pierce, home or emit more pieces; they exclude the enemy that shed them. Shields absorb them normally. The original retains its damage/cadence/level progression and ricochets; later-impact pieces use the existing hop damage falloff. Six children per original is the hard ceiling, including artificial higher-hop test stats.

The parent renders at 84%, 68%, then 52% scale after its successive impacts. Pieces crop a small strip from the existing Kosong atlas frame and use the existing disc pool, with no trails; release resets cropping before pool reuse. Egg's radial fragments are unchanged. There is no new global projectile/pool cap: the existing rendering/trail behavior remains, with six children per original and 0.2s child lifetime bounding the added work.

The explicit setting starts false on a new Kitchen visit; Restart preserves the selected comparison, and turning it off followed by Start fresh test creates the baseline world without experimental state. Ordinary world creation never sets the flag. Kitchen feedback snapshots include the active boolean, reset it on fresh tests/ordinary runs/exit, and send it only on the Kitchen screen. The edge validator accepts only a Kitchen boolean and persists it in `params.experiments.flaky_kosong`; existing clients and normal contexts keep their old shape. **The lead must deploy the changed game-feedback edge function before claiming this metadata survives live submission.** The worker performed no cloud operation.

## Paired impact measurements

Run `FLAKY_COMPARE=1 npx vitest run src/core/__tests__/flakyPrata.test.ts --disableConsoleIntercept`.

The deterministic fixture uses one 100-base-damage shot, crit=0, one stationary high-HP target at y=100 and one stationary target 70 units along each fan ray. Each dip is L5; Fish/Milk/Mint are linked to Kosong and Teh is global. No targets die, no status timers advance, no wave spawning/throwing occurs. This isolates direct damage and extra application opportunities rather than pretending to be a win-rate comparison.

| Setup | Direct damage off/on | Successful hits / dip applications off/on | New status events off/on | Teh hit counter off/on | Peak shots off/on |
|---|---:|---:|---:|---:|---:|
| Kosong only | 100 / 120 | 1 / 3 (no dip) | 0 / 0 | 0 / 0 | 1 / 3 |
| Linked Fish | 100 / 120 | 1 / 3 | 1 / 3 | 0 / 0 | 1 / 3 |
| Linked Milk | 100 / 120 | 1 / 3 | 2 / 6 | 0 / 0 | 1 / 3 |
| Linked Mint | 100 / 120 | 1 / 3 | 1 / 3 | 0 / 0 | 1 / 3 |
| Teh | 100 / 120 | 1 / 3 | 0 / 0 | 1 / 3 | 1 / 3 |

Milk emits both sugar and sugarSlow on a fresh target. New status events are **not** refresh counts or activation counts. Teh L5 does not activate in this one-impact fixture; the counter shows the extra progress. A second identical throw test confirms baseline remains at 2/5 hits with no haste, while the experiment reaches six hits, activates its 3s haste and retains 1/5 progress. All selected on-hit dips receive their full existing effect on a flake hit; linked identity matches the source Kosong, and a mismatched link receives none. Thus 20% more direct damage can yield three times the support application opportunities in a favourable fan layout. This needs real wave measurements before any adoption decision.

## Verification and limits

Focused tests cover default-off equality over 500 full sim steps, ordinary world state, exact isolated baseline damage, child count/damage/heading/source identity, parent-victim exclusion, no child recursion/hops/pierce, 120-unit clipping, shielded parent and child, seven artificial parent impacts with six-child cap, and coarse/fine equal swept contacts, damage, child travel and RNG in static single-impact and ricochet fixtures. Existing normal core tests provide further regression coverage.

The added 320px Playwright test exercises the explicit toggle, restart, return to baseline, save isolation and a fresh visit resetting the toggle. It is authored but **not run**, because this worker was instructed not to export web while disk space was constrained. Phone-width motion, crop readability, enemy-telegraph coverage and pooled-frame reuse still require browser inspection after integration. Full SKIP_DB check result is recorded in the worker handoff; database tests were intentionally skipped.

The coarse/fine tests isolate swept collision timing with fixed targets and crit disabled. Experimental Kosong parents and flakes advance together to the next contact or expiry; children are born at the impact clock rather than advancing through the future remainder before hop selection. They do not assert whole-game step-size equivalence: enemy motion, dip timer/cooldown updates, other bread/enemy projectiles and their shared crit RNG ordering use the existing sim order. The experiment group runs at the first eligible Kosong position in the normal shot pass; earlier ordinary shots already ran their full step, and later ordinary shots run afterwards. This is a narrow experiment contact schedule, not a world scheduler. The fixture peak counts retained projectile objects for this single throw (no sweep), equal to its actual maximum live shots at emission; it is not an arena-load benchmark.

No 300-seed win bands were run. For the next comparison, run identical seeds/chapter/wave/build/tuning/input scripts with only the Kitchen flag changed; collect direct hit damage separately from DoT, successful bread/flake hits, status additions and refreshes, Milk/Mint threshold activations, Teh activations/time, peak **live** projectiles, survival time and win rates. Use only normal content and unchanged thresholds. Recommend keeping this as a Kitchen choice until motion readability and support-frequency effects have been measured. Supplementing ricochets, replacing them or making flakes a mastery choice remains a direction decision for the owner.


## Independent review P2: lethal shared-target ordering

Review of original `5838436` identified a real static, crit=0 divergence. The exact supplied geometry (L5, damage ×5; shot at (0,48), speed900; roach radius32 at (0,100); mosquito radius14.4/HP6 at (-sin(.35)×24,100+cos(.35)×24)) failed before the fix: one 1/60 update dealt82.5, while ten 1/600 updates dealt150. Child movement had used the future step remainder before the parent's earlier ricochet contact.

The regression now passes with150 damage and four children in both runs, identical hit/kill events, victim outcomes and RNG. A separate non-overlapping layout proves the opposite ordering: the first child kills a later prospective parent victim before the parent reaches it; both coarse/fine runs show parent damage100+80 and child damage10, four children and the same events/RNG. Simultaneous zero-time contacts, an already-expired shot, child expiry and the six-child cap are tested together to guard termination. The original impact heading and base damage are captured before parent hop mutation; all existing range/shield/ricochet/proc tests still pass.

The fix adds a bounded chronological contact helper for experimental straight Kosong and its flakes. Ordinary/default-off shots keep their existing movement/collision path. It does not assert equivalence across enemy movement, all weapons, timers or mixed projectile families; those limitations above remain. Phone-width renderer proof and paired arena/balance measurements remain pending.

P2 final local verification: `SKIP_DB=1 LOGS=/tmp/flaky-p2-check bash scripts/check.sh` passed typecheck, lint, brand and all901 unit tests; local pgTAP intentionally skipped. Focused experiment suite15 tests passed. The worker reports the frozen-commit CI result separately.
