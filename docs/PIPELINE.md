# Slice and release pipeline

Fast lane is the default; see the Fleet section below. The original rigorous
workflow described here is available with `--full` on both entry points.

Run from the repository; release runs only on clean `main`. No new dependencies.
Pipeline process tests have a 60-second per-test timeout for loaded Macs.
In a sandbox with shared read-only node_modules, run Vitest with
`--configLoader runner` (as check.sh does) to avoid its temporary config writes.
The controller commits/merges these scripts first; slices start from `main`. Brief template:
```text
Goal: one small, observable change.
Read: AGENTS.md, DIRECTION.md, docs/HANDOFF.md, relevant source/contracts.
Do: bounded numbered requirements; name files/features out of scope.
Verify: focused regression tests and any balance command/targets.
Report: docs/reviews/<name>-report.md; include a labelled Balance: line if relevant.
Never merge or ship. Pipeline handles full checks and commits.
```

```bash
bash scripts/slice.sh heat /path/heat-brief.md --dry-run
PORT=9501 bash scripts/slice.sh heat /path/heat-brief.md
# Parallel: distinct names AND ports; do not share briefs that own the same files.
PORT=9502 bash scripts/slice.sh links /path/links-brief.md &
PORT=9503 bash scripts/slice.sh story /path/story-brief.md &
wait
bash scripts/release.sh "Heat and links" --branch sol/heat --branch sol/links --dry-run
bash scripts/release.sh "Heat and links" --branch sol/heat --branch sol/links
# Add --minor for a minor bump; otherwise use ship-cloud's next patch label.
```
Slices create sibling `prata-raja-<name>` worktrees and `sol/<name>` branches.
They share node_modules and copy only local .env. With `--full`, they run
check.sh --web (SKIP_DB=1), review real P0/P1/P2 bugs, and allow one
fix/recheck/re-review round. The default uses quick checks and defers review.
After green local checks and review, slice pushes `git push -u origin <branch>`.
Reports/results live at `/private/tmp/claude-501/slices/<name>/`; exit 0 means green.
Release refuses stale/failed reports, conflicts and failed merged checks/akit check.
With `--full`, it reviews the merged diff, then commits
only the pipeline's version bump without another review. Checks and reviews are
bound to pinned commits; any HEAD change fails verification. It stamps that exact
HEAD and ships only through akit, then pushes `git push origin main`.
Neither path force-pushes. Push failures fail the command and preserve evidence.
Both record CI in `REPORT.md` using
`gh run list -R Mola-Bola/prata-raja-app -b <branch> -L 1`, filtered to the
verified head, with status, conclusion and run URL. A completed failure in less
than 10 seconds is reported as "CI refused by account billing". CI is a
nonblocking snapshot: queued/missing runs and lookup errors are reported; the
pipeline never waits for CI, including while billing is refused. Other CI
failures are reported for the lead to inspect, not treated as local slice failures.
Release reports remain under `/private/tmp/claude-501/slices/release-<timestamp>/REPORT.md`.
Web release refuses runtime/config/plugin/native source changes relative to both pre-merge main
and the common base of main and the slices (including on retries).
Dependency and lockfile changes (except root package version fields), native patches,
and EAS config changes are also refused conservatively: shared node_modules
cannot prove they are JS-only. Use the documented `--apk --cloud` path in
`docs/UPDATES.md` for these releases; this pipeline does not build APKs.
Codex uses gpt-6.1-sol (medium builds, high reviews), explicit git writable roots and ephemeral sessions;
Codex commits only in its own worktree, and only when the pipeline grants writable
git roots. Otherwise it edits only and the lead commits.
Network access is enabled (includes localhost); full checks and fallback commits run externally.
Config reference: https://developers.openai.com/codex/config-reference/
Capacity: five attempts (four retries), five minutes apart; other errors stop.
Disk: keep names unique; failed slices retain evidence for the lead to inspect.
Success removes merged clean worktrees and check/Codex logs; directory cleanup
requires ownership recorded in result.json, including the worktree. Unrelated `<name>-logs` directories
are preserved; small reports remain.
Pages race: release is locked across worktrees and waits for the exact published
SHA's Pages build + matching live HTML before cleanup; old chunks are already retained.
After failure inspect git status/logs before retrying; merges/version may remain,
ship may have partially published. Never blindly re-run shipping or force cleanup.

## Fleet fast lane (default)

Both entry points now default to quick checks. Slices run `check.sh` with DB
skipped, allow one fix round, push, and explicitly report review as deferred.
`--full` retains the previous pre-ship web check and read-only review path.
Release always keeps clean-main, exact branch/report HEAD, version-only bump,
release lock and native/dependency guards. Database migrations are refused;
use the normal applied-and-fingerprinted path. Neither mode permits Android
shipping. The selected label is passed explicitly to
`akit ship -- node scripts/publish-web.mjs --label <label>`.

After akit check, release creates a durable verification job and stamps the exact
HEAD with `fast lane: post-ship review queued <ledger id>`. Successful publishing
marks that job queued and launches it detached, before push/Pages propagation.
A queued job is **not** evidence of completed checks. Full-mode releases also
queue the 300-seed and post-ship checks.

Jobs and logs survive worktree cleanup and reboot in
`$(git rev-parse --git-common-dir)/fleet-verifications/<job-id>/`.
`job.json` records status, attempts, pinned base/HEAD, release, ledger id and port;
`result.json` records web, balance, findings and errors; `attempt-N/` preserves each attempt’s evidence. The verifier uses a fresh
detached worktree, local `.env` only, shared node_modules, and an available unique
port. It runs `check.sh --web`, `BALANCE_SEEDS=300` balance tests and a read-only
structured Codex review. Failures/findings create a high-priority investigation
row (without dirtying the shipping checkout; the lead regenerates `docs/LEDGER.md` after shipping); passing all three marks the verification row verified. Failed worktrees and
logs are kept for diagnosis.

Recover a queued/failed/interrupted job without publishing again:
```bash
node scripts/verify-fleet.mjs run <job-id>
```
A job still `awaiting-ship` refuses verification. If shipping succeeded but the
process died before recording `shippedAt`, the lead must first verify the publish
SHA/label and record that evidence before confirming the job as shipped. A crashed
verifier leaves `running/pid`; check the process is dead before removing that lock
and retrying. Never remove a live verifier's lock. Retry creates a new worktree;
existing failure evidence stays intact. Review findings and infrastructure errors
are investigation requests, not automatically established gameplay regressions.
