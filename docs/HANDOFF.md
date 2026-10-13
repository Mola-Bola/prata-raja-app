# Prata Raja — handoff

## 13 Oct 2026 — live 0.4.4; Codex fleet lead

- Live: https://mola-bola.github.io/prata-raja/ . Source `7fb511200a6bad065094fd5ae5cde8e941be92d6`; Pages `e49bc7d7b666ebc1f92771643322d85b6d894623` built with no error and live HTML exactly matched the published file. Runtime remains 1; web only. Source main CI passed.
- Test Kitchen is shipped: stall entry or `?kitchen=1`, existing rotis/dips and levels, wave/boss selection, repeatable seeds, live tuning and metrics. Sandbox lifecycle does not save progression or rewards. Feedback carries Kitchen context. Future tiers, quality, gear and drinks are not implemented yet.
- Gate passed typecheck/lint/brand and 873 tests. Post-ship job `.git/fleet-verifications/0.4.4-7fb511200a6b-c2e338fd-b271-4981-a537-99502d8abf0a/` (ledger 24) is running full web, 300-seed balance and Sol-high read-only review. Do not claim it passed before its result exists.
- Publication succeeded through akit; the release controller then stopped because a Codex Cloud CLI probe created an unrelated untracked `error.log`. The lead preserved that log in `.fleet`, verified clean pinned source, pushed main, checked Pages/live HTML and resumed the already queued verifier without republishing. Durable evidence: that job's `release-recovery.json`. Keep cloud CLI probes outside the shipping checkout during gates.
- 0.4.3's full web suite (47 tests) and 300-seed balance passed. Its completed read-only review found two P2 issues: stale shipped labels on reopened notes and an unsupported old-server fallback promise. Both are fixed in 0.4.4. A capacity-text false positive incorrectly scheduled another review; the lead stopped the retry and recovered completed evidence explicitly. Ledger 16 remains historically failed; investigation 21 awaits the new release verification. The retry detector now accepts successful nonempty output before scanning failure text, with mocked regression coverage.
- Fleet SQLite ledger, explicit ownership, Jev closed-choice helper, pinned worker verification and web release/background verification are merged. Jev has mocked tests; no paid live call was made. `docs/LEDGER.md` is a snapshot; `.fleet/ledger.db` is authoritative.
- Owner corrected inherited Astra workers: those workers were stopped. Bounded implementation explicitly uses `gpt-6.1-sol` medium; bounded content inventory used `gpt-6-luna` medium. Sol high is for independent reviews. Never leave the worker model unset and inherit Astra; ask before a new frontier assignment.
- Feedback has Direction / Bug / Feel / Idea, gameplay snapshots, private My notes, replies and current status. The current edge function is deployed; new clients require that current handler, while legacy client submissions remain accepted. Feedback digest was empty at 12:48 UTC. Owner device pairing still needs the requested browser tap and trusted-chat note reference. Owner code is unprovisioned. Codex Cloud environment and BrowserStack access remain unavailable; access was requested while local fleet/CI continue.
- Preserve `codex/polish-combat-1` at `5a4a12e`: boss movement slow experiment fails two 300-seed gates (ch1 two-bread 39.33%; ch2 four-bread 67%). Do not merge, loosen tests or retune unrelated content to admit it.
- Next: finish 0.4.4 verification/fix-forward → dip families/tags (read-only inventory on `sol/dip-plan`, ledger 23) → measured decelerating knockback with the same displacement, then separately lunge/recovery or attacker budgets → jobs/drinks. Damage/RNG rewrites remain optional later architecture. No scheduled continuation is established.

## QA debt
- No real-phone/browser-device pass yet (notch, haptics, FPS). Prior localhost browser access was denied; do not bypass it. Analytics replay bandwidth remains a playtest consideration.
- Economy pacing needs playtest evidence (~400 coins/win, training maxes in 10–15 runs); gear-look art is not wired.
- `save.ts` accepts date-only lastPlayed values. Legacy zero-run saves may see the skippable prologue once (accepted).
- Owner identity and threaded feedback are implemented; actual owner device pairing still needs the requested browser tap. Legacy notes without a device capability cannot be listed privately.
- Owner-only backup task: copy `~/Backups/prata-raja-secrets-2026-10-12/` off the Mac.

## History
0.2.0 stall/meta + boss CC safety; 0.2.1 feedback/telemetry; 0.2.2 feel pass; 0.3.0 recipes/evolutions/night chapter; 0.3.1 prologue/new pests; 0.4.0 signature/Fish Curry/web chunk recovery; 0.4.1 Milk/Mint links, heat Bomb and bouncing Appam. Historical reports in `docs/reviews/`.

## How to ship
Use `docs/PIPELINE.md` and `docs/FLEET.md`. Only the lead merges and ships. Gate a clean pinned commit with `SKIP_DB=1 ~/cell/akit/akit check`, stamp that commit, then `~/cell/akit/akit ship -- node scripts/publish-web.mjs --label <selected-label>`. Push main after merge/ship and inspect CI. Full web/balance/review verification follows fast-lane releases and reports regressions for fix-forward.

## How it is built (what worked)
- Lead writes contracts first (`src/core/types.ts`, JSDoc'd stubs, `src/game/hub.ts`), then parallel builders each own files + tests: Haiku for modules/content/UI/slicing/balance, Sonnet for sim/renderer/integration, Codex (`gpt-6.1-sol`, medium) for art sheets, self-contained modules in a worktree, and **diff-pasted reviews** (core: 6 findings for 22k tokens; sim: 12 for 40k).
- Rules live in `src/core` (pure TS, deterministic seeded RNG in the World); `src/core/autoplay.ts` + `balance.test.ts` (`BALANCE_SEEDS=300`) tune numbers headlessly. Current S1 targets/results: 4-bread win ~58-64%, 2-bread ~46%, solo ~21%, ~11 picks per run.
- Art: Codex image sheets on flat magenta → `slice_s1.py` → `assets/game/**` + `manifest.json` → `python3 scripts/pack_atlas.py` (power-of-two atlases; run-time groups first). Never code-drawn art.
- Traps: DOM components only pass top-level function props; the WebView has no localStorage (save via bridge); Android Phaser batches one texture (atlases fixed 95 → 7 draw calls); a Google Fonts `@import` breaks the OTA upload (fonts are bundled now); Codex logins can expire mid-run (`codex logout && codex login`, owner).
