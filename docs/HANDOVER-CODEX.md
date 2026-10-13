# Prata Raja — consolidated handover to Codex (13 Oct 2026, evening, Sydney)

One packet for the next Codex lead. It merges (A) the Claude desk session (0.2.0 → 0.4.1, research, CI, pipeline) and (B) the owner's Codex "Astra" round (0.4.2; its original packet is preserved below as section B, verbatim). The owner is moving the lead seat to Codex (more usage there); Claude is near its weekly cap. **You are the lead now. Decide and move; ask the owner only for tools, access, phone taps or spend.**

## Start here (in order)
1. `AGENTS.md` (rules + CI duty), `docs/DIRECTION.md`, this file, then `docs/HANDOFF.md` top block. Older dated blocks in HANDOFF/ROADMAP/BACKLOG may be stale — trust git and the live site.
2. Verify: `git -C ~/prata-raja log --oneline -5` (main was `62b4d90` = 0.4.2 = origin/main), `git worktree list`, `git branch --no-merged main`, live https://mola-bola.github.io/prata-raja/ at phone size.
3. Close the open items below in order, then continue the next rounds.

## Owner direction (decided; notes are intent, not spec)
- **New 13 Oct (top priority for design):** rotis = main weapons, dips = tiered PoE-style gems, themed enhancements: `docs/BUILDS.md`; sessions lead in every domain (`DIRECTION.md`).
- Never pay-to-win; progression never gated by money; less Archero, its own game. Monetisation only if it takes off, and fair (cosmetics, supporter pass, convenience, buy-once OK; never power).
- PoE-style layered builds: persistent signature bread / gear / job tree / drinks-as-flasks + in-run cards that chain off them; easy start, deep end. Foods as skills (murtabak, appam, idli, vadai…). Plan: `docs/DEPTH.md`, `docs/ROADMAP.md`, `docs/OWNER-SUMMARY-DEPTH.md`.
- Playstyle stays malleable (the move/stop-to-throw loop is a prototype for finding the feel). Polish visuals, physics, animation, mechanics in small playable rounds.
- Research inputs: `docs/research/*` incl. `decomp-mechanisms.md` (rebuild ideas from decompilations; never copy code), owner clips `docs/research/owner-refs-2026-10-13.md`.
- Owner's Prata Raja code is non-sensitive: pushing it and running it in cloud compute is fine.

## Open items, in order (A = from the Claude desk)
1. **Verify 0.4.2 live** and update HANDOFF's top block (section B's first follow-up).
2. **A: branch `sol/hygiene`** (worktree `~/prata-raja-hyg`, based on `110fe62`): doc cleanup from three audits — one current HANDOFF top block, ROADMAP/BACKLOG marked shipped, DEPTH/SPEC/CONTENT banners, review-report "superseded" banners, `.codex*` scratch files ignored, CI triggers widened to `codex/**` + `polish/**`. Was being written by a Codex run at handover; commit what is there, merge onto current main (HANDOFF/BACKLOG will conflict with 0.4.2's edits: keep the newest facts from both), `git rm --cached .codex-brief.md .codex.done .codex.log`, push. Also fold in the QA debt list below.
3. **A: branch `sol/pipeline`** (worktree `~/prata-raja-pipe`): `scripts/slice.sh` (worktree → Codex build w/ capacity retry → commit → `check.sh --web` → read-only Codex review → one fix round → REPORT.md), `scripts/release.sh` (merge → version from ship-cloud's next label → akit check → pinned-HEAD stamp → ship → Pages verify → cleanup), `docs/PIPELINE.md`. Two independent high-effort reviews: all P1s fixed, re-review clean. A last Codex run was (a) fixing 12 `scripts/__tests__/pipeline.test.ts` timeouts under the full suite and (b) adding: slice pushes its branch + records CI status; release pushes main + reports CI. Commit, run `npx vitest run` + both `--dry-run`s, merge, push. Then use it for every slice.
4. **Swarm (owner asked):** after the pipeline lands, add a ledger-driven worker swarm: SQLite ledger (`node:sqlite`, atomic claim) with rows {brief, owned files, status, worker, result}; N=3-4 `codex exec` worker loops in their own worktrees/ports claiming non-overlapping rows; the lead writes contract-first rows and merges/ships in batches. Heavy browser checks stay with the lead or CI.
5. **Compute offload (owner asked):** (a) GitHub Actions are refused by **account billing** for every Mola-Bola private repo (owner must fix billing — spend). Option to propose to the owner: make `Mola-Bola/prata-raja-app` public (free standard runners) after a full-history secret scan — needs the owner's explicit yes, it is effectively permanent. (b) Try Codex Cloud for heavy build slices. (c) Use the connected BrowserStack MCP for the missing real-phone pass. (d) Codespaces share the GitHub billing block and need `gh auth refresh -s codespace`.
6. **Next game rounds:** section B's next bounded round (decelerating knockback, same total displacement, measured vs baseline; then telegraphed lunge/recovery windows or simultaneous-attacker budgets, one at a time, 300-seed comparisons). Then ROADMAP 0.5 (jobs + drinks). Keep `codex/polish-combat-1` parked (balance gates failed; don't loosen tests).

## QA debts (audit 13 Oct; none are regressions)
- No real-phone pass (APK/WebView, notch, haptics, fps). Replay costs ~1 MB/min with Analytics on by default (consider off by default for kids' phones).
- `docs/CONTENT.md` stale: CC rules (bosses never frozen/stunned, elites half, 3 s immunity, running freeze/stun never extended or chained), King Cockroach 480 HP + Antenna Volley, Burger Baron 2500 HP, hpPerWave 0.15 ch1 / 0.21 ch2, card text caps.
- Economy pacing (~400 coins/win; training maxes in 10-15 runs) — retune with playtest data. Gear-looks art not wired. `save.ts` lastPlayed accepts date-only strings. Legacy saves with 0 runs may see the skippable prologue once (accepted). Owner decision pending: in-game notes filed as owner-approved vs family triage.

## Rules that bit us today (keep)
- Codex `workspace-write` cannot write `.git` in a linked worktree: grant git writable roots (the pipeline does) or let the lead commit. Codex can't run Playwright/serve in its sandbox: the lead (or CI) runs `check.sh --web` with a unique `PORT=`/`LOGS=`.
- `codex --search exec …` (flag before `exec`); retry on "model is at capacity" every 5 min.
- Disk is tight (~4-6 GB free): remove merged worktrees and `/private/tmp/*-logs` after checks; avoid redundant web exports.
- Right after a Pages publish, a stale chunk could blank the web page; 0.4.0 keeps old `_expo/static` files and auto-reloads once.
- CI duty: push finished branches, read `gh run list -R Mola-Bola/prata-raja-app -L 3`; push main after every merge/ship. A run failing in 2-5 s = billing, report it, don't ignore it.
- Ship only via `SKIP_DB=1 ~/cell/akit/akit check` → `.akit/reviewed-<sha>` → `~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --notes "…"`; never `--apk` unless native changed (runtime bump + owner OK).

## Owner to-dos (only they can)
- Fix GitHub billing (github.com/settings/billing) so Actions run; decide on making `prata-raja-app` public.
- Free disk space on the Mac.
- Copy `~/Backups/prata-raja-secrets-2026-10-12/` (release key backup) off the Mac.
- Answer when convenient: chapter 3-5 Singapore places; which foods/drinks to get exactly right before their art.

---

# Section B — the Astra round's packet (verbatim, 13 Oct)

13 October 2026, Sydney. The owner explicitly asked the new Astra task titled **Await instructions** to take over and continue all work. Target task ID: `01a134f5-b521-7591-89f0-bbcdd6f048e5` (the new 13 October task, not the older task with the same title). Source task: `01a1345b-3a00-78b3-8176-3c3eb6b343c7`.

**The direct handoff message was NOT delivered:** `send_message_to_thread` returned “MCP tool call requires approval, but approval policy is never.” The source session stops at this checkpoint; it will not continue concurrent edits. This file is the complete fallback packet for the owner to pass to the target. No further owner approval to start is needed once the owner supplies it to that session. Respect that session's actual permissions; do not bypass denied operations.

### Owner intent

Build and continuously polish visuals, physics, animation, mechanics and skills in small playable rounds. Owner gives high-level directions, whims and intentions. Use relevant-model subagents with bounded ownership; Sol medium worked for implementation and Sol high for independent review. Keep playstyle malleable: the current Archero move/stop-to-fire loop is a prototype for finding the feel, not a fixed design. Prioritize a faster playtest/feedback loop. No paid power. Report meaningful progress frequently and results concisely.

### Start here

Work in `/Users/molabola/prata-raja`, not the target task's projectless cwd. Read `AGENTS.md`, `DIRECTION.md`, `docs/HANDOFF.md` (top block), and `docs/CONTRACTS.md`. Consult `~/WORKSPACES.md` if needed. Older handoff/roadmap blocks are stale; verify live Git state.

The owner specifically supplied Claude's `docs/research/decomp-mechanisms.md`. It has now landed and been merged. `docs/BACKLOG.md` records which ideas to explore and which already exist.

### Release checkpoint: 0.4.2 shipped

- Main source: `62b4d906e621980eeae4abb7c50c28317ae273cd`, pushed to private `Mola-Bola/prata-raja-app`.
- Existing akit ship completed successfully: “Recorded release 0.4.2 (ota)”, “Shipped 0.4.2 (ota, runtime 1) to production”, and “akit ship: done at 62b4d906e6”. No new APK/native build or database changes.
- Public built-files repository `Mola-Bola/prata-raja` published commit `3225b4c355d578f0cb4188b4084c6ce9b1b5062c` (`Publish Prata Raja web 0.4.2`). Game: https://mola-bola.github.io/prata-raja/ .
- Final Pages API check confirmed this exact public commit is **built**, with no error. Remaining verification is live HTML matching `.pages-build/index.html`. Do NOT blindly re-ship because cache propagation is pending; OTA, release record and Pages build already succeeded.
- First follow-up: update the top of HANDOFF from “candidate/pending” to verified live 0.4.2 after that check, commit and push the documentation. The source tree was clean at release. This handover file itself is intentionally uncommitted in the integration worktree, to avoid another approval prompt; preserve it or move its useful content into main's handoff.

### What shipped

1. Counter bread artwork dims while cooling and brightens as it becomes ready; a brief compression shows a throw. Reduced motion disables the new compression; continuously orbiting Vadai stays steady. Pickup/upgrade pops remain. Files: `src/game/phaser/stall.ts`, `RunScene.ts`, and focused stall tests.
2. Dip cards retain their effect beside “Linked to X” or “All breads”. The final implementation preserves original `cardView.line` and accessible-label contracts, adding optional effect/scope fields; the UI renders `effect ?? line`. Files: `cardText.ts`, `GameUi.tsx/CSS`, unit/browser tests.
3. Owner's provisional-control/iterative-polish direction recorded; Claude's research and CI instructions merged. Version roots in app/package/lockfile are 0.4.2; runtime remains 1.

### Verification and limitations

- Final clean main `akit check`: **755 unit tests**, typecheck, lint and brand checks passed. Database tests explicitly skipped (`SKIP_DB=1`); no database changes.
- Earlier integrated `check.sh --web`: **754 unit tests and 45 browser tests** passed, including expanded linked-card layouts at 320/360/390 widths. A subsequent compatibility correction restored old card-data assertions and added one test; it preserves the same rendered effect/scope output. Final 755-unit gate passed on integration and main. Do not claim a post-correction browser rerun.
- `node scripts/assert-guard.mjs a839d88` passes: no test weakening. Gitleaks scanned the pending source history and found no leaks.
- Independent Sol reviewer approved final code at `f280f41` including the 0.4.2 version bump and runtime preservation. `62b4d90` adds only handoff text. Review stamp/check stamps are in main `.akit`.
- Reports: `docs/reviews/polish-skills-1.md`, `docs/reviews/polish-visuals-1.md`. The skills report predates the compatibility restoration; final code/guard is authoritative.
- Logs: `/private/tmp/prata-raja-round-1-check`, `/private/tmp/prata-raja-round-1-final`, `/private/tmp/prata-raja-main-042`.
- Manual in-app browser access to `http://localhost:9591` was explicitly denied. Do not bypass that restriction through another browser mechanism. No manual visual inspection or real-phone test was completed; don't claim either.
- The ship process completed and no build job from this source session remains active. All subagents are finished.

### Excluded combat experiment — NOT release-ready

Branch `codex/polish-combat-1`, commit `5a4a12e`, worktree `/Users/molabola/Documents/Codex/prata-raja-combat-1`, backed up on origin. It makes boss charge, lane alignment and return movement honor existing status slow multipliers. It is NOT merged or shipped.

138 focused tests and typecheck passed, but full 300-seed before/after balance failed two gates:

- Chapter 1 four/two/solo win rates rounded: 56/44/21 → 56/39/20. Two-bread exact result 118/300 = 39.33%, below the 40% minimum.
- Chapter 2 four/two/solo wins: 190/107/36 → 201/125/42. Four-bread 67% exceeds the 65% maximum.
- Signature solo wins: Murtabak 33→37, Bomb 63→60, Appam 49→51. Boss times changed too; details in `docs/reviews/polish-combat-1.md` ON THAT BRANCH.

Preserve the experiment and report; do not loosen tests or retune all content merely to merge it. No confirmed new lane geometry defect: reviewer found that scaling x/y movement together preserves lateral correction per street distance. The established reason to defer is the balance impact.

### Worktrees and concurrent ownership

- Integration: `/Users/molabola/Documents/Codex/prata-raja-round-1`, branch `codex/polish-round-1` at `62b4d90`, already fast-forwarded to main; only this handover file is newly uncommitted.
- Finished skills worker: `/Users/molabola/Documents/Codex/prata-raja-skills-1`, branch `codex/polish-skills-1`, `f6cc338`; cherry-picked and corrected by `f280f41` in integration.
- Finished visuals worker: `/Users/molabola/Documents/Codex/prata-raja-visuals-1`, branch `codex/polish-visuals-1`, `15d5a69`; cherry-picked into integration.
- All four round/worker branches, including the excluded experiment, were pushed to the private source remote. Finished clean worker worktrees may be removed safely without force after checking; retain the experiment. Do not discard other worktrees.
- **Other desk owns** `/Users/molabola/prata-raja-pipe`, branch `sol/pipeline`, last observed `c2e16d4`. It contains slice/release automation, independent review fixes and tests; unmerged. Do not duplicate or overwrite it. Inspect before coordinating/integrating. Existing older worktrees also need verification before cleanup.

### Tooling and operational constraints

Expo57/Phaser4 with a pure deterministic TS core; Supabase OTA/feedback; EAS and Firebase family Android distribution; PostHog via fam-relay. Tests use local configuration only. Never print secrets. Release only through existing akit/app-ship procedure. No new native modules without owner approval.

GitHub Actions remains refused before starting due to billing/payments/spending limit, verified on fresh main runs. Local checks are the current gate. Do not change billing automatically. Claude updated AGENTS: push finished branches, inspect `gh run list`, and push main after merge/ship. Current workflows trigger main, `sol/**`, `s*/**`; `codex/**` worker pushes do not trigger them. Main source backup is now current, fixing the earlier 47-commit lag.

Disk briefly reached ENOSPC during this round. Approved old Prata Raja caches/traces were removed; separate cleanup also freed substantial space. Last reading after builds was about 5.2 GB. Avoid redundant full exports; preserve source, reports and unfinished work. Our worktrees symlink main's node_modules. Sandboxed Vitest needs `--configLoader runner` because default loader writes the shared `.vite-temp`; ordinary check.sh passed with permitted escalation.

The owner requested continuing roll-up updates. An hourly heartbeat creation attempt failed with “MCP tool call requires approval, but approval policy is never”; **NO automation was created**. Continue actively in the receiving task, or use supported scheduling only if its actual permissions allow. Do not assume recurring work is scheduled. Cross-session messaging also failed with the same approval-policy error, which is why the owner is passing this file manually.

### Next bounded round

After verifying 0.4.2 and updating the handoff, prototype **decelerating knockback with the same total displacement**, measured separately against the baseline. Then consider telegraphed lunge/recovery windows or simultaneous-attacker budgets one at a time, with 300-seed comparisons and phone feel checks when available.

The research note's swept projectile contacts and per-projectile hit tracking ALREADY exist in `src/core/sim/shots.ts`; don't rebuild them. Named RNG streams, damage stages and data-driven boss emitters are optional later architecture, not prerequisites for feel polish. Research marks some historical values unverified: use the ideas, don't copy code or silently adopt tuning. Signature access is currently stall L9; introducing it earlier is a separate product change, not part of this release.

The owner wants the receiving session to take charge and continue, without repeatedly asking them to reauthorize the same work.
