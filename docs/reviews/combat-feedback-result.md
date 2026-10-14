# Combat feedback correction — ledger 64

The owner's Android Chrome report (web 0.4.8, seed 300650584, wave 9, level 11; Kosong 2 / Thosai 2 / Tissue 2 / Chapati 1, Milk 1 / Mint 1) clarified both physical vibration and screen shaking/flashing. Source tracing found no ice-healer/freeze-specific buzz; this change addresses repeated combat feedback rather than attributing it to ice enemies.

## Changes

- RunScene vibration has a global 750 ms wall-clock minimum, including previously unthrottled level-up and boss cues. Larger caller gaps remain effective, the first cue is immediate, and a new run resets the gate. Disabled haptics do not reserve a slot.
- Each simulation event batch emits its strongest requested vibration once. Suppressed cues are discarded immediately; there is no timer or deferred queue.
- Repeated player-hit counter flash, impact, recoil, hurt sound and trauma coalesce at 750 ms. Nearby blast trauma shares that gate; distant own-bomb blasts no longer shake the entire camera. Damage and HUD publication are unchanged.
- Elite/boss hit camera trauma is limited to one cue per 750 ms across all enemies. Individual hit effects, damage numbers and status visuals remain intact. Boss spawn, phase and death cues retain their intentional visual cues.
- Reduced motion adds no camera trauma or counter flash; local impact/HP feedback remains. Pausing clears camera trauma and hit-stop, preventing a leftover shake on resume.

Only RunScene presentation and its small gate helper changed. No collision geometry, core events, damage, balance, UI geometry, dependencies, native APIs or settings were added or changed.

## Verification

Focused helper tests cover immediate first cue, mixed default/custom gaps, the exact 750 ms boundary, larger gaps, new-run reset and strongest-cue ordering.

The browser integration suite uses the existing `window.__game` fixture and calls actual RunScene handlers with a controlled wall clock. The real web bridge calls a `navigator.vibrate` spy; effects still execute in Phaser. It checks repeated contact-hit and elite-hit batches, mixed heavy blast/light hurt, enabled/disabled haptics, freeze status, pause and new-run boundaries, and both reduced-motion modes. This is a controlled presentation fixture using the reported seed, not a replay of the owner's exact wave/build. A separate live core-contact fixture verifies repeated damage still reaches the HP HUD.

Subjective vibration strength and comfort on the owner's phone remain unverified; browser spy counts prove cadence and call routing, not physical feel.

Executed on branch `sol/combat-feedback`, base `f3709ef75aa0969f1e1ec5877fb468b397d58f04`:

- `SKIP_DB=1 CHECK_OWN_SERVER=1 PORT=9496 LOGS=/tmp/prata-combat-feedback-check bash scripts/check.sh --web combatFeedback.spec.ts`: typecheck, lint, brand lint, **951 unit tests**, isolated web export and **3 browser integration tests passed**. Database tests intentionally skipped (no database changes). Typecheck also rerun after the browser fixture was completed.
- In each motion mode, 44 elite damage numbers were rendered. Despite repeated event bursts, vibration calls were exactly **32 ms at t=0** (heavy wins over light) and **8 ms at t=750**. There were **4 trauma requests total** (2 player cues + 2 elite cues); normal camera trauma peaked at **0.65**, reduced-motion trauma at **0**. Counter flashes: **2 normal / 0 reduced**.
- Haptics off produced **0** calls and enabling immediately could emit at the same timestamp (the disabled events did not consume the gate). Freeze produced no extra vibration. Pause cleared trauma/scroll to zero and emitted no pending cue. Starting another run emitted nothing by itself; its first medium cue at t=4001 was immediate, a simultaneous heavy cue was suppressed, a 1000 ms requested gap suppressed t=4751 and admitted t=5001.
- Live core contact caused repeated HP drops and alternated the existing HP pill's hit indication; the actual HP value remained visible. Screenshot inspected: danger mark, contact impact and HP pill rendered at 390×844.

Browser logs: `/tmp/prata-combat-feedback-check/e2e.log`. Screenshots for lead archival:

- `/tmp/prata-combat-feedback-check/playwright/combatFeedback-RunScene-mi-ec4c6--calm-reduced-motion-false-/combat-reduced-false.png`
- `/tmp/prata-combat-feedback-check/playwright/combatFeedback-RunScene-mi-8d463-y-calm-reduced-motion-true-/combat-reduced-true.png`
- `/tmp/prata-combat-feedback-check/playwright/combatFeedback-real-core-c-f737a-the-HP-HUD-with-haptics-off/contact-hud.png`

The focused suite runs locally and asserts these counts; screenshots record the rendered integration fixture, not proof of phone comfort or the owner's exact wave-nine situation. CI status and frozen commit SHA are supplied in the worker handoff.

Existing browser regressions also passed: `APP_WEB=http://localhost:9496 npx playwright test -c e2e/web play.spec.ts --grep 'enemy biting|page going hidden'` (**2 passed**). The complete web suite and subjective phone testing remain for the lead/background verifier; this slice runs all local static/unit checks and the affected browser paths.
