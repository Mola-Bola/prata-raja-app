# Pipeline process review (14 Oct 2026)

Basis: DIRECTION.md "Direction 2.0" and "Ship fast" (both 14 Oct, newest), AGENTS.md, docs/FLEET*.md, PIPELINE.md, HANDOFF.md, HANDOVER-CODEX.md, LEDGER.md, JEV.md, UPDATES.md, scripts (slice.sh, release.sh, pipeline.mjs, fleet.mjs, verify-fleet.mjs, jev.mjs, check.sh, ship-fast.sh), .github/workflows/check.yml and e2e-nightly.yml. Nothing deleted or edited outside this file.

Conflict to settle first: DIRECTION says ship with `scripts/ship-fast.sh`; AGENTS.md says "ship only through app-ship / akit" and requires `.akit/reviewed-<sha>` stamps. Pick one path. This review assumes ship-fast.sh.

## DELETE (Codex-era, retired by Direction 2.0)

| Item | Why |
| --- | --- |
| docs/FLEET.md, docs/FLEET-CLI.md, docs/PIPELINE.md, docs/HANDOVER-CODEX.md | Describe the Codex fleet, Sol models, billing-CI classification. Retired. |
| scripts/slice.sh, scripts/release.sh, scripts/pipeline.mjs (427 lines), scripts/__tests__/pipeline.test.ts | Pinned-HEAD review stamps, Codex calls, release locks. Owner waived this ceremony. |
| scripts/fleet.mjs, scripts/verify-fleet.mjs, scripts/__tests__/fleet.test.ts, verify-fleet.test.ts | Ledger and background verifier. One player: the ledger adds nothing. |
| docs/LEDGER.md, .fleet/ledger.db | Stale generated snapshot of a ledger nobody will maintain. |
| scripts/jev.mjs, docs/JEV.md, jev.test.ts | Never called for real (mock tests only). Triage is the lead's job. |
| .akit/reviewed-* (20 stamps) | Review stamps. Keep only last-ship.json. |
| scripts/assert-guard.mjs step in check.yml | Guards against weakened tests; owner accepts bugs. |
| Most of docs/reviews/*.md (35 Codex-era reports) | History is in git. Keep none in the working tree. |
| "CI duty" and "Fleet mode" paragraphs in AGENTS.md | Replaced by the new section below. |

## SLIM

- docs/HANDOFF.md: keep a 15-line "now / next / QA debt" block. Its 14-Oct dump is an ENOSPC log, not a handoff.
- docs/UPDATES.md (83 lines): keep the OTA/native-change rules and troubleshooting. Drop "Where things stand" and first-time setup (already done).
- scripts/check.sh: keep tsc, lint, vitest, brand, pgTAP. Drop the `--web` Playwright gate from the per-slice path; run it nightly only.
- Balance: `balance.test.ts` defaults to 20 seeds. 300 seeds only when numbers change.
- check.yml: keep quick (tsc, lint, vitest, gitleaks) and the conditional pgTAP job. Drop assert-guard.
- e2e-nightly.yml: keep as a nightly signal, not a gate.
- CLAUDE.md Expo section: keep the "fetch versioned docs" rule, cut the rest. AGENTS.md Cell/akit references: slim; ship-fast.sh does not need akit.
- scripts/ship-fast.sh: keep as the only ship path (it already requires a clean main).

## KEEP (still matters for a single-player game shipped by agents)

- Saves: src/core/save.ts, src/game/ui/saveStore.ts (one writer; never replace a failed read with a fresh save), save.test.ts. Progress is what the owner cares about.
- Login wall and owner-only notes (Direction 2.0), and the feedback channel (Tell Kannan, `scripts/feedback.mjs`).
- Secrets: `.env*` never printed or committed (`.gitleaks.toml`, gitleaks job in CI). The release key in ~/.prata-raja-secrets: the owner must back it up.
- No pay-to-win: a hard stop. Keep the sentence in CLAUDE.md. (No paid-currency code was checked in this pass.)
- Hard stops that need the owner: native modules or APK changes, DB migrations (pgTAP job runs only when supabase/** changes), secrets, spend.
- Expo-version rule and design baseline (colours only in src/ui/brand.ts, names only via src/brand.ts).
- Brand lint (scripts/brand-lint.mjs): cheap, catches stray names. Keep; warn, don't block.

## How we work now (draft for CLAUDE.md; not applied)

```
## How we work now (Direction 2.0, 14 Oct)
- Roles: Claude lead (Opus) plans, decides, merges and ships. Haiku workers build bounded slices; Sonnet for sim or risky logic. No Codex.
- The owner is the only player and tester. Web build is the target. Bugs are acceptable; fix forward.
- A slice is one visible change. The lead's brief names the files to touch and what is out of scope. Workers stay inside it.
- Before shipping: `npx tsc --noEmit` and the vitest files the change touches. Saves, login or migrations also need `bash scripts/check.sh` and a Sonnet review.
- Ship each slice as it lands: `bash scripts/ship-fast.sh` on clean main. No batching, no stamps, no ledger rows.
- CI runs on push. Read `gh run list -R Mola-Bola/prata-raja-app -L 3` only when a ship fails or the owner asks.
- Balance: `BALANCE_SEEDS=300 npx vitest run src/core/__tests__/balance.test.ts` only when numbers change.
- Owner notes (`node scripts/feedback.mjs digest`) are direction. Reply to the note when it ships.
- Hard stops, ask the owner first: native code or new native modules (APK), DB migrations, anything that touches .env* or keys, pay-to-win, and save-format changes.
- Saves: one writer (saveStore.ts). Never overwrite a failed read with a fresh save.
- Expo or React Native APIs: read the expo major in package.json and fetch the matching versioned docs first.
- Colours live in src/ui/brand.ts; names only via src/brand.ts; no hex in components.
- Never print or commit .env* files.
- Disk: keep 5 GB free. Remove a worktree once its branch is merged.
```

## Disk junk to clean (sizes from `du -sh`; nothing deleted)

Sibling worktrees, all but two on sol/* or codex/* branches. Check `git branch --no-merged main` before removing any.

- ~/prata-raja-contact-attack 61M (branch sol/contact-attack, rejected prototype)
- ~/prata-raja-flaky-measure 53M (detached at ef5226a)
- ~/prata-raja-feedback-followup 35M, ~/prata-raja-thosai-roll 35M
- ~/prata-raja-boss-finish 18M, ~/prata-raja-dip-plan 18M, ~/prata-raja-run-build 18M
- ~/prata-raja-assets 64K (not in `git worktree list`; inspect first)
- ~/Documents/Codex/prata-raja-round-1 35M, prata-raja-combat-1 18M, prata-raja-skills-1 18M, prata-raja-visuals-1 18M (codex/polish-* branches)

Inside the repo:

- .git/fleet-verifications 158M (9 job dirs; 3 detached worktrees for 0.4.6, 0.4.10, 0.4.11). Delete after recording any evidence still needed.
- .claude/worktrees 127M (7 agent worktrees on claude/* branches)
- .fleet 47M (archives 3.8M, ledger.db 108K)
- .git/worktrees 1.8M (metadata; cleared by `git worktree prune`)

Disk now: 6.8 GiB free of 228 GiB (df). HANDOFF.md reported ENOSPC near 171 MiB; re-check before assuming it is still live. Untracked docs/reviews/pipeline-feedback.md is not mine; left alone.
