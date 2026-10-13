# Experimental combat polish 1: boss status movement (not release-ready)

Bosses now honor existing status slows while lining up, charging and returning. Previously only their walk-in used `speedMul`, so ice/stun art implied a 40% slow while charge movement stayed at full speed. Sugar/chill slows use the same existing rule. Damage, telegraph timers, cooldowns, content numbers and firing controls are unchanged.

Owned files: `src/core/sim/boss.ts`, `src/core/__tests__/sim.test.ts`, this report.

## Verification

- Three new parameterized movement regressions failed on the original code (freeze/stun/sugar slow) and pass with the fix.
- `npx vitest run --configLoader runner src/core/__tests__/sim.test.ts src/core/__tests__/status.test.ts`: 138 passed.
- The additional full frozen charge regression confirms the boss attacks once for its usual damage and returns to hold without waiting for freeze expiry.
- `npx tsc --noEmit` and `git diff --check`: passed.
- Before/after 300-seed balance: baseline 5/5 passed; patch 3/5 passed, two target-band failures. **Not ready for integration without a balance decision.**

## Integration decision

Deferred for this round: keep this experiment isolated; do not release, retune content, or weaken balance bands. Parent integrates only visual/card polish if its gate passes.

Next investigation: slower lane alignment can leave a charge outside its intended physical lane while damage still uses the stored lane. Resolve correspondence between telegraph, boss position and hit lane before tuning. The short movement regressions prove slow application, but do not prove that correspondence for all charge geometries.

## Measured impact (seeds 1–300)

| Policy | Before | After |
|---|---|---|
| Chapter 1, four breads | 56% | 56% |
| Chapter 1, two breads | 44% | 39% (118/300; below 40% floor) |
| Chapter 1, solo | 21% | 20% |
| Chapter 1, winning boss seconds, 4/2/solo | 38 / 39 / 37 | 36 / 37 / 35 |
| Chapter 2, four breads | 190/300 (63.3%) | 201/300 (67%; above 65% cap) |
| Chapter 2, two breads | 107/300 (35.7%) | 125/300 (41.7%) |
| Chapter 2, solo | 36/300 (12%) | 42/300 (14%) |
| Murtabak signature solo | 33/300 (11%) | 37/300 (12.3%) |
| Roti Bomb signature solo | 63/300 (21%) | 60/300 (20%) |
| Appam signature solo | 49/300 (16.3%) | 51/300 (17%) |

Raw reports: `/private/tmp/prata-combat-{before,after}.md` plus `.chapter2`, `.murtabak`, `.roti-bomb`, `.appam` suffixes. Boss movement alters attack timing enough to shift seeded policies both ways. No balance constants were changed to hide these failures.

No web build or phone visual/performance checks; parent owns the full integration gate. Slower charges and returns intentionally give status builds more time to dodge/attack; no unrelated balance retuning.
