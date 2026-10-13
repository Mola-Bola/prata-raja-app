# Fleet operating model (owner direction, 13 Oct 2026)

> CI works again for Prata Raja: `Mola-Bola/prata-raja-app` was made public on 13 Oct (owner OK; secret scan of all branches clean), so its Actions run free; first run green (quick 1m28s, pgTAP 1m55s). Other Mola-Bola repos stay private and billing-blocked.

Prata Raja is built by a **Codex fleet** that runs itself. The owner keeps one **main Codex session** for talking to them; everything else is delegated. The owner is the sole playtester; browser web is the primary target. Speed of iteration beats ceremony.

## Roles
- **Main session (Comms + lead):** the only one that talks to the owner. Turns owner notes (chat + in-game) into ledger rows, sets priorities, spawns and stops worker sessions, merges and ships, reports ~5 lines with what to tap. Model: `gpt-6.1-sol` high for planning/review.
- **Worker sessions:** `codex exec` in their own worktree (`~/prata-raja-<name>`, branch `sol/<name>`), each may use its own sub-agents. Model by task: Sol medium for builds/integration; cheaper/faster models for content, copy, slicing, research; Sol high for independent reviews. Codex Cloud (Codex is connected to GitHub) for heavy or long jobs so the Mac stays free.
- **Background verifier:** after every ship, runs the full checks (`check.sh --web`, 300-seed balance, read-only Codex review of the shipped diff) and files any regression as a top ledger row; fix forward with another quick web release.

## The ledger (single source of truth, prevents overlaps/reversals)
- `.fleet/ledger.db` (SQLite via `node:sqlite`, atomic claims) + a human view `docs/LEDGER.md` regenerated on change. Rows: id, source (owner chat / in-game note id / audit / verifier), intent (one line), **owned files/areas**, depends-on, status (open → claimed → building → shipped → verified / dropped), worker, branch, release, **decision notes** (why, what was rejected).
- Before starting, a worker writes its intent + owned files; the lead (or Jev, below) checks it against in-flight rows and recent decisions in `DIRECTION.md` / BACKLOG. Conflicts are resolved before code is written: no two workers on the same files, no undoing a recorded decision without a new owner note.
- Every owner note gets a row and a visible status back to the owner (see feedback below).

## Shipping: fast lane by default
- **Web-only shipping (owner, 13 Oct):** ship the web build alone: `SKIP_DB=1 ~/cell/akit/akit check` → stamp → `~/cell/akit/akit ship -- node scripts/publish-web.mjs --label "$(node scripts/ship-cloud.mjs --next-label)"`. No Android OTA/APK unless the owner asks (they play in the browser only; same feel, fastest loop, half the build work).
- Ship web as soon as a slice works: `npx tsc --noEmit` + `npx vitest run` (or the touched tests) → `SKIP_DB=1 ~/cell/akit/akit check` → stamp `.akit/reviewed-<sha>` with "fast lane: post-ship review queued <ledger id>" → `~/cell/akit/akit ship -- node scripts/publish-web.mjs --label <selected-label>`. Batch small slices into one web release when they land close together; several releases a day is fine.
- Full e2e, balance and reviews run **after** the ship (background verifier) and in CI (working for this public repository). Regressions → quick fix-forward web release; a bad build can be rolled back by shipping the previous label's commit.
- Hard stops still apply: no native/runtime changes or new native modules without the owner (APK); no database migrations without the normal applied-and-fingerprinted path; never print secrets; never pay-to-win.
- Push main after every ship; push worker branches; read `gh run list -R Mola-Bola/prata-raja-app -L 3`.

## In-game feedback = the owner's steering wheel (polish it first)
- "Tell Kannan" becomes a direction channel: one tap from anywhere (pause, results, stall, Test Kitchen), with an auto screenshot + game context (screen, wave, build, version), kinds **Direction / Bug / Feel / Idea**, optional voice-to-text later.
- The owner's device is recognised as the owner (device allow-list or a one-time in-game owner code) → their notes are **approved directions**, not family triage.
- Notes show their **status back in the game** ("Picked up · building · shipped in 0.4.5"), and the owner can reply/comment on a note thread; the fleet answers in the same thread. Feed: `public.feedback` + the existing `game-feedback` edge function (extend it; migration path rules apply).
- The main session pulls notes (`node scripts/feedback.mjs digest`) on every loop, makes ledger rows, and acknowledges them in-game.

## Jev (fast closed-choice judge) in the loop
- Key: `~/.cell/typesafe.env` (`TYPESAFE_API_KEY`, never print). Reference client: `~/kampong/supabase/functions/_shared/jev.ts` (System One, ~0.3 s, fail-open); call ledger `~/Studio/data/jev/YYYY-MM.jsonl` (log calls there too). Wire a tiny `scripts/jev.mjs` for the fleet.
- Use Jev for closed choices only: classify a note (direction / bug / feel / idea); "same as ledger row X?" (dedupe); "does this intent overlap or reverse an in-flight row or a recorded decision?" (yes/no + which); route a task to a model tier; triage verifier output (regression? yes/no). Never for code, design or free text; on timeout fall back to the lead's judgement.

## Tooling the fleet owns (no owner action needed)
Worktrees + pipeline scripts, the ledger, CI workflow upkeep, Codex Cloud jobs, BrowserStack real-device checks (via whichever session has it), disk hygiene (remove merged worktrees and logs), art generation queues, OTA/web shipping. Owner-only: billing/spend, accounts and access, phone taps.
