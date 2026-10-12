I’ll review only the supplied code against its JSDoc, without commands or file reads.
codex
1. **P0 — `src/core/stats.ts:77`: A zero throw-rate denominator produces Infinity or NaN.**
   - **Failing input:** `stats.throwSpeedPct = -1`, zero buff modifiers: `effectiveCooldown(1, stats, mods)` returns `Infinity`; cooldown `0` returns `NaN`. Loadout bonuses can produce this value.
   - **Minimal fix:** Clamp the denominator to a positive minimum before dividing.

2. **P1 — `src/core/stats.ts:38–49`: Inactive and expired buffs still contribute modifiers.**
   - **Failing input:** Own teh-tarik with `everyHits: 3` and `throwSpeedPct: 0.2`; after the first `onBreadHit`, its buff has `time: 0`, but `buffMods` immediately grants 20% throw speed. Expired spin and haste buffs likewise remain effective indefinitely.
   - **Minimal fix:** Skip buffs whose `time <= 0`.

3. **P1 — `src/core/waves.ts:18,67–69`: Spawn spacing depends on hidden state that cannot survive save/replay.**
   - **Failing input:** After a spawn at `x = 100`, clone the world into a new object and resume both worlds with identical RNG state. If the next sampled x is `110`, the original rejects it while the clone accepts it, diverging positions and subsequent RNG draws.
   - **Minimal fix:** Store the previous spawn x on `World` and preserve it when saving or cloning.

4. **P1 — `src/core/waves.ts:54–56,82`: Zero-weight enemies can spawn and affect wave completion.**
   - **Failing input:** Mix `{ tank: 1, walker: 0 }`, budget `7`, and pacing due `7`: after spending `6` on a tank, only the zero-weight walker fits. `weighted` returns it because the remaining total weight is zero.
   - **Minimal fix:** Exclude nonpositive weights when building eligible spawn candidates and calculating the cheapest eligible cost; explicitly handle an empty eligible mix.

5. **P1 — `src/core/cards.ts:25–26,45–60`: Card selection depends on content-record insertion order.**
   - **Failing input:** Two otherwise identical contents insert starter dips as `[fish-curry, condensed-milk]` versus the reverse. With no owned dip and an RNG draw of `0.25`, the guaranteed dip differs.
   - **Minimal fix:** Sort candidate IDs into a canonical order before random selection, including explicit pools.

6. **P1 — `src/core/waves.ts:54–56`: Enemy selection depends on mix-key insertion order.**
   - **Failing input:** Equal-weight mixes `{ walker: 1, runner: 1 }` and `{ runner: 1, walker: 1 }`, sufficient budget, and the same weighted draw of `0.25` select different enemies.
   - **Minimal fix:** Sort eligible enemy IDs before passing them to `rng.weighted`.

7. **P2 — `src/core/save.ts:37–38,60`: Save parsing accepts non-ISO timestamps despite the `lastPlayed` contract.**
   - **Failing input:** `parseSave('{"v":1,"lastPlayed":"2026-10-12"}')` preserves a date-only value rather than an ISO timestamp for a finished run.
   - **Minimal fix:** Validate the expected ISO timestamp format before accepting `lastPlayed`; otherwise return `null`.

No commands, files, or runtime tests were used. Integration behavior outside the supplied modules remains unchecked.
tokens used
22,616
1. **P0 — `src/core/stats.ts:77`: A zero throw-rate denominator produces Infinity or NaN.**
   - **Failing input:** `stats.throwSpeedPct = -1`, zero buff modifiers: `effectiveCooldown(1, stats, mods)` returns `Infinity`; cooldown `0` returns `NaN`. Loadout bonuses can produce this value.
   - **Minimal fix:** Clamp the denominator to a positive minimum before dividing.

2. **P1 — `src/core/stats.ts:38–49`: Inactive and expired buffs still contribute modifiers.**
   - **Failing input:** Own teh-tarik with `everyHits: 3` and `throwSpeedPct: 0.2`; after the first `onBreadHit`, its buff has `time: 0`, but `buffMods` immediately grants 20% throw speed. Expired spin and haste buffs likewise remain effective indefinitely.
   - **Minimal fix:** Skip buffs whose `time <= 0`.

3. **P1 — `src/core/waves.ts:18,67–69`: Spawn spacing depends on hidden state that cannot survive save/replay.**
   - **Failing input:** After a spawn at `x = 100`, clone the world into a new object and resume both worlds with identical RNG state. If the next sampled x is `110`, the original rejects it while the clone accepts it, diverging positions and subsequent RNG draws.
   - **Minimal fix:** Store the previous spawn x on `World` and preserve it when saving or cloning.

4. **P1 — `src/core/waves.ts:54–56,82`: Zero-weight enemies can spawn and affect wave completion.**
   - **Failing input:** Mix `{ tank: 1, walker: 0 }`, budget `7`, and pacing due `7`: after spending `6` on a tank, only the zero-weight walker fits. `weighted` returns it because the remaining total weight is zero.
   - **Minimal fix:** Exclude nonpositive weights when building eligible spawn candidates and calculating the cheapest eligible cost; explicitly handle an empty eligible mix.

5. **P1 — `src/core/cards.ts:25–26,45–60`: Card selection depends on content-record insertion order.**
   - **Failing input:** Two otherwise identical contents insert starter dips as `[fish-curry, condensed-milk]` versus the reverse. With no owned dip and an RNG draw of `0.25`, the guaranteed dip differs.
   - **Minimal fix:** Sort candidate IDs into a canonical order before random selection, including explicit pools.

6. **P1 — `src/core/waves.ts:54–56`: Enemy selection depends on mix-key insertion order.**
   - **Failing input:** Equal-weight mixes `{ walker: 1, runner: 1 }` and `{ runner: 1, walker: 1 }`, sufficient budget, and the same weighted draw of `0.25` select different enemies.
   - **Minimal fix:** Sort eligible enemy IDs before passing them to `rng.weighted`.

7. **P2 — `src/core/save.ts:37–38,60`: Save parsing accepts non-ISO timestamps despite the `lastPlayed` contract.**
   - **Failing input:** `parseSave('{"v":1,"lastPlayed":"2026-10-12"}')` preserves a date-only value rather than an ISO timestamp for a finished run.
   - **Minimal fix:** Validate the expected ISO timestamp format before accepting `lastPlayed`; otherwise return `null`.

No commands, files, or runtime tests were used. Integration behavior outside the supplied modules remains unchecked.
