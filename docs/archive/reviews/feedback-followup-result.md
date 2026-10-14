# Combat feedback follow-up — ledger 72

Post-ship review 71 identified an ordering bug: exploder/boss `blast` events can precede `playerHit`. Both used the same gate, so the blast consumed the damage-feedback slot and the first player impact, counter flash and hurt sound disappeared.

The renderer now uses separate 750 ms gates for player damage indication and camera trauma. Blast and player-hit trauma still coalesce through the same camera gate; blast cannot consume the first distinct damage indication. The global 750 ms vibration gate and strongest batch cue remain unchanged. Reduced motion continues to suppress camera trauma and counter flash, while retaining the local damage impact. Gates reset for a new run and no deferred cue queue was introduced.

## Duplicate freeze/stun trace

`applyCc` already returns `added: false` if freeze or stun is running, without changing its duration. `applyHitEffect` ignored that flag at the sugar/crash and chill/freeze thresholds and emitted a new freeze/stun event anyway. Every threshold retry could therefore spawn another ice/Sugar Crash burst even though no new crowd control was applied.

Both threshold branches now emit only for an actual new application or `ccImmune`. This matches the existing direct bread-stun path in `src/core/sim/hit.ts`. Calls from direct/linked dip hits (`hitEnemy`) and periodic support zones (`tickZones` in `shots.ts`) receive the same correction through `applyHitEffect`. Burn/tender call sites and all other status events are unchanged.

The change only filters redundant presentation events. The actual status application call, timers, elite/boss duration scaling, chill/sugar stack construction and spending, immunity attempts, DoT values and movement effects are unchanged. Neither function uses RNG; no RNG or damage path changed.

## Evidence

Focused status/helper tests cover repeated threshold retries with either existing freeze or stun, for ordinary enemies, elites and bosses. The active status stays at 0.3 s; every threshold spends its stacks, immunity still produces its intended cue, and expiry permits a new CC application with the same duration. Existing duplicate-event expectations were corrected to require silence.

The browser regression calls actual RunScene handlers through the existing `window.__game` fixture and spies on the real web bridge's `navigator.vibrate`, Phaser effect creation, counter flash and hurt-sound requests. It tests both event orders, exploder/boss damage sources, repeated bursts, haptics on/off and real reduced-motion media settings. A separate integration case generates actual core `applyHitEffect` threshold events and passes those events into RunScene, counting ice/Sugar Crash effects and immunity requests.

These are controlled regression fixtures, not a replay of the owner's exact wave-nine run. Sound assertions count requests to the real SFX entry point, not subjective audio loudness. Browser vibration spies cannot prove phone vibration strength or comfort.


Executed `SKIP_DB=1 CHECK_OWN_SERVER=1 PORT=9497 LOGS=/tmp/prata-feedback-followup-check bash scripts/check.sh --web combatFeedback.spec.ts`: typecheck, lint, brand lint, **957 unit tests across 71 files**, isolated web export and **6 browser integration tests passed**. The focused status/helper run also passed **42 tests**. Database tests were skipped because no database code changed.

Ordered-event browser evidence covers **16 combinations** (2 damage sources × 2 event orders × 2 haptic settings × 2 motion settings), each sending 16 blast/player-hit batches through RunScene. Every combination retained the first damage impact and hurt-sound request. Across each burst there were exactly **2 damage impacts, 2 hurt-sound requests and 2 shared trauma requests**. Counter flashes were **2 normal / 0 reduced**. Normal trauma stayed at or below **0.7**; reduced-motion trauma stayed **0**. Haptics enabled emitted only at **0 / 750 ms**; disabled emitted **0** calls.

The core-to-renderer CC fixture performs 18 actual threshold hits per effect: first application, three duplicate threshold retries, an immune attempt, then a new application after expiry. It produced **2 ice effects, 2 Sugar Crash effects, 2 immunity requests and 0 vibrations** across chill and sugar. Twelve fast retries while either CC is running leave its timer unchanged in the focused core tests; elite/boss duration and immunity behavior remain covered.

The previous mixed-combat, pause/new-run, global spacing, disabled-setting and live core-contact HP regressions also remain green in the six-test browser suite. Full logs are retained in `/tmp/prata-feedback-followup-check/{tsc,lint,brand,vitest,build,e2e}.log`; existing integration screenshots are under `/tmp/prata-feedback-followup-check/playwright/`. Export and evidence directory remain available for lead archival. Frozen commit/CI status are supplied in the handoff.

Limits: the complete web suite and subjective phone vibration/audio comfort were not tested in this bounded follow-up. No UI geometry, collision/damage/balance, status duration, RNG, dependencies, native API, database or production environment changes were made.
