# Round 8 kickoff (paste-in brief for a fresh Opus session)

You are the Opus lead for Prata Raja (repo /Users/molabola/prata-raja, Expo web game, Phaser 4 + React overlay, deterministic sim in src/core). Fresh session, overnight build. The owner is asleep; work autonomously, ship each slice as it lands, and leave a morning report.

Read, in order: CLAUDE.md (rules + fast-ship flow), DIRECTION.md top entries (the 15 Oct "Fusion build decided" entry is the authority), docs/plans/round8-fusion.md (THE PLAN: 9 milestones), docs/wiki/index.md, docs/research/INDEX.md. Mockups: docs/superpowers/round7-hub.html (D1 walkable stall + D3 workbench + free-movement run HUD). Codex art: ~/prata-raja-assets/hub/out/ and ~/prata-raja-assets/out/ (read-only; convert/copy into assets/game/ and register in assets/game/manifest.json).

How to run the night:
- Turn the 9 milestones into ordered slices with owned files (RunScene.ts, sim.ts, GameUi.tsx are conflict hotspots: sequence those, parallelise the rest).
- Workers: Agent tool, model "haiku" for bounded UI/art/data, "sonnet" for sim/meta/save logic; each in its own worktree (`git worktree add -b claude/<name> .claude/worktrees/<name> main` + `ln -s /Users/molabola/prata-raja/node_modules node_modules`). Briefs name owned files, out-of-scope files, checks (`npx tsc --noEmit`, `npm run -s test:smoke`, touched vitest dirs, balance test for sim changes) and the rule: no code-drawn characters/scenery.
- Lead merges, runs tsc + smoke, ships with `bash scripts/ship-fast.sh` per slice. Check changed screens with `npm run snap -- --local` and fix obvious breakage.
- Hard stops (note for the owner instead): native modules/APK, DB migrations, .env*/keys, pay-to-win, monetization SDKs. Save changes only via idempotent, tested migrations in src/meta/migrate.ts that never drop data.
- Free movement stays behind a `controlMode` Tune toggle until balance passes (src/core/__tests__/balance.test.ts; teach the autoplay bot to kite).
- Update each component's wiki page + docs/wiki/log.md; cite research used. Run docs/MONITOR.md once mid-way with a haiku agent.

Finish with a ≤15-line morning report at the top of docs/HANDOFF.md (what's live with versions, what to try on the phone, what didn't land and why, decisions needed), then run the round-handoff skill.
