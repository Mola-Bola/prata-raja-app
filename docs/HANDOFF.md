# Prata Raja — handoff

## 14 Oct 2026 — live 0.4.5; continuous goal active

- Owner approved the continuous player-visible development goal in this Codex chat. It is active through the goal mechanism, not a scheduled heartbeat. Follow DIRECTION.md: complete playable loops, keep going across milestones, and involve the owner for consequential direction, access, phone taps or spend. Status questions must not silently stop development again.
- Live: https://mola-bola.github.io/prata-raja/ . Source `e060e3acf88bd282ed39a01ef79471ba76a4f1bd`; Pages `6cf8d2e3b434a36ecbce47f70f9c419c3ffcbbde`. Release controller verified exact built commit and matching live HTML. Runtime1; web only. 0.4.5 keeps three secondary stall actions in one row, clearing the chest hotspot on360x640.873unit tests, typecheck/lint/brand and20focused stall/Kitchen browser tests passed; all4hotspot sizes passed and the phone screenshot was inspected.
- Full post-ship job `.git/fleet-verifications/0.4.5-e060e3acf88b-bfe53be6-c547-4ae0-9a22-9a59479373c5/` (ledger30) is running. Do not claim full verification passed before reading its result. Branch CI for the layout fix passed; inspect fresh main CI after source pushes.
- 0.4.4 shipped Test Kitchen: stall entry or `?kitchen=1`, current rotis/dips/levels, repeatable seeds, wave/boss selection, live tuning/metrics and sandbox feedback context without progression writes. Its verifier passed300seed balance and read-only review (zero findings);49/50browser tests passed. The one failure was the stall hotspot overlap now fixed in0.4.5; retain the failed job/evidence honestly.
- Current product slice: `sol/dip-tags`, ledger28, explicit Solmedium worker. Adds roti tags/dip families, shared matching-bonus rules, visible Kitchen fit and compact normal-card metadata. Existing3linkable dips and2link cap remain. Matching links retain their25% effect bonus; deliberate Kitchen mismatches keep ordinary target-only effects with a no-bonus label; new normal-run links require a matching signature. Stat lines, simmer/quality and broader link slots remain future mechanics. Details in worker contract; do not claim shipped until released.
- Next after that slice: measured decelerating knockback with the same displacement, then separately attack/recovery windows or attacker budgets. Interleave visible feel work with dip tiers, mastery, gear and drinks as evidence warrants. Avoid architecture-first detours. Preserve the failed boss-slow experiment `codex/polish-combat-1` at5a4a12e; do not loosen its failed balance gates.
- Feedback categories, snapshots, private My notes, replies and current status shipped in0.4.3/0.4.4. Current edge handler deployed; new clients need it. Owner device pairing still awaits the requested browser tap and trusted-chat reference. Owner code remains unprovisioned. Latest digest at22:51UTC13Oct was empty. No production test note was sent.
- Fleet ledger/ownership, pinned verification, web release and background verifier are operational. Jev has mock coverage only; no paid call made. Use explicit Solmedium builders, Solhigh reviewers and cheaper bounded support workers; no inherited Astra or new frontier assignment without approval. `docs/LEDGER.md` is a snapshot; SQLite is authoritative.
- Historical0.4.3 verifier16 remains failed with explicitly recovered completed evidence. Its status/fallback findings and false-capacity retry issue were fixed and verified in0.4.4; investigation21 is closed. The0.4.4 controller recovered after an unrelated cloud CLI createderror.log following successful publish; durable release-recovery.json records that. Keep cloud CLI probes outside shipping checkout during gates.
- Codex Cloud environment and BrowserStack access remain unavailable; requested already, local fleet/CI continue. Clean merged Kitchen/retry worktrees removed; their branches/reports remain. Other worktrees, including parked experiments and untracked handovers, are preserved.

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
