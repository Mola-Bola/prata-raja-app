# Prata Raja: Wood Legend — build plan

Lead plan, 15 Oct. Sources: v4-concept.md (direction), v2-concept.md (systems), v2-spec.md (operating model), fresh-start.md (project setup), the v4 page (art). Supersedes building on the 0.4.x codebase.

## Goal
A phone-first web game (Android later) where a Singapore prata man's night-time daydreams become a legend: throw, dodge and combo through nostalgic night streets, beat myth-blended bosses, and ascend through four routes and their ascendancies, built from wood and paper cut-outs that feel hand-made and alive.
**Done for v1.0** = the owner plays it nightly by choice: 3 streets + bosses, all 4 routes to tier 3, 4 ascendancies, the Kitchen build with relics and sets, combos that read at a glance, and it feels crunchy on a mid-range phone at 60 fps.

## Project setup (Phase 0, ~1 session)
- New repo from the Cell starter (`akit new-app`), working name `prata-legend`. Old repo keeps running 0.4.x untouched.
- Backend: existing Prata Raja Supabase project (owner decision). One new save table for the new game (migration on the owner's go). Same login wall, owner list, feedback, analytics.
- Web: a new path or subdomain next to the old game.
- Steering: CLAUDE.md ≤ 30 lines, DESIGN.md (one-page concept + frozen look), docs/screens/*, docs/research (copied). No wiki yet.
- Stack: Expo web shell + Phaser 4 + TypeScript. Deterministic sim in `src/sim` (pure TS, seeded RNG, tested). UI: one kit; in-world UI drawn in Phaser, menus in one DOM layer built only from kit components.

## Pillars (every slice is checked against these)
Crazy throwing · Crunch · Combos you can see · Wood-and-paper hawker nostalgia · One cohesive world.

## Systems to build (and what each needs)
| System | Core | Depends on |
|---|---|---|
| Movement & throwing | joystick-anywhere, auto-throw per roti type, flip throw, catch-back, dodge spray, Sizzler | sim, input |
| Crowd | spatial-hash separation, ring slots, flanking, hard cap | sim |
| Statuses & reactions | Dough / Wet / Burn / Crisp; six reactions; combo stamps | damage pipeline |
| Damage pipeline | base → conversion → increased → more → crit; pierce falloff | stats |
| Bosses | arena lock, telegraphs, phases, milestone reward | sim, puppets |
| Puppet rig | bone hierarchy for cut-outs, tweened, paper flutter | renderer |
| Legendary parallax | grain layers masked by sprite alpha, tier-based | shader |
| Build (Kitchen) | roti, katori dips, 5 gear slots, sets, one relic, live stat card with before → after | meta, stats |
| Routes & ascendancies | milestone-unlocked tiers, two ascendancies per route, skill board | meta |
| Progression | levels (small, steady) + milestones (bosses, chapters, combos, relics) | meta, story |
| Home (void deck) | walkable, 4 stations, one next step | hub scene |
| Story | a chapter per street, regulars, dawn bookend | content |
| Saves | one writer, versioned, cloud sync | Supabase |

## Phases (each ends with something the owner plays on the phone)
**Phase 1 — Look lock (1 session).** Owner picks the wood material and the starting Kannan. Build the kit gallery page (type, colours, panels, buttons, icons, frames) and a 10-second "feel reel" in Phaser: Kannan puppet walking with parallax grain, throwing, a pest squash, CRUNCH, splat, dough wrap. Gate: owner approves look and feel once; it is then frozen.

**Phase 2 — Vertical slice (2–3 sessions).** Void-deck home → Kopitiam Street run (crowd, Kosong throws, Mint + Fish Curry statuses, Toasted/Steam reactions, one tiffin gift, Drain Serpent boss) → dawn results → milestone: Flipper unlocked. Everything at final quality, nothing else. Gate: all screen specs pass automatic checks + evaluator, owner plays 3 runs and says "more of this".

**Phase 3 — The build (2 sessions).** Kitchen screen (roti, katori, gear, live stat card), 4 dips, 6 gear pieces, Night Shift set, 2 relics, chests on results. Gate: owner can explain their build from the screen alone.

**Phase 4 — Routes (3 sessions).** All four routes to tier 3 with signature skills, the six reactions complete, skill board, milestone unlocks. Gate: four builds feel different within one run each.

**Phase 5 — World (3 sessions).** Hawker Centre (Queue Hydra) and Pasar Malam (Moth Queen) streets, puppet carts and props, story chapters, regulars, dawn bookends, sound pass. Gate: 3 streets, 3 bosses, a 30-minute evening of play.

**Phase 6 — Ascendancies & legend (2–3 sessions).** 4 ascendancies (one per route), tier-4 legends as run transformations, remaining relics and sets, parallax tiers 4–5. Gate: a Lv-high save feels mythic.

**Phase 7 — v1.0 polish (2 sessions).** Balance bands across builds, onboarding (first 15 minutes), performance on a mid-range Android phone, accessibility (shape-coded statuses, reduced motion). Then swap: the new game becomes the live Prata Raja; the old repo is archived.

Later: remaining ascendancies, Wet Market (Minotaur) and Food Street (Kraken), hawker village growth, day shift, async duels, Android release (needs D-U-N-S), cosmetics and rewarded ads (never pay-to-win).

## How we build (operating model, from research)
- One screen spec per screen with 5–10 checkable criteria; one builder per screen; the lead writes briefs with exact tokens, never adjectives.
- Kit-only UI; a lint fails on raw colours, sizes or non-kit components.
- Automatic gates per ship: typecheck, sim tests, Playwright geometry checks at 3 phone sizes (no overlap, nothing clipped, ≥44 px targets), a fixed scene matrix.
- A fresh evaluator agent (never the builder) plays and grades each screen against its spec; Clarity can veto.
- The owner plays signed-off screens on the phone; notes become spec edits or numbered defects.
- Art: Codex batches against DESIGN.md, reviewed on contact sheets before import; one material only.
- Ship each slice when it passes; research rounds when a slice hits an unknown.

## Decisions needed from the owner before Phase 0/1
1. Wood material (from the v4 page's six) and the starting Kannan (v3 page's eight).
2. Repo name and web address for the new game.
3. Go-ahead for the new save table in the existing Supabase project.
