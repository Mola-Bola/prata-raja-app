# Prata Raja — handoff (rolling; replace the top block when state changes)

## 12 Oct 2026, ~19:45 — live 0.1.1 (runtime 1)

**Live:** web https://mola-bola.github.io/prata-raja/ · APK https://nzxgskzmofddxyjocduq.supabase.co/storage/v1/object/public/updates/apk/prata-raja-0.1.0.apk (OTA brings it to 0.1.1+) · Firebase App Distribution `app.prataraja` → group `family` (no testers yet).
**Infra:** Supabase `prata-raja` (`nzxgskzmofddxyjocduq`, ap-southeast-2; DB password `~/.cell/prata-raja-db.env`) · EAS `@uzzzy/prata-raja` · release key `~/.prata-raja-secrets/` (backup `~/Backups/prata-raja-secrets-2026-10-12/`, owner to copy off the Mac) · repos `Mola-Bola/prata-raja-app` (private) and `Mola-Bola/prata-raja` (Pages).
**Design:** `docs/SPEC.md` (owner picks: stall defense A1, paper/clay, full pipeline; owner delegated design: "take charge"), `docs/CONTENT.md`, `docs/research/{engagement,game-feel}.md`, reviews in `docs/reviews/`.

**In flight:** S2 stall update integrating in worktree `~/prata-raja-s2` (branch `s2/stall` = main + Codex's `sol/hub` hub UI); Codex hub review lands at `~/prata-raja-s2/docs/reviews/codex-hub-1.md`. When green: merge to main, `akit check`, ship OTA as 0.2.0.

**Next (in order):** S2 ship → S3 recipes + evolutions + chapter 2 (Burger Baron; art via `~/cell/.design/prata-raja-2026-10-12/s1/gen*.sh` recipe) → S4 Chef's Special (seeded daily) + family leaderboard (Supabase) + quests. Known nits: start button covers the hero on the title; exploders aren't dodged by the bot; atlas page 2 (UI-only) could skip loading.

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
