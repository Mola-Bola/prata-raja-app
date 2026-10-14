# Malleable dev flow: how small indie devs keep games easy to change

Checked 2026-10-14. Repo facts: Expo + Vitest (`package.json`), `posthog-js` in use, no feature-flag calls in `src/` yet, no state hash in `src/core`. Existing: `src/content/*.ts` tables, `src/core/kitchen.ts` (absolute knobs, seeded config), `src/game/ui/Kitchen.tsx`, `src/core/autoplay.ts` (bot for balance sims), `src/core/soak.ts`, PostHog events in `src/game/telemetry.ts`. Primary-source gaps: Slay the Spire 2019 talk slides and Dead Cells tooling not found (GDC Vault members-only); Vlambeer "Juice it or lose it" talk not confirmed by a URL.

Ranked by value per effort. Top 3 at the end.

## P1. Numbers live only in data tables (already partly true; enforce it)
- Source: [Grim Horde devlog, "fast iterative design process"](https://redkoibox.itch.io/grimhorde/devlog/361615/how-we-build-our-fast-iterative-design-process): every minion and structure parameter loads from external JSON, so experiments need no new builds. Also [balancing with spreadsheets](https://bugnet.io/blog/balancing-your-game-with-spreadsheets) (generic).
- Apply: `src/content/breads.ts`, `dips.ts`, `enemies.ts`, `cards.ts` weights. Add a test that fails if `src/core/sim*` contains a bare numeric literal that should be a content field. Effort: low.

## P2. Live knobs in the sandbox, plus a dev-only panel
- Source: [lil-gui README](https://cdn.jsdelivr.net/npm/lil-gui@0.17.0/README.md) (`gui.add(obj, 'key')`, dat.GUI successor); [Tweakpane on npm](https://www.npmjs.com/package/tweakpane) (richer inputs, bindings, plugins). Both are dev tools; wrap in a dev-only check.
- Apply: `src/core/kitchen.ts` already has `applyKitchenTuning` with `KITCHEN_LIMITS`. Extend `KitchenTuning` to every knob the owner tunes (enemy HP scale, spawn rate, dip link strength), generated from the content tables, and mirror them in `src/game/ui/Kitchen.tsx` through lil-gui gated on `__DEV__`. Owner playtests on a phone, so keep the sheet collapsed by default. Effort: low-medium.

## P3. Headless balance sims with per-build stats
- Source: [Slay the Spire metrics-driven balance, GDC 2019 (Game Developer summary)](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019): Mega Crit ran metric-first balance and a metric server through Early Access.
- Apply: `src/core/autoplay.ts` and `soak.ts` already run bots. Have `soak` emit one JSON row per (bread, dip, chapter): clear rate, median time, damage taken. Write to the scratchpad, not the repo. Agents read it before a balance round. Effort: low.

## P4. Feature flags for feel and UI only, default off, never in sim
- Source: [PostHog bootstrapping](https://posthog.com/docs/feature-flags/bootstrapping-and-local-evaluation): bootstrap values seed flags at init, but the next `/flags` response replaces them and removes keys missing from it. Use `posthog.overrideFeatureFlag` for local testing.
- Apply: flags in `src/game/` (juice intensity, HUD, card text) only. `src/core/` must not read flags, so replays stay deterministic. Read flags with a timeout fallback to the default. Kill switch for a bad build without a new OTA. Effort: medium.

## P5. Deterministic seeds and a per-tick state hash for bug repro
- Source: [Factorio FFF-188, "Bug, Bug, Desync"](https://factorio.com/blog/post/fff-188) (lockstep, desync reports with state dumps); [FFF-55](https://factorio.com/blog/post/fff-55) (per-tick CRC during team play).
- Apply: `KitchenConfig.seed` and the `kitchen` run config already give a repro key. Add a cheap FNV-1a hash of player/enemy positions and HP per tick in `src/core/sim.ts`, dev-only, and attach `{seed, config, inputs, lastHash}` to the feedback sheet (`src/game/ui/FeedbackSheet.tsx`). Effort: medium.

## P6. Assist and difficulty as data, not debug cheats
- Source: [Hades God Mode, Greg Kasavin (Inverse)](https://inverse.com/gaming/hades-god-mode-interview): an easy option that makes the player tougher (20% resistance, +2% per death, capped at 80%), chosen so enemies stay intact. Kasavin: "it's not easy to tune a video game."
- Apply: model "assist" as a content table entry (`src/content/passives.ts`) that the Kitchen and runs both read. Avoid a hidden cheat path that the owner forgets to remove. Effort: low.

## P7. Fun-first prototyping: juice before content
- Source: repo doc [game-feel.md §1](/Users/molabola/prata-raja/docs/research/game-feel.md) (hit-stop, squash, shake values) and its [Gamineai link](https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026). The Vlambeer-era "juice" talk is not confirmed here.
- Apply: tune feel with the P2 panel on a single bread in the Kitchen before adding content. Effort: low.

## P8. Telemetry dimensions for real players
- Source: same Slay the Spire summary (P3). Repo already sends PostHog events (`src/game/telemetry.ts`, `docs/TELEMETRY.md`).
- Apply: add `breadId`, `dipIds`, `chapterId`, `wave` as event properties on run-end. Compare against the soak table from P3 to find sim-vs-real gaps. Effort: low.

## P9. Export and import tuning as a JSON file
- Source: [Brotato BalanceMod](https://github.com/DarkTwinge/Brotato-BalanceMod): community mods override game tables from data files, a sign the tables are readable.
- Apply: "Export tuning" in the Kitchen writes the current `KitchenTuning` and content overrides to JSON; "Import" accepts a file. Owner can share a feel preset with an agent without a republish. Effort: medium.

## P10. Hot reload of data files
- Source: [Vite features, HMR](https://vite.dev/guide/features.html): HMR updates modules "without reloading the page or blowing away application state." This repo uses Expo, not Vite, so the equivalent (Metro fast refresh) is judgement, not verified.
- Apply: check whether a change to `src/content/*.ts` reloads in Expo web without losing the Kitchen run. If not, re-run the sandbox with the same seed on save. Effort: unknown until checked.

## Top 3 to build next
1. **P2** Kitchen knobs generated from content tables, plus a `__DEV__` lil-gui panel. Single biggest iteration speed-up; builds on code that exists.
2. **P3** Soak emits a per-build JSON table; agents read it before each balance round. Makes "is this too strong" answerable without playtests.
3. **P4** PostHog flags for juice and HUD only, default off, with a timeout fallback. Gives a kill switch and A/B of feel with zero sim risk.
