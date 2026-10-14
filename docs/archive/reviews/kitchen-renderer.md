# Test Kitchen renderer

Branch: `sol/kitchen-renderer`; ledger 15. Core dependency: `2e575a9356e6c5b5ebe976fb0a2aa23dd4e41c08` (cherry-picked for local verification).

The hub exposes `startKitchen(config)`, `tuneKitchen(fullTuning)` and `stopKitchen()`. Kitchen events are `kitchenStart { seed, tuning }`, `kitchenStats` and `kitchenEnd { reason, stats }`, where reason is `won`, `lost` or `stopped`. Stats contain simulation time, wave, phase, HP/max HP, kills, tuning and damage shown / damage shown per second. Damage counts displayed hit and DoT numbers, including overkill, and resets on each start. Stats publish at start, tuning changes, terminal events and the ordinary HUD cadence.

Kitchen wins, losses and live quits cannot reach normal run results, progression rewards or run analytics. Normal starts clear kitchen state. BootScene queues, replaces, tunes or cancels a kitchen request while assets load. A late bot save read cannot replace an owner-started kitchen world, and `?kitchen=1` suppresses automatic normal bot startup. Existing pause/resume and hidden-page pause apply to kitchen play.

Clearing an existing kitchen world emits `kitchenEnd` with reason `stopped`, including after a prior win/loss, so feedback context returns to setup. Repeated stops with no world emit nothing; win/loss still emit only once.

Validation: focused core and renderer tests passed (32 tests). `SKIP_DB=1 bash scripts/check.sh` passed typecheck, lint, brand lint and all 859 tests across 63 files (logs: `/tmp/prata-raja-kitchen-renderer-final-check`). After the final stopped-event adjustment, all eight renderer tests and typecheck passed again. The lead's integrated slice pipeline will verify the combined branch. No web export, browser playthrough, database checks or 300-seed balance run in this renderer slice. No ordinary simulation tuning changed.
