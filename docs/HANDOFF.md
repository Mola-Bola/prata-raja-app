# Prata Raja — handoff

## 13 Oct 2026 — live 0.4.3; Codex fleet lead

- Live: https://mola-bola.github.io/prata-raja/ . Source `b1ef3de2759ed2ea4537725102f6ee80694320da`; Pages `d8be1b8e3668fd1063bcbaac4d4834b5f71335cb` built with no error and live HTML matched the published file. Runtime remains 1; web only.
- 0.4.3 adds Direction / Bug / Feel / Idea, gameplay snapshots, private My notes, thread replies and status/plan/release display. Edge function deployed; read-only live checks pass. Browser inspection confirmed v0.4.3, categories, screenshot indicator and private empty-note response. No production test note was sent.
- Gate passed typecheck/lint/brand and 835 tests. Post-ship job `.git/fleet-verifications/0.4.3-b1ef3de2759e-0afab6dd-1f58-4b68-8c0a-f13d5d53f0da/` (ledger 16) is running full web, 300-seed balance and Sol-high read-only review. Do not claim that job passed until its result exists. Source CI works; inspect latest main run.
- Fleet SQLite ledger, explicit ownership, Jev closed-choice helper, pinned worker verification and web release/background verification are merged. Jev has mocked tests; no paid live call was made. `docs/LEDGER.md` is a snapshot; `.fleet/ledger.db` is authoritative.
- Owner corrected inherited Astra workers: all three were stopped; replacements explicitly use `gpt-6.1-sol` medium. Preserve existing worktrees and use explicit models for new bounded workers. Sol high is for independent reviews.
- Test Kitchen is underway on `sol/kitchen-core`, `sol/kitchen-renderer`, `sol/kitchen-ui`, plus `sol/kitchen-feedback`. It uses implemented content/levels and separate sandbox lifecycle; never writes real progression. See ledger 11, 13, 15, 17 for ownership.
- Feedback digest was empty at 12:27 UTC. Owner device is not paired yet; requested a phone/browser note and trusted-chat reference to identify the correct device. Owner code is unprovisioned. Codex Cloud environment and BrowserStack access remain unavailable; requested access while local fleet/CI continue.
- Preserve `codex/polish-combat-1` at `5a4a12e`: boss movement slow experiment fails two 300-seed gates (ch1 two-bread 39.33%; ch2 four-bread 67%). Do not merge, loosen tests or retune unrelated content to admit it.
- Next: finish Test Kitchen → dip families/tags → measured decelerating knockback (same displacement), then separately lunge/recovery or attacker budgets → jobs/drinks. Damage/RNG rewrites remain optional later architecture. No scheduled continuation is established.

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
