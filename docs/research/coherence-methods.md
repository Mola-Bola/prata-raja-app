# Coherence methods: keeping a product whole when many agents build slices (research, 2026-10-15)

Problem: every slice is locally fine, the whole is visually/UX incoherent, polish passes do not converge.
Diagnosis (ours, not a source's): slices are judged against their own brief, nobody owns the whole, and "polish" has no
finish line. Games and agent teams fix this the same way: a small fixed reference defines "the product", every change is
checked against it, and one named owner holds each surface.

Sources read (snippet or full, via Exa; not all full-text): Anthropic, "Harness design for long-running application
development" (2026-03-24) https://www.anthropic.com/engineering/harness-design-long-running-apps ; Anthropic, "Effective
harnesses for long-running agents" (2025-11-26) https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents ;
GitHub Spec Kit docs https://github.com/github/spec-kit/blob/main/docs/concepts/sdd.md ; Scry Design Diff Eval
https://blog.scrymore.com/paper/ ; Tesoi, "Visual regression testing when an agent changed the UI" (2026-10-11)
https://laimonade.com/blog/visual-regression-testing-when-an-agent-changed-the-ui ; Into the Breach UI (Game Developer /
RPS, 2018) https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time- ;
Hades UI analysis https://teemo.dev/game-design/hades/systems/ux-ui-and-accessibility/ ; GDC Vault Riot talks
https://www.gdcvault.com/play/1024096/-League-of-Legends-Client , https://www.gdcvault.com/play/1026400/Building-a-Unified-Cross-Project ;
First Playable / vertical slice explainers https://gamedevnexus.com/guides/method-first-playable/ , https://learn.unity.com/tutorial/your-first-milestone-vertical-slice .
Not opened (titles only, so no claims made from them): the two Riot GDC talks' contents, 2XKO UI talk.

## Practices

Evidence grade: A = primary source states the result; B = credible practitioner write-up; C = industry folklore / our inference.

| Practice | Origin | Evidence it works | How to run it with agents | Cost |
|---|---|---|---|---|
| One-page design (pillars + "what we are not") | Game design docs; Spec Kit "constitution" is the software twin | C (universal habit); Spec Kit makes principles a gate every plan is checked against (A for the mechanism) | Owner-approved page of 5 pillars + 5 refusals, pasted into every brief; plan step must cite which pillar it serves | Low: one page, rarely edited |
| Art bible / UI style guide | Every studio; Riot's LoL client rebrand framed as "consistent and scalable brand identity" (GDC title only) | B | Already half-built: `src/ui/brand.ts`, `theme.ts`, CONTRACTS.md. Missing piece: a rendered "kitchen sink" page of every primitive in every state, which is both guide and test target | Medium once, then cheap |
| Shared UI framework across projects | Riot "Unified Cross-Project UI Framework" (GDC, title only) | C | Same as above; agents may only compose primitives. New visual need = request a primitive from the lead, not inline styles | Low (rule), medium (new primitives) |
| Vertical slice / first playable at final quality | Unity Learn; GameDevNexus ("publishable first playable": 2 levels, all local features, final-quality look) | B: stated as the milestone that proves the look and the build plan before scaling content | Pick ONE path (hub, build, run, results, gift) and bring it to final quality first; it becomes the reference every later screen is diffed against. Do not widen until the owner says the slice feels like the game | High upfront, saves rework |
| Greybox then art pass (and feature freeze before polish) | Level design standard; production milestones (alpha = content-complete, beta = polish only) | C | Two explicit phases per screen: layout/flow with placeholder tokens, owner or evaluator signs off, only then skin. After freeze, polish slices may not add elements, only fix listed defects | Low; the discipline is the cost |
| Clarity over cool ideas (UI as a hard constraint) | Into the Breach: "sacrifice cool ideas for the sake of clarity every time" | B (dev interview) | Put a one-line version in the pillar page; evaluator rubric has a Clarity axis that can veto | Free |
| Glance budget / info tiers | Hades: always-on, diegetic, one-press-away; sidebar trimmed in patches | B (analysis site, not Supergiant) | Per screen spec lists what is always visible, what is on demand; evaluator counts elements against it | Low |
| Screen spec with acceptance criteria | Spec Kit spec.md/plan.md/tasks.md; Anthropic feature_list.json with default-fail items | A for mechanism: Anthropic's harness uses a feature list where each item starts failing and must be verified by e2e test before flipping | One file per screen: purpose, one primary action, element list, states, tokens used, 5-10 checkable criteria (testID visible, tap target >= 44, text >= 13 px). Brief = spec link, not prose | Medium to write, cheap to reuse |
| Generator / evaluator split with graded rubric | Anthropic harness-design article: GAN-inspired; evaluator drives the live app with Playwright; subjective "is it good" turned into criteria (design quality, originality, craft, functionality), 5-15 iterations, stop on plateau | A (Anthropic Labs reports it lifted frontend quality over prompt-only) | Evaluator = separate fresh-context agent, never the builder. Default-FAIL per criterion; may not pass without opening a screenshot. Rubric includes "consistent with reference slice / kitchen sink" | Medium: 1 extra agent call per slice |
| Sprint contracts | Same article: generator and evaluator agree on "done" before code | A | Worker brief ends with 3-6 verifiable "done" lines the lead wrote; evaluator grades only those plus the global rubric | Low |
| Golden screenshots (visual regression) | Playwright `toHaveScreenshot`, Storybook+Chromatic, Percy | A for tooling; B for agent risk: the dangerous step is an agent regenerating the baseline to pass | Baselines live in repo; only the lead (or owner via digest) may update them; any changed image must be looked at. Cheap deterministic net for accidental drift, blind to "wrong but consistent" | Low-medium; flaky if animations not frozen |
| Vision-model screenshot review | Scry Design Diff Eval (311 pairs, 557 tagged defects) | A: best model found only ~40% of human-tagged issues | Use as a second reader, never as the sole gate. Give it the reference screen + spec + rubric, ask for defect list by tag (spacing, type, state, missing element). Expect misses; pair with token lint and golden diffs | Low per call; do not trust alone |
| Token/lint enforcement ("design system as code") | brand lint already in check.sh | B | Extend lint: no hex, no raw font sizes/radii outside theme, no Paper Button/Chip/Dialog, no inline spacing magic numbers. Violations fail CI, not review | Low, high yield |
| Progress log + clean state per session | Anthropic long-running harness: progress file, git history, feature list, incremental one-feature-at-a-time | A (their stated fix for "declares victory early" and one-shot attempts) | We have wiki/log.md and HANDOFF; add per-screen status (greybox / frozen / skinned / signed-off) in one table | Low |
| Single owner per surface | Studio UI owner / design lead; software code owners | C | One worker (or the lead) owns a screen file set for a round; other slices touch it only via a request. Stops two agents restyling the same screen differently | Low; costs parallelism |
| Mockup first, build the chosen one | Our own `mockup-first` skill; v2 two-look mockups | B (internal) | Keep: owner picks look from mockups, mockup frozen as the reference image for the evaluator | Low |
| Playtest script / bot run with contact sheet | Our `npm run snap` (god=1 at chapter points) | B (internal) | Make the contact sheet a gate input: evaluator reads the sheet against the screen specs, not just the owner | Already paid |
| Convergent polish: bounded, defect-listed passes | Beta "polish-only" milestones; Anthropic "stop when scores plateau" | A for plateau stopping; C for beta | A polish pass is a list of rubric failures with ids; closes when the list is empty or two passes in a row find nothing new. No list = no pass | Free, and it is the fix for non-convergence |

## Why our polish passes do not converge (inference)
1. No fixed reference: each pass compares to the previous build, so taste drifts.
2. Open-ended scope ("make it nicer") has no done condition; a list of failed criteria does.
3. Builders grade their own work; the harness article's core finding is that a separate, skeptical evaluator is what breaks the ceiling.
4. No owner per surface and no freeze, so slices keep restyling each other.

## Prata Raja operating model v2
1. Reference set (owner-approved once, then frozen): `docs/DESIGN-PILLARS.md` (5 pillars, 5 refusals, <= 1 page), the chosen v2 mockups as PNGs, and `/kitchen-sink` (every primitive, every state).
2. Screen specs: `docs/screens/<screen>.md` = purpose, one primary action, element list, glance tiers, states, 5-10 checkable criteria. Lead writes; owner reads only the pillars and mockups.
3. Status table in the wiki: each screen is greybox, frozen, skinned or signed-off. Only one screen group is "open" at a time.
4. Order: vertical slice first (hub -> build -> run -> results -> gift) to final quality; no new screens until the slice passes. Then widen screen by screen.
5. Roles: lead = specs, briefs with done lines, baselines, merge; Haiku worker = one screen's files in a worktree (single owner); evaluator (Sonnet, fresh context, never the builder) = grades against spec + rubric; owner = plays.
6. Per-screen gates: G1 spec exists; G2 greybox shown (screenshot) and flow checked against spec; G3 freeze, no element changes after this; G4 skin using tokens and primitives only; G5 evaluator pass; G6 owner play-through.
7. Verification loop per slice (automatic, before ship): tsc, token/brand lint (extended), smoke test, Playwright testID assertions from the spec criteria, golden screenshots of touched screens, then evaluator reads the screenshot plus reference and returns a default-FAIL checklist. Fail goes back to the worker with ids.
8. Rubric axes (score 0-10, anchors written once): Clarity (veto), Consistency with reference slice and kitchen sink, Hierarchy (one primary action), Craft (spacing, type, states), Function. Ship needs no axis below 7 and Clarity >= 8.
9. Baselines: workers may not update golden screenshots or specs; only the lead, after looking at each changed image.
10. Polish passes: only from a numbered defect list produced by evaluator or owner note; after freeze a polish slice may fix defects but not add elements; stop when the list is empty or two passes add nothing.
11. Owner touchpoints (minimal): approve pillars once; pick a look from mockups once per area; play after G5 and send a note; the lead turns notes into spec edits or defect ids, never straight into a worker prompt.
12. Cadence: each round names one open area, ends with an updated status table and log line; unrelated drive-by restyles are rejected at merge.
13. Do not build yet: Percy/Chromatic (Playwright snapshots suffice), a vision-model-only gate (Scry: ~40% recall), a full GDD.

## Used / skipped (per CLAUDE.md citation rule)
Used: Anthropic harness-design (evaluator, rubric, contract, plateau stop), Anthropic long-running harness (default-fail feature list, progress log), Spec Kit (constitution as pillars, spec per unit), Tesoi (baseline-update risk), Scry (vision reviewer limits), Into the Breach and Hades (clarity rule, glance tiers), vertical-slice explainers.
Skipped on purpose: Riot/2XKO GDC talk contents (not opened), Kiro (no primary source read), Percy/Chromatic (cost, owner is the only tester), full GDD (low value for one-person-owner team).
Open: whether Haiku can fill specs/rubric well enough; try one screen as a trial and compare to Sonnet before scaling.
