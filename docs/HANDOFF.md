# Prata Raja — handoff (rolling; replace the top block when state changes)

## 12 Oct 2026, ~20:45 — live 0.1.1 (runtime 1); lead = Claude Opus desk, Codex may take over

**Live:** web https://mola-bola.github.io/prata-raja/ · APK https://nzxgskzmofddxyjocduq.supabase.co/storage/v1/object/public/updates/apk/prata-raja-0.1.0.apk (OTA brings it to the latest) · Firebase App Distribution `app.prataraja` → group `family`.
**Infra:** Supabase `prata-raja` (`nzxgskzmofddxyjocduq`, ap-southeast-2; DB password `~/.cell/prata-raja-db.env`) · EAS `@uzzzy/prata-raja` · release key `~/.prata-raja-secrets/` (backup `~/Backups/prata-raja-secrets-2026-10-12/`, owner to copy off the Mac) · repos `Mola-Bola/prata-raja-app` (private), `Mola-Bola/prata-raja` (Pages) · inbox runner registered (`~/cell/runner/apps.json`, playbook `~/cell/runner/playbooks/prata-raja.md`, triage-first).
**Design:** `docs/SPEC.md`, `docs/WORLD.md` (stall-as-progress, worn gear, daydream map, place-true pests, themed powers, motion-comic story), `docs/BACKLOG.md` (owner notes → slices), `docs/CONTENT.md`, `docs/research/*` (+ `docs/research/data/**`, legit sources only), reviews in `docs/reviews/`.

**In flight (check `git worktree list`; each worktree has node_modules symlinked):**
1. `~/prata-raja-s2` (branch `s2/stall`): S2 stall hub (Codex's `sol/hub` merged) + owner playtest fixes (counter attackers first, breach cue, ≤8-word cards, title button) + boss CC immunity + rulings (tokens → coins, no pay before wave 2, in-run gold paid, settings cog, Phaser sleeps off-run). A Sonnet integrator was finishing. **Next:** confirm `npx tsc --noEmit && npx vitest run` and the Playwright `e2e/web/stall.spec.ts` + `play.spec.ts` pass there, commit, merge into main, `akit check`, ship OTA **0.2.0**.
2. `~/prata-raja-fb` (branch `s2/feedback`): in-game "Tell Kannan" feedback into `public.feedback` + PostHog analytics/session replay (canvas)/errors inside the DOM component. **Next:** merge after 0.2.0 (expect small conflicts in GameUi/GameRoot hook points), verify a real feedback row + PostHog events, ship **0.2.1**.
3. `~/prata-raja-s3` (branch `sol/s3`, commits 047f5d9, 33d676b): S3 logic by Codex (8 evolutions, recipes + run pools, chapter 2 "hawker-night" with 12 enemies + Burger Baron, unlock after 3 boss attempts; 543 tests) + its art. **Next:** after 0.2.x, merge and wire the UI: recipe book sheet, chapter select via `chapterUnlocked`, evolve card visuals (`ui/card-epic` + `evolutions/<id>`), `scene/background2` in the renderer → **0.3.0**.
4. Research → design: 5 teardowns `docs/research/teardown-*.md` + data pulls. **Next:** synthesise `docs/DEPTH.md` (moderate build depth: dips linked to specific breads like PoE supports, Kannan job tiers, a few keystones, gear set bonuses, hawker-named affixes) — good Codex task; owner reviews a short summary.
5. Art waiting to be used (`~/cell/.design/prata-raja-2026-10-12/s1/raw/`): story-1..6 (prologue motion comic), world-tiers (stall at L1/5/10), gear-looks (worn gear rarities), pests-new (mynah thief, drain rat, Grade Inspector boss). Slice with `slice_s1.py`'s method into `assets/game/**`, then `python3 scripts/pack_atlas.py`.
6. Owner reference clips arrive in Google Drive `My Drive/Claude/Prata Raja refs/` (synced at `~/Library/CloudStorage/GoogleDrive-duclongschlong@gmail.com/My Drive/Claude/Prata Raja refs/`): analyse frame by frame (`ffmpeg -vf "fps=2,scale=240:-1,tile=8x2"` → images) for timing/layout/feel only; fold into the feel pass.

**Handoff from the 12 Oct lead session (~21:00) — read before acting:**
- Builders still running when the lead left (they commit on their own branches, never merge/ship): the S2 integrator writes `~/prata-raja-s2/docs/reviews/s2-integration-report.md`; the feedback/PostHog builder writes `~/prata-raja-fb/docs/reviews/feedback-telemetry-report.md`. If a report is missing, inspect `git -C <worktree> status/log/diff` and run its checks before deciding anything.
- Research for the DEPTH synthesis (some may still be landing): `docs/research/teardown-{archero,habby,vs-brotato-oss,ballpit-terraria,maple-poe}.md` and `docs/research/data/**` (+ `data/SOURCES.md` with each source's terms; MapleStory sources from client extraction are flagged, don't use them). Hand the synthesis to Codex with the five files' paths and the BACKLOG/WORLD goals; ask for `docs/DEPTH.md` ≤ 200 lines + a 10-line owner summary.
- Ways of working that paid off today: contracts first (`src/core/types.ts`, `src/game/hub.ts`) then parallel builders that each own files + tests; Haiku for modules/content/UI/slicing/balance/research, Sonnet for sim/renderer/integration, Codex for art sheets, isolated logic in worktrees and **diff-pasted reviews** (`codex exec -m gpt-6.1-sol -c model_reasoning_effort=medium -s read-only --ephemeral - < prompt.md`; found 6 + 12 real bugs for ~60k tokens). Bot balance: `BALANCE_SEEDS=300 npx vitest run src/core/__tests__/balance.test.ts` (S1 targets: 4-bread 55-75% win, 2-bread 40-60%, solo 10-25%).
- Owner preferences in practice: ~5-line reports with what to tap; the owner sends screen recordings (silent; read them with ffmpeg frame grids); notes are intent, not spec; rendered art only; ask only for tools/access/phone taps. Owner still to do: copy `~/Backups/prata-raja-secrets-2026-10-12/` off the Mac.

**Next, in order:** ship 0.2.0 → 0.2.1 (feedback + PostHog) → **feel pass** (throw motion, damage numbers, mob attack animations, spawns from the street's far end + flatter perspective, tawa steam, bowls/breads seated on the counter; see BACKLOG) → 0.3.0 (S3) → DEPTH design → story prologue + mynah/drain rat → S4 (Chef's Special + family leaderboard). Owner ideas parked in BACKLOG: Tawa Heat meter, hawker heroes roster, real Singapore places per chapter.

## How to ship
```
SKIP_DB=1 ~/cell/akit/akit check                      # clean tree required; never write logs inside the repo
echo "reviewed: <what>" > .akit/reviewed-$(git rev-parse HEAD)
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --notes "<what changed>"          # OTA + web
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --apk --cloud --notes "…"        # only for native changes (runtime bump!)
```
Native set in runtime 1: expo-haptics, expo-sqlite kv, Expo's built-in DOM WebView. Any new native module = runtime 2 + new APK (EAS free plan: 15 builds/month across all apps).

## How it is built (what worked)
- Lead writes contracts first (`src/core/types.ts`, JSDoc'd stubs, `src/game/hub.ts`), then parallel builders each own files + tests: Haiku for modules/content/UI/slicing/balance, Sonnet for sim/renderer/integration, Codex (`gpt-6.1-sol`, medium) for art sheets, self-contained modules in a worktree, and **diff-pasted reviews** (core: 6 findings for 22k tokens; sim: 12 for 40k).
- Rules live in `src/core` (pure TS, deterministic seeded RNG in the World); `src/core/autoplay.ts` + `balance.test.ts` (`BALANCE_SEEDS=300`) tune numbers headlessly. Current S1 targets/results: 4-bread win ~58-64%, 2-bread ~46%, solo ~21%, ~11 picks per run.
- Art: Codex image sheets on flat magenta → `slice_s1.py` → `assets/game/**` + `manifest.json` → `python3 scripts/pack_atlas.py` (power-of-two atlases; run-time groups first). Never code-drawn art.
- Traps: DOM components only pass top-level function props; the WebView has no localStorage (save via bridge); Android Phaser batches one texture (atlases fixed 95 → 7 draw calls); a Google Fonts `@import` breaks the OTA upload (fonts are bundled now); Codex logins can expire mid-run (`codex logout && codex login`, owner).
