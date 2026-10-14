# S2 integration report (branch `s2/stall`)

Status: superseded — shipped in 0.2.0.


Written 12 Oct 2026 by the S2 integration engineer, for the lead who takes over. Everything below is in the worktree
`~/prata-raja-s2`, committed on `s2/stall`. Nothing is merged into main, pushed or shipped.

## 1. At a glance

- `sol/hub` (Codex's stall hub UI, built on an old base) is merged into the real renderer / GameRoot, fixed up, and extended with the lead's
  five rulings and the owner's playtest fixes (targeting, danger cue, card text, title, boss crowd control).
- Checks on the final tree: `tsc` clean, `expo lint src` clean, brand lint clean, **vitest 569 tests in 40 files**,
  **Playwright 29/29** (`bash scripts/check.sh --web` equivalent, run against a fresh `expo export -p web`).
  Baseline when I started was 513 tests in 37 files. pgTAP not run (no Supabase involved).
- Codex review of the hub diff (`docs/reviews/codex-hub-1.md`): no P0, no P1; both P2s fixed (details in section 3).
- Not done: a pass on a real phone (Android WebView / the APK). Web only.

## 2. Commits on `s2/stall`

1. Merge of `sol/hub` (git merged it cleanly but the result did not compile: a duplicate `brandWords` import; that is the only change in the merge commit).
2. Sim: shoot attackers first, crowd-control rules (bosses never frozen or stunned, elites half, 3 s immunity), `hpPerWave` 0.27 -> 0.15, with tests.
3. Card text caps and the throttled hurt sound, with tests.
4. S2 stall integration: meta (`pendingChests`, coins-only calendar, wave-2 pay rule, tips), save store, hub, settings cog, loop sleep, danger cue, title, outline, e2e, docs, this report.

## 3. What changed

### Integration of `sol/hub` (first task)
- **Flow.** Title -> a first launch starts run 1 at once (no hub before it), a returning player's tap opens the stall -> wake-up screen with the payout
  -> "Daydream again" (new run with `computeLoadout(save)`) or "Back to stall" -> hub (scene art with a tap area on each prop, level bar "Next: <unlock> in N XP",
  coins, big Start) -> sheets: gear (wear / merge three / upgrade), training (buy / free respec), tip jar (idle collect), calendar (streak claim),
  chests (open with a shake-and-pop reveal), recipe book and Chef's Special as locked previews. Run 2 shows the loadout (max HP on the HUD).
- **Kept from main:** `paused` event, bundled fonts, brand words, HP pill CSS, quit = `runEnd` (End run pays and shows results; Codex's version skipped the payout).
- **Exactly-once payout:** a per-run ticket is spent before the payout is applied; a repeated `runEnd` (double tap, replay) pays nothing (e2e emits it twice).
- **Save:** `src/game/ui/saveStore.ts` is the only writer of `game:prata-raja/save`. Every change is a pure `src/meta` update applied to the NEWEST save
  (`commit(update)`), writes never overlap and are coalesced (the last commit always lands last), a failed write stays in memory and shows "Retry save",
  and a failed READ leaves the title on "Try again" and never becomes a fresh save (it would wipe the real one). `parseSaveV2` migrates 0.1.x v1 saves.
- **`pendingChests: string[]`** added to `SaveV2` (src/meta, with tests): a chest's item is owned the moment it is rolled (a crash cannot lose it) and stays off
  the gear rack until opened; `openChest`, equip/upgrade refuse closed items, parse prunes unknown uids. Day-7 gift chests go through the same box.
- **Renderer fixes found on the way:** `RunScene` read settings with the v1 parser (v2 saves gave default switches, so Sound and Haptics did nothing);
  `scene/hub` is DOM-only (kept out of GPU memory); `?bot=1` runs now start with the saved loadout; **GameRoot**: the canvas was an inline element that
  left 4 px of hidden scroll in the game box (a focus or scroll-into-view then shifted every screen 4 px; it flaked an e2e), now flex + clipped.
- **CSS:** Codex's stall CSS was overridden by GameUi.css (import order and equal specificity), which made the results panel scroll as a whole; fixed.
  The results panel fits on a 9:16 phone without scrolling (e2e).
- Codex P2s: daily chests now enter the reveal queue (persisted `pendingChests`); focus can no longer escape a sheet (hub behind it is `inert`, focus is
  pulled back when the focused button disables itself).

### Lead rulings (message 1)
1. **Calendar:** day 2 = 60 coins, day 5 = 120 coins; `tokens` removed from `SaveV2` (old saves with the field still parse). Labels and tests updated.
2. **No farming:** `applyRunResult` pays nothing (no coins, XP, chest, ingredients, no pity advance, no dice rolled) unless the run reached wave 2
   (`MIN_PAID_WAVE`). The run still counts in the records (runs, kills, best wave, last played, idle clock). The results say "Too short a daydream - no tips this time".
3. **Tips:** `result.gold` (in-run gold incl. the Tips bonus; the sim already adds 5 per cleared wave and 50 for a win) is added to the coins paid.
   Pay = 20 + 12 per wave cleared + 60 per boss kill + `result.gold`. The seed-3 bot win pays 407 coins (200 + 207) and 190 XP.
4. **Settings cog** (`hub/settings` art) on the hub top bar opens a sheet with the Sound and Haptics switches, the same save fields as the pause sheet (e2e).
5. **Loop sleep:** `RunScene.update` calls `game.loop.sleep()` whenever no run is live (title, hub, wake-up screen) after drawing one last frame;
   `start()` wakes it (re-measuring the canvas first). GameRoot's cleanup also wakes it, because `game.destroy()` only completes on the next step and a
   sleeping loop would never reach it (negative control: without the wake the e2e fails). Pause and the level-up sheet are live runs, so the loop stays awake.

### Owner playtest fixes (message 2)
1. **Targeting** (`src/core/sim/throw.ts`): an enemy in state `attack` (biting at the counter) is always shot first (nearest to his lane among them), then the enemy
   closest to the counter (lowest y), ties by |x - player.x|. Cluster/lob targeting prefers the blast with the most attackers in it, then most neighbours,
   then that same order. Nine tests (four fail on the old code).
2. **Danger cue:** `src/game/phaser/danger.ts` draws a pulsing red glow on the counter edge under every biter and a bobbing "!" in a red badge above its head
   (above the damage numbers' range); every drop in HP flashes the HP pill red and shakes it (two alternating CSS animations; HUD in `GameUi.tsx`);
   the `playerHurt` sound is limited to one per 450 ms (`admitSfx`, unit test). Reduced motion keeps the cue steady.
3. **Card text:** every line <= 8 words, <= 25 characters, no word over 10 letters (hyphens may break) - enforced in `cardText.test.ts`; an e2e measures that no
   card takes more than 3 lines at 360 px (Multitasker took 4; so did Roti Bomb at 26 characters).
4. **Title:** the round Start badge is now a wide chunky pill pinned near the bottom, tagline just above it, hero in view (e2e at 390x844, 360x640, 412x915).

### Boss crowd control (message 3)
- Bosses are immune to freeze and stun: a freeze, stun or Sugar Crash on a boss becomes a 40% slow for the same time and still shows its ice or stars.
  Elites (non-boss) are held for half the time. After ANY freeze/stun/crash ends that enemy is immune for 3 s (new status `ccImmune`, a brief white outline in the
  renderer). Chill and sugar stacks still build and are spent at their thresholds. A bread's own stun (Murtabak) follows the same rules.
  Code: `applyCc` in `src/core/status.ts`; `isDisabled` ignores bosses; `speedMul` applies the boss slow. 9 status tests + 3 sim tests (one replaces the old "a frozen boss does not run its attack timers").
- **Rebalance:** the old win rates were propped up by the perma-frozen boss. With the rules in, the 4-bread bot's win rate collapsed to 15%. I lowered chapter 1
  `hpPerWave` in 0.02 steps (0.27 -> 0.15, the first grid value in range). Table below.

## 4. Results

### Balance (bot, `BALANCE_SEEDS=300 npx vitest run src/core/__tests__/balance.test.ts --disable-console-intercept`)

| state | hpPerWave | 4 breads | 2 breads | solo |
|---|---|---|---|---|
| before any of this (main + hub) | 0.27 | 64% | 46% | 22% |
| + targeting (seeds 1-300) | 0.27 | 70% | 47% | 19% |
| + targeting (holdout 301-600) | 0.27 | 69% | 51% | 22% |
| + targeting + CC rules | 0.27 | 15% | 13% | 7% |
| sweep, same rules | 0.25 / 0.23 / 0.21 / 0.19 / 0.17 | 17 / 23 / 28 / 46 / 51% | 12 / 22 / 21 / 34 / 38% | 10 / 10 / 11 / 14 / 18% |
| sweep, same rules | 0.16 / **0.15** / 0.14 / 0.13 | 57 / **68** / 71 / 79% | 47 / **48** / 55 / 64% | 24 / **26** / 32 / 30% |
| **final** (seeds 1-300) | **0.15** | **68%** | **48%** | **26%** |
| **final** (holdout 301-600) | **0.15** | **67%** | **46%** | **29%** |

Final run detail (seeds 1-300): median wave 10 / 10 / 9, average level 11.7 / 11.5 / 9.7, average time 299 / 302 / 250 s, boss HP lost in wins about 65 of 100, all from boss shots.
Targets given: 4-bread 55-75%, 2-bread <= 60%: both met on both seed ranges.

### Playwright (29 tests, `e2e/web`)
auth 3, launch 2, shell 1, smoke 1, `play.spec.ts` 8 (title -> start -> drag -> card -> pause -> End run on wave 1; page hidden + fonts; bot to wave 3;
title layout x3; card text wrap; danger cue + HP pill), `stall.spec.ts` 14 (bot run 1 pays once with the exact formula, every sheet, a training step, run 2 HUD 110 HP,
run 2 ended early pays once; first launch / returning / v1 migration; unreadable save; failing write + retry; day-7 chest across a restart; wave-1 run pays nothing;
settings cog; loop sleep + teardown from sleep; results fit x2; hub hotspots line up on 360x640, 390x844, 412x915 and a notch).

### Screenshots (in the worktree, `.spike/` is gitignored, shrunk with `sips -Z 900`)
`.spike/s2-title.png`, `.spike/s2-danger.png` (cue + red HP pill), `.spike/s2-hub.png`, `.spike/s2-gear.png`, `.spike/s2-results.png`,
`.spike/s2-hub-360x640.png`, `.spike/s2-hub-390x844.png`, `.spike/s2-hub-412x915.png`, `.spike/s2-hub-390x844-notch.png`.
Regenerate: `RUN_SHOTS=1 npx playwright test -c e2e/web` against a web build (see below).

## 5. Decisions I made that you may want to revisit
- **hpPerWave 0.15** is a global fix for a boss problem: waves 2-9 are easier than the owner played them at 0.27 (wave 10 enemy HP x2.35 instead of x3.43).
  The alternative is to keep 0.27 and tune only the boss (King Cockroach hp 800, damage, cadence) with the same sweep harness (a ten-line vitest loop over
  `CONTENT.chapters[0].hpPerWave` / `CONTENT.bosses`; I deleted mine).
- A too-short run still increments `runs` (so a first-timer who ends run 1 at once goes to the hub next launch). Change in `applyRunResult` if you want the first-launch flow to repeat.
- Coin economy: with tips added a win pays about 400 coins, a loss at wave 5 about 105 + tips. `docs/research/engagement.md` pacing assumed about 120 per run;
  training now maxes (3,240 coins) in roughly 10 to 15 runs. Retune training costs or tips if that is too fast.
- The wave-2 rule stops instant End-run farming, but one chest, 50 XP and 32+ coins still arrive about 25 s into a run (wave 2 starts then). Pity-backed.
- The `ccImmune` outline is a white scaled copy of the body behind it (about 0.7 s fade at the start of the immunity and whenever a CC is turned away).
- Docs touched: `docs/SPEC.md` (flow, pay rule, targeting, CC, danger cue, hpPerWave), `docs/research/engagement.md` (ladder line). Not touched: `docs/CONTENT.md` (still says Mint Chutney "Freeze 1 s", Condensed Milk "1 s stun" without the immunity/boss rules).

## 6. Open issues
1. **No real-device pass.** Check on the APK: hub tap targets and label pills on a notch phone, loop sleep/wake (first frame after waking, rotation), haptics, the 450 ms hurt sound, the title pill with system bars.
2. **"Extra reroll" (stall level 4, `secondReroll`) does nothing**: `Loadout` has no rerolls field and `createRun` sets `rerolls: 1`. The hub still advertises it ("Next: Extra reroll in N XP"). Implement (core change) or drop it from `UNLOCK_TABLE`.
3. Phaser still renders at full rate behind a live run's pause sheet (intentional: a run is live). Titles and hub no longer cost battery.
4. `GameRoot` logs `[game] fps` every 5 s even while asleep (harmless, cheap).
5. Only the hub diff has had a Codex review. The save store, payout rules and the CC sim changes have not (slice rule: one review per slice).
6. `docs/CONTENT.md` out of date on CC (see above). `src/app/(app)/whats-new.tsx` release notes not written.

## 7. Exact next steps
1. `cd ~/prata-raja-s2 && git log --oneline -6` (merge + 3 commits on top of main's `b520031`), then `git diff main..s2/stall --stat` to read the change set (about 45 files).
2. Re-verify: `SKIP_DB=1 bash scripts/check.sh --web`. It needs a `.env`; this worktree has a gitignored `.env` with dummy Supabase values (the game route does not use them), the live checkout has the real one.
   Expect: tsc, lint, brand clean; vitest 569 passed; Playwright 29 passed (about 3 minutes; the bot run takes about 65 s at `speed=6`).
   Manual build: `npx expo export -p web --clear --output-dir dist && node scripts/web-pwa.mjs dist && node scripts/serve-web.mjs 9497`, then `APP_WEB=http://localhost:9497 npx playwright test -c e2e/web`.
3. Ask Codex for a review of `git diff main..s2/stall -- src/meta src/game/ui/saveStore.ts src/game/ui/GameUi.tsx src/core` (P0/P1 block).
4. Decide the open design items above (hpPerWave vs boss-only tuning, economy, Extra reroll) before shipping; if hpPerWave moves, rerun the balance table.
5. Merge `s2/stall` into main (no conflicts expected unless main moved), bump the version for the release, and ship through `app-ship`. Nothing native was added (JS and art only), so an OTA is possible; new APK only for the owner's phone install.
6. After shipping, watch playtest feedback on: boss difficulty (now a real fight, about 65 of 100 HP lost in a win), the title and card text on small phones, coin pacing.
