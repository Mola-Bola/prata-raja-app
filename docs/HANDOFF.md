# Prata Raja — handoff

## 13 Oct 2026 evening — live 0.4.1 (runtime 1, OTA + web)

Main equals origin/main (`110fe62`). Release history shipped today:

- **0.2.0:** stall hub, playtest fixes, boss CC → slow, elite half CC and 3 s post-CC immunity.
- **0.2.1:** in-game feedback, PostHog analytics/replay/errors and corrected chest pity copy.
- **0.2.2:** readable boss danger, faster approach, throw/hit motion, mob lunges, offer damping and quieter UI.
- **0.3.0:** recipes, eight evolutions, chapter 2 selection/background and legacy attempt migration.
- **0.3.1:** skippable/replayable prologue, mynah theft, drain-rat packs and corrected locked recipe copy.
- **0.4.0:** signature bread, Fish Curry link, loaded Murtabak and web chunk-404 recovery.
- **0.4.1:** Condensed Milk/Mint links, heat Roti Bomb and bouncing Appam; running freeze/stun is never extended or chained; chapter-2 contact damage reduced.

**CI:** Actions refused by account billing since about 12 Oct; owner fixing. Local `bash scripts/check.sh --web` is the gate until restored. Builders push their finished branch and read `gh run list -R Mola-Bola/prata-raja-app -L 3`; the lead pushes main after every merge/ship. Codex commits when the pipeline grants Git writable roots; otherwise the lead commits. Reviews: diff pasted into `codex exec -m gpt-6.1-sol -c model_reasoning_effort=medium -s read-only --ephemeral -`.

**Worktrees:** verified with `git worktree list` on 13 Oct evening (run it again before acting):

```
/Users/molabola/prata-raja                            110fe62 [main]
/Users/molabola/Documents/Codex/prata-raja-combat-1   5a4a12e [codex/polish-combat-1]
/Users/molabola/Documents/Codex/prata-raja-round-1    915731c [codex/polish-round-1]
/Users/molabola/Documents/Codex/prata-raja-skills-1   f6cc338 [codex/polish-skills-1]
/Users/molabola/Documents/Codex/prata-raja-visuals-1  15d5a69 [codex/polish-visuals-1]
/Users/molabola/prata-raja-hyg                        110fe62 [sol/hygiene]
/Users/molabola/prata-raja-pipe                       c2e16d4 [sol/pipeline]
```

The four `~/Documents/Codex` `codex/polish-*` branches/worktrees are owner-run and belong to the owner; do not delete or claim them as lead workers. `~/prata-raja-pipe` (`sol/pipeline`) is unmerged, pending fixes. `sol/hygiene` is this temporary docs/config cleanup; the lead commits it. All `s2/*`, `sol/{hub,meta,depth,feel,prologue,s3,signature,signature2}` and `polish/s1-1` branches are merged and deleted.

**Next:** rebuild slices in [decomp mechanisms](research/decomp-mechanisms.md), damage core first, then boss scripts as data, fair crowds, feel and gear; stage them before/with [ROADMAP](ROADMAP.md) 0.5. Chef's Special/family board remains open. World-tier scenes are sliced but unwired; Grade Inspector is art only.

**Open owner item:** copy `~/Backups/prata-raja-secrets-2026-10-12/` off the Mac.

## History
- 12 Oct: 0.1.0 APK/distribution and 0.1.1 OTA established the first daydream.
- 13 Oct: 0.2.0–0.4.1 shipped; historical slice evidence is in `docs/reviews/`.
- Standing owner direction and ideas remain in `DIRECTION.md` and `BACKLOG.md`.

## How to ship
**CI (13 Oct):** `.github/workflows/check.yml` (tsc, lint, vitest, guards, gitleaks; pgTAP when `supabase/**` changes) runs on pushes to `main` and slice branches (`sol/**`, `s*/**`, `codex/**`, `polish/**`); `e2e-nightly.yml` runs the web e2e nightly. **Every builder (Claude or Codex) pushes its finished branch and checks `gh run list -R Mola-Bola/prata-raja-app -L 3`; the lead pushes `main` after each merge/ship.** As of 13 Oct all Mola-Bola Actions jobs are refused by GitHub billing ("recent account payments have failed or your spending limit needs to be increased") — owner fixes in github.com/settings/billing; until then local `bash scripts/check.sh --web` stays the gate. Budget: 2,000 free Linux min/month shared by all private apps: keep full e2e nightly, not per push.
```
SKIP_DB=1 ~/cell/akit/akit check                      # clean tree required; never write logs inside the repo
echo "reviewed: <what>" > .akit/reviewed-$(git rev-parse HEAD)
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --notes "<what changed>"          # OTA + web
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --apk --cloud --notes "…"        # lead-only; native changes (runtime bump!)
```
Native set in runtime 1: expo-haptics, expo-sqlite kv, Expo's built-in DOM WebView. Any new native module = runtime 2 + new APK (EAS free plan: 15 builds/month across all apps).

## How it is built (what worked)
- Lead writes contracts first (`src/core/types.ts`, JSDoc'd stubs, `src/game/hub.ts`), then parallel builders each own files + tests: Haiku for modules/content/UI/slicing/balance, Sonnet for sim/renderer/integration, Codex (`gpt-6.1-sol`, medium) for art sheets, self-contained modules in a worktree, and **diff-pasted reviews** (core: 6 findings for 22k tokens; sim: 12 for 40k).
- Rules live in `src/core` (pure TS, deterministic seeded RNG in the World); `src/core/autoplay.ts` + `balance.test.ts` (`BALANCE_SEEDS=300`) tune numbers headlessly. Current S1 targets/results: 4-bread win ~58-64%, 2-bread ~46%, solo ~21%, ~11 picks per run.
- Art: Codex image sheets on flat magenta → `slice_s1.py` → `assets/game/**` + `manifest.json` → `python3 scripts/pack_atlas.py` (power-of-two atlases; run-time groups first). Never code-drawn art.
- Traps: DOM components only pass top-level function props; the WebView has no localStorage (save via bridge); Android Phaser batches one texture (atlases fixed 95 → 7 draw calls); a Google Fonts `@import` breaks the OTA upload (fonts are bundled now); Codex logins can expire mid-run (`codex logout && codex login`, owner).
