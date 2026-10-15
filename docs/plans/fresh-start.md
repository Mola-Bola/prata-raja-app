# Fresh start: building the new Prata Raja without the old one in the way

Lead's honest assessment, 15 Oct. Question from the owner: when we execute the v4 concept, can it be clean, without lingering tests, scripts, steering files and housekeeping from the current game?

## Answer
Yes, but only with a new project. Inside this repo, every change has to get past ~1,000 tests written for old mechanics, 2,700+ lines of old CSS, 74-line CLAUDE/AGENTS files, 40 lines of DIRECTION history, a wiki of 25 pages about systems we are replacing, save migrations for old fields, and e2e specs for old screens. Agents read all of that and it steers them (this session showed it). A fresh project removes that drag.

## What carries over (by copying, not by inheriting)
- **Art:** the curated v3/v4 Codex sets (wood/cut-out characters, relics, world, props, bosses) and any v1 art that fits. Copy in by hand, one folder per kind.
- **Infrastructure:** start from the Cell starter (`akit new-app`), which gives the login wall, cloud save, feedback tab, version badge and ship gate without our accumulated rules.
- **Ideas, as references only:** docs/plans/v2-concept.md, v3-concept.md, v4-concept.md, v2-spec.md (operating model), and the research folder (agentic-gamedev, coherence-methods, engines-for-agents, combat-feel, readability-refs, onboarding).
- **Code, as reading material:** the deterministic sim (crowd separation, damage pipeline, free movement, gift pickups) can be ported piece by piece when a slice needs it, rewritten to the new design, with its tests rewritten to the new rules. Nothing is imported wholesale.

## What stays behind
Old tests, e2e specs, old CSS and UI, the wiki, BACKLOG/HANDOFF/INBOX history, the counter-era docs, save fields for systems we drop, old steering rules. They stay in this repo, which keeps running the live 0.4.x game until the new one is better.

## The new project's steering (kept short on purpose)
- `CLAUDE.md` ≤ 30 lines: stack, commands, ship flow, the five hard rules.
- `DESIGN.md`: the one-page concept (from v4) + the frozen look (material, palette, type, the kit gallery).
- `docs/screens/*.md`: one spec per screen with checkable criteria.
- `docs/research/`: copied, not rewritten.
- No wiki until there is something to document; a log of decisions only.

## Decisions the owner needs to make (hard stops)
1. **Project name and repo** (e.g. a new GitHub repo; the old one stays live).
2. **Backend (decided by the owner, 15 Oct):** NO new Supabase project. The new repo uses the existing Prata Raja Supabase project (same auth, owner list, feedback, analytics) with one new, separate save table for the new game; the live 0.4.x game keeps its own tables untouched. The table is a DB migration: the lead applies it only after the owner says go.
3. **Web URL:** a new path or subdomain for the new game while the old one stays up.

## Order of work (after the owner picks the material and the Kannan)
1. Lock the look: material, palette, type, a kit gallery page, owner approves once.
2. Vertical slice to final quality: void-deck home → one night street run (crowd, throwing, four statuses, reactions, one boss) → results → one milestone unlock (Flipper).
3. Widen: the Kitchen build screen, relics, the other routes, then ascendancies and story.
Each step follows the v2-spec operating model: screen specs, kit-only UI, geometry checks, a separate evaluator, owner plays on the phone.
