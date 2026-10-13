# Prata Raja — handoff

## 13 Oct 2026 — verified live 0.4.2; Codex fleet lead

- Live: https://mola-bola.github.io/prata-raja/ . Pages commit `3225b4c355d578f0cb4188b4084c6ce9b1b5062c` is built with no error. Live HTML exactly matches `.pages-build/index.html` (SHA256 `f811a89c1261f53cc4871d1b17c4346a8923114cd8fc3cd5345031d6edbea02b`). Source release `62b4d90`; runtime 1.
- 0.4.2 adds counter bread readiness/throw feedback and dip effect plus linked/all-bread scope. Release gate: 755 unit tests, typecheck/lint/brand passed. Earlier integrated browser gate: 45 checks before the final card-data compatibility correction; no later browser or real-phone pass claimed.
- Starting main `86d2946` equals origin/main and was clean. Pipeline is merged (`cf33196`). `sol/hygiene` cleanup is being integrated with current facts. Fleet ledger, Jev helper and web fast-lane/background verifier are in bounded worker branches; lead owns integration.
- Source repository `Mola-Bola/prata-raja-app` is public with owner approval; current main Actions run `38392841711` succeeded. Other private repositories' billing status does not block this app.
- Feedback digest is empty. Only the owner tests, primarily in the browser. Web-only shipping; no APK/Android OTA without a new owner request. See `DIRECTION.md`, `docs/FLEET.md`, `docs/HANDOVER-CODEX.md`.
- Preserve `codex/polish-combat-1` at `5a4a12e`: boss movement slow experiment fails two 300-seed gates (ch1 two-bread 39.33%; ch2 four-bread 67%). Do not merge, loosen tests or retune unrelated content to admit it.
- Next: finish fleet and feedback steering loop → Test Kitchen → dip families/tags → measured decelerating knockback (same displacement), then separately lunge/recovery or attacker budgets → jobs/drinks. Damage/RNG rewrites are optional later architecture.
- No scheduled continuation has been established. Finished older worktrees are retained pending clean-state verification; run `git worktree list` for current workers.

## QA debt
- No real-phone/browser-device pass yet (notch, haptics, FPS). Prior localhost browser access was denied; do not bypass it. Analytics replay bandwidth remains a playtest consideration.
- Economy pacing needs playtest evidence (~400 coins/win, training maxes in 10–15 runs); gear-look art is not wired.
- `save.ts` accepts date-only lastPlayed values. Legacy zero-run saves may see the skippable prologue once (accepted).
- Owner identity and threaded game feedback remain to implement with existing server security and migration gates.
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
