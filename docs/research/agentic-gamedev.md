# Agentic game dev: what worked, what failed (UI/feel coherence)

Researched 2026-10-15 (Exa + page reads). Question: why does our UI/HUD/feel stay messy after repeated "polish passes"? Evidence grade: **P** = postmortem with process detail or numbers; **A** = anecdote / thin / unverified.

## Cases

| # | Case | Stack | Topology | Coherence method | Outcome | Grade / source |
|---|---|---|---|---|---|---|
| 1 | F-Zero X 3DS port | C/C++ decomp, 3DS | 1 orchestrator, 147 subagents, 96 worktrees, 24 days, 223 human msgs | Human is the only eyes (SD-card loop); every lever has killswitch + receipt log line | Shipped. Open: markers in front of ships; two levers together destroyed the HUD; stereo silently off in one shipped round | P https://hypnotize.works/gdx-3ds/postmortem/agentic.html |
| 2 | Keikoku Camp (browser vlog sim) | Three.js, Rapier, 130 files | 11 agents, 3 days, `CONTRACT.md` file ownership, core files locked | Playwright 20 fixed-camera shots, 3 blind AI critics | Critics graded C for 3 rounds while fps rose; 13+ bugs all "written but not running" | P https://zenn.dev/yohsuke_zw/articles/0170dca5dcdae3?locale=en |
| 3 | Duskbound (ARPG) | TS, server sim, zod | 1 orchestrator, 41 Opus agents in waves, up to 10 parallel, 4h43 to prod, 98k LOC | UI kit as pure components + gallery so all panels share one system; each brief needs typecheck, tests, real-browser check | Shipped. Balance test passed while L1 heroes died (counted misses) | P https://duskboundga.me/blog/how-duskbound-was-built |
| 4 | Block Orbit + Gridrise (mobile) | Swift/Metal; RN/Expo/R3F | 1 human + Claude Code, 2 games / 2 months | Specific feedback only; CLAUDE.md + design docs | "Make it really pretty" fails; visual polish was the hardest area; fixes introduced subtle bugs | P-lite https://omar-alhaddad.com/articles/game-dev-with-claude-post-mortem |
| 5 | Tropic Tumble (mobile) | Godot 4 | Agents + human on real devices | Headless contracts + renderer screenshots at phone/tablet sizes; fresh post-change screenshot per fix; 8 regression cases | Scene tree passed while star overlapped score; hit area off the X; popup closed in one frame (touch leak) | P https://juliapottinger.com/what-ai-could-not-see-when-i-built-my-game/ |
| 6 | Pawn Stack UI pipeline | GPT-Image + Claude Code, Unity | 1 human, 102 images, 1h34 | Measured design-language sheet, shared UI kit, HTML mock first | Audit found 15 inconsistencies (3 "no ads" icons, 4 greens). Pasting real kit components fixed all; prompting fixed 12/23 | P https://sbsgames.dev/blog/ai-2d-ui-asset-pipeline |
| 7 | Second Chance dialogue UI | UE 5.8, Claude via 2 MCPs | 1 agent | Render widget to PNG; read values back | Builder said "created 10, 0 warnings" for a blank white panel; copying the oldest widget froze its flaws in all children | P https://secondchancegame.com/devlog/2026-08-06-dialogue-ui-rebuild |
| 8 | Godot to Unity port (dan-malone) | Godot 4.7 / Unity 6.7, 38k LOC | Agents in worktrees (cap 4 editors), blind-judge agents, playtest bot | Seeded headless bridge (92/124 tests); blind visual judging; API lookup tools + edit-guard hooks | Hooks + API tools "biggest gain"; stale engine APIs main failure | P https://www.dan-malone.com/blog/ai-agents-game-godot-to-unity |
| 9 | Doors XP (typing game) | Godot + godot-mcp | 1 agent, drives game via MCP | Screenshots 5-10 s each | Validation caught syntax only; balance by theory; no feel/art judgment | P-lite https://saschb2b.com/blog/godot-mcp-ai-game-creation |
| 10 | Coherent Labs, 3 UIs | Coherent GT, HTML/CSS | 1 agent + human specs | Design doc with closed rules; signed-off interactions; test phase gates (29 to 52 tests) | 8 RPG screens stayed consistent; centre circle an oval; hardcoded hex despite token; new overlay broke dashboard below, all checks passed | P https://guide.coherent-labs.com/building-with-ai/experiments/three-uis-with-an-agent/ |
| 11 | Solo MMO (rubes) | Rust + Lua | 1 human + Claude Code | Human playtest | Pixel assets individually fine, did not fit one style; hit delay 200 to 150 ms was a taste call | A https://rubes.dev/post/building-an-mmo-with-claude-code |
| 12 | Mario Galaxy clone | Three.js, Rapier, Pixi | 1 human, Opus, 53 days, 735 commits, 87 plans, 164-line CLAUDE.md | Plan + review skills | Level design failed; rules file grows and is partly ignored, must be pruned | A https://news.ycombinator.com/item?id=47600002 |
| 13 | Idle tower defence (buildaloud) | Phaser + ECS sim, Next PWA | Narrow sub-agents advise, human decides; Gherkin gates every merge | Everything drawn from glow primitives, no sprite pipeline (one look by construction) | 6 rounds in 3 weeks; 698 scenarios; first render O(N^2) | A (own blog) https://buildaloud.ai/blog/2026-06-16-building-a-game-with-claude-code-in-3-weeks/ |
| 14 | fly.pieter.com | vanilla JS, PHP | 1 human, AI in the loop, built live | None; tiny scope, one screen | $1M ARR claim in 17 days; driven by audience, not by quality (earnings unverified) | A https://levels.io/fly-pieter-com-vibecoded-flight-simulator ; https://www.404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont/ |
| 15 | GameGPT paper | Lua, 8 roles, reviewers | Manager + plan/task/code reviewers | Reviewer agents | Paper reports no quantitative eval and no UI study | P (negative) https://arxiv.org/html/2310.08067 |
| 16 | OpenGameEval | Roblox Studio | 13 frontier models, 113 tasks | Scripted checks, text only (no rendered frames) | Best 51.7% pass@1; no vision/layout failures measured | P https://arxiv.org/html/2610.02563v1 |

Supporting method pieces (not game cases): designfit (token + geometry checks beat screenshot diffs, +-2 px / dE<=2; https://dev.to/as9978/why-screenshot-diffing-ai-built-uis-thrashes-and-how-geometry-fixes-it-5967), playtester-vs-builder-vs-repair roles (https://huecki.com/en/blog/ai-built-ui-needs-a-playtester/, A).

Not found: any postmortem showing agent-only iterative "polish" converging on a coherent look. The cases that look coherent (3, 6, 10, 13) fixed the look up front in a kit, token sheet or primitive set.

## What worked

1. **Look fixed before building, as code components.** Duskbound's pure-component UI kit + gallery (3); Pawn Stack: pasting real kit components fixed every inconsistency, regeneration/prompting did not (6); Coherent: closed-rule design doc kept 8 screens consistent (10); glow-primitive-only art gives one look by construction (13).
2. **Written contracts + file ownership + frozen shared names** before parallel work (2, 3). Agents that find out-of-area bugs report file:line, they do not edit.
3. **"Done" = seen working in a real browser/device, with fresh evidence per change.** (3, 5, 2). Every Duskbound brief required typecheck, tests and a real-browser check; Tropic Tumble required a new screenshot per fix.
4. **Deterministic, structural checks over eyeballed screenshots**: geometry/token assertions with tolerances (designfit), scene dumps and read-back of applied values (7), seeded headless sim reused across engines (8), fixed-camera, same-conditions captures (2).
5. **Self-reporting changes**: killswitch + receipt log per lever proved each change engaged (1); "written but not running" is the dominant bug class (2).
6. **Tooling that stops stale knowledge**: API lookup tools + edit-guard hooks were the single biggest quality gain (8).
7. **Human as sole judge of feel/taste on a real device**, agents on structure (1, 5, 11). Specific feedback ("move X 8 px, use token Y") beats adjectives (4).
8. **Tests that measure what the player experiences** (landed hits, not swings) (3).

## What failed

1. **Vague polish requests.** "Make it pretty" gave weak output; visual polish was hardest; agents can't see the screen and fixes caused side-effect bugs (4). A: same pattern in 11, 12.
2. **Per-asset competence without a shared style**: individually fine assets that don't match (11); 15 inconsistencies in 12 AI-generated screens, model never flagged any (6).
3. **Green checks that prove nothing visual**: scene tree passed with overlapping icon (5); "0 warnings" blank panel (7); all checks passed while new overlay broke the screen under it (10).
4. **Implemented but not on screen**: 13+ bugs, none simple omissions (2). Fixes that were numerically meaningless (+-20% that measured +-0.3%).
5. **AI critics are good at symptoms, bad at causes**: three critics graded C three rounds running; their causal explanations were usually wrong (2). Four agents guessed wrong about one visual artefact (2).
6. **Copy-the-oldest-reference drift**: duplicating a widget froze the family at its first, flawed design (7). Prompting-based repair is lossy: one fix per call was worse than a batched fix list (6).
7. **Feature interactions regress the HUD**: two levers together destroyed it; one shipped round silently lost stereo (1). Parallel agents in one tree also swept in half-written work (3).
8. **Rules files rot**: growing CLAUDE.md partly ignored; keep only hard rules, prune (12).
9. **Screenshot-diff loops thrash** on anti-aliasing/sub-pixel noise; geometry/token checks converge (dev.to above, A with a tool demo).
10. **Mouse tests hide touch bugs** (popup closed in one frame from touch leak) (5).
11. **Academic multi-agent frameworks say nothing about UI quality**: GameGPT has no eval of visuals; OpenGameEval is text-only (15, 16).

## Implications for Prata Raja

1. **Stop "polish passes"; do one-surface rebuilds on a closed kit.** Define the full visual spec (type scale, spacing grid, radii, colour roles, icon set, motion durations) once in `src/ui/*`, publish a gallery route showing every primitive/state (Duskbound), and require screens to be composed only from it. Workers may not invent styles. (1, 3, 6, 10)
2. **Lint the kit, do not rely on review.** Add a check that fails on hex, raw px font sizes, off-grid spacing, or non-kit components in screens (we already lint brand and hex; extend to size/spacing/radius). Coherent's agent hardcoded a hex despite a token. (10, understandingdata lint-rule lead, A)
3. **Geometry assertions in Playwright**: per screen, assert bounding boxes (no overlap, inside safe area, >=44 px targets, text not clipped, baseline alignment) at 3 phone sizes + tablet, tolerance +-2 px. Replace "look at the contact sheet" as the gate. (5, designfit)
4. **Every slice has an on-screen receipt**: testID visible + state read back (value applied, not just call succeeded), and a fresh screenshot of only the changed screen, with the brief naming the expected values. (2, 5, 7)
5. **Briefs state exact deltas and tokens**, never adjectives; the lead or owner converts "feels messy" into a numbered fix list before dispatch. (4, 6: batched fix list beat one-per-call)
6. **Single-owner per screen and frozen contracts**: `CONTRACT`-style file listing which worker owns which UI file and which primitives are locked; workers report out-of-scope defects as file:line. (2, 3)
7. **Use blind multi-judge screenshot review only to find symptoms**, then verify causes by measurement; do not let critic grades steer fixes. Track per-screen scores to detect regressions. (2)
8. **Regression guard for HUD/overlay interactions**: a fixed scene matrix (hub, build, gift choice, run HUD with every status effect, results, modals stacked) captured under identical seeds/conditions each ship; diff geometry, not pixels. Two features together destroying the HUD (1) and overlay breaking underlying screen (10) are our likely failure mode.
9. **Real-phone touch pass by the owner per release** on a short checklist ("tap every control once"); web mouse tests do not cover touch leak or hit-area offset. (5)
10. **Make the newest approved screen the reference, not the oldest**, and keep a "golden screens" list in `docs/wiki/ui-system.md`; delete superseded variants. (7)
11. **Prune rules to the hard few** in CLAUDE.md/briefs and enforce the rest with hooks/lint (edit-guards, API-lookup helpers). (8, 12)
12. **Decide the look once with mockups (already planned v2 spec), then freeze it for N slices**: no restyle while building features; one human sign-off gate on the kit gallery before any screen is rebuilt. (6, 10, 13)

Skipped on purpose: GameGPT/OpenGameEval architectures (no UI evidence), levelsio-style single-screen vibe games (scope too small to transfer), Steam-in-10-days posts (no art/UI detail).
