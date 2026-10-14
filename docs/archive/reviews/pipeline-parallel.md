# Parallel pipeline review (Haiku workers)

Date: 2026-10-14. Measured on `main` (f9725ba). Read-only review; no source edited.

## Measured

Largest source files (`wc -l`): actors.ts 915, RunScene.ts 868, GameUi.tsx 587, core/types.ts 491, sim/shots.ts 442, ui/fields.tsx 416, sim.ts 241, meta/runRewards.ts 69.

7-day churn (236 commits, 641 files), src only: RunScene.ts 16, GameUi.tsx 15, actors.ts 12, sim/hit.ts 12, GameUi.css 11, sim/throw.ts 7, sim/shots.ts 7, content/chapters.ts 7, runRewards.ts 6, status.ts 5, sim/enemies.ts 5.

Shared files with the highest churn overall, which parallel workers hit by appending: docs/HANDOFF.md 32, docs/BACKLOG.md 26, docs/LEDGER.md 19, package.json 21, app.json 20, package-lock.json 16.

## Why the five files collide

- GameUi.tsx: Title, Hud, Bar, LevelUp, CardButton, Pause and Results are all in one file, next to the shell with about 20 hub listeners. Any two UI tasks touch the same file and the same CSS.
- RunScene.ts: `handle()` (about line 540) is one switch over every event type, and each case calls a method on the same class. A new event means editing the switch and the class.
- actors.ts: the render loop switches on status id (about line 338). A new status touches this file and core/status.ts.
- sim.ts: already a thin orchestrator over sim/*. The conflicts come from the shared event union in core/types.ts and from hit/throw/shots, which every weapon or effect task edits.
- runRewards.ts: `applyRunResult` is the one function that folds a run into the save, so reward, chest and streak work all edit it.

## Concrete splits (move-only, no behaviour change, one PR each)

1. GameUi.tsx: move Title, Hud+Bar, LevelUp+CardButton, Pause and Results into src/game/ui/run/<Name>.tsx. GameUi.tsx keeps the shell and its listeners. Split GameUi.css the same way.
2. RunScene.ts: turn `handle()` into a map `Record<GameEvent['t'], handler>` in src/game/phaser/events/<kind>.ts. A new event is one new file plus one map line.
3. actors.ts: move the status-to-look mapping into src/game/phaser/statusLook.ts as a `Record<StatusId, Look>` table. A new status is one table entry. Move EnemyView out to its own file.
4. core/types.ts: move the GameEvent union into core/events.ts. Lower priority; only do it if event work keeps conflicting there.
5. runRewards.ts: leave as is until two reward tasks collide. Then move chest and streak folds into meta/rewards/<kind>.ts.
6. Content already has a registry (content/index.ts assembles per-kind files). Keep adding new breads, dips, enemies and lines as new entries in their own files.

Registry map lines are still shared. Git conflicts when two workers insert at the same spot, so the lead adds registration lines when merging.

## Process rules (lead)

- Every brief lists an Owns set. The lead rejects overlapping Owns sets before spawning.
- Workers never edit docs/HANDOFF.md, BACKLOG.md, LEDGER.md, package*.json or app.json. The lead applies those after merging.
- Workers report to docs/reviews/<name>-report.md. That is the existing convention in docs/PIPELINE.md.
- Note: docs/PIPELINE.md places slice worktrees as sibling `prata-raja-<name>` directories, not under .claude/worktrees. Pick one and update the doc.

## Worker brief template (10 lines)

```
Goal: <one observable change, one sentence>
Owns (the only files you may edit): <explicit paths>
Read first: AGENTS.md, DIRECTION.md, <2-4 specific files>
Do: <up to 5 numbered requirements>; out of scope: <files/features>
New behaviour goes in NEW files under <dir>; touch shared registries with one line only.
Never edit HANDOFF.md, BACKLOG.md, LEDGER.md, package*.json, app.json, or any file outside Owns.
Verify: npx tsc --noEmit; npx expo lint; SKIP_DB=1 bash scripts/check.sh; the named test files.
Git: branch sol/<name> from main in your own worktree; commit Owns only; git push -u origin sol/<name>. Never merge, force-push or ship.
Report: docs/reviews/<name>-report.md, at most 20 lines: files changed, checks run and results, anything needed outside Owns (stop and report, do not guess).
```

## Haiku vs Sonnet

Haiku handles well:
- Move-only splits of a component or module into a new file, with no logic change.
- Adding a new file that fills a defined interface: an enemy, status, sound, breads or dips entry.
- Content data edits that follow an existing schema.
- CSS, copy and brand-token edits in owned files.
- Unit tests for pure functions with a written spec.
- Fixing type and lint errors in owned files.

Needs Sonnet (or the lead):
- sim step order, RNG draw order, or anything the replay/seed determinism relies on.
- Changes to the GameEvent union or other cross-file contracts.
- Save/reward migrations (meta/migrate.ts, applyRunResult).
- Balance tuning.
- Phaser lifecycle or render-timing changes in RunScene/actors.
- Bugs with an unknown root cause.
- Reviewing or merging other workers' branches.

## Expected effect

With disjoint Owns sets and the splits above, conflicts should fall from whole-file collisions to single registry lines and the shared docs. The lead handles those.
