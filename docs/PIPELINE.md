# Slice and release pipeline

Run from the repository; release runs only on clean `main`. No new dependencies.
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
They share node_modules, copy only local .env, run check.sh --web (SKIP_DB=1),
review real P0/P1/P2 bugs, and allow one fix/recheck/re-review round.
Reports/results live at `/private/tmp/claude-501/slices/<name>/`; exit 0 means green.
Release refuses stale/failed reports, conflicts and failed merged checks/akit check.
It reviews the full merged diff (including app.json and migrations), then commits
only the pipeline's version bump without another review. Checks and reviews are
bound to pinned commits; any HEAD change fails verification. It stamps that exact
HEAD and ships only through akit.
OTA refuses runtime/config/plugin/native source changes relative to both pre-merge main
and the common base of main and the slices (including on retries).
Dependency and lockfile changes (except root package version fields), native patches,
and EAS config changes are also refused conservatively: shared node_modules
cannot prove they are JS-only. Use the documented `--apk --cloud` path in
`docs/UPDATES.md` for these releases; this pipeline does not build APKs.
Codex uses gpt-6.1-sol/medium, explicit git writable roots and ephemeral sessions;
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
