# Prata Raja — design spec

Status: v1, 12 Oct 2026. Lead: Claude (Opus desk). The owner delegated design ("take charge"); owner picks so far: **stall defense view (A1) · paper/clay look · full pipeline**.
Content tables: `docs/CONTENT.md` (copied from `~/cell/docs/plans/2026-10-12-prata-raja/CONTENT.md`). Code contract: `src/core/types.ts` (+ JSDoc in `src/core/*.ts`). Research: `docs/research/`.

## 1. Intent

**Owner said:** prove how fast the factory (Cell starter, Expo, Supabase, Firebase, PostHog, Codex, Haiku swarms) can turn out a fun game with light steering. Kannan, a prata man, zones out at his stall and daydreams he is a hero. A roguelite in the Archero mould: breads are the weapons (plain, tissue, roti bomb, then thosai, naan, chapati and more, each with its own mechanic), curries and dips are power-ups with status effects (burn, slow, condensed-milk "diabetes" DoT, crowd control), XP, level-up skills, bosses, rarity, crafting, gear (towel, apron, gloves), and reasons to come back daily. No season pass for now. Local flavour, a hero who is a prata man.

**Assumed (lead):** family and friends first (web link + Android via Firebase "family"), iOS later. Offline single-player with a local save; no ads, no in-app purchases, no energy timer. Runs of about 6 minutes.

**Success**
- S1: the owner plays a full daydream (10 waves + boss) from a link on their phone and wants another run.
- S2: the APK on the family group with over-the-air updates; the stall meta loop gives a reason to return tomorrow.
- Factory: hours from "go" to S1 and to S2, and Claude/Codex usage, logged at the end of `docs/PLAN.md`.

## 2. The game in one breath

Kannan flips prata at a kopitiam stall. Stare too long at a spinning prata and he is **Prata Raja**, defending the last real stall from daydream pests (cockroaches, pigeons, Aedes swarms, bubble-tea blobs, chilli imps) and junk-food invaders (Burger Brute, the Burger Baron). He auto-throws breads; the player decides **where he stands and when he stops**, and **which card to take** at each level-up. Dying or winning wakes him up ("Oi Kannan! Two kosong!"). Between daydreams, at the real stall, he gears up, learns recipes and trains.

## 3. A run (stall defense)

**Screen (portrait):** top band = HUD (wave x/10, XP bar + level, pause). Middle = the street in perspective: horizon at 20% height, counter line at 68%. Bottom = the steel counter with the tawa; Kannan's back at bottom-centre, sliding left/right. Owned dips sit as steel bowls along the counter and owned breads stack beside the tawa, so **the counter shows your build**.

**Field model:** all rules run in a flat top-down field (x −270..270, y 0 counter..1000 horizon); `src/core/view.ts` projects it with a pinhole perspective (scale 1 at the counter, 0.3 at the horizon). The core is therefore a plain 2D lane shooter, simulated headlessly for tests and balance.

**Controls (one thumb):** drag anywhere on the lower screen and Kannan slides under your finger; hold still or let go and he throws. Moving stops throwing (Archero rule; the *Multitasker* passive relaxes it). Dodging is the skill: shooters telegraph a chilli at where you stand, bosses mark lanes.

**Combat:** each bread has its own timer and targeting (nearest / densest cluster / straight up the street); whatever is biting Kannan at the counter is always shot first, then the enemy closest to the counter (lowest y), then the one nearest his lane, and a bomb prefers the cluster with a biter in it. Hits roll crit; every owned dip applies its effect on every bread hit, so AoE breads spread statuses widely. Statuses: burn (DoT), sugar ("diabetes": slow + stacking DoT, 5 stacks = Sugar Crash stun), chill (3 stacks = freeze), tender (knockback + damage taken), stun. Shielded enemies block plain throws until broken; pierce, lobs and waves go around.

**Waves:** chapter 1 "Kopitiam Street" = 10 waves, budgets 10→44 threat points over 22–30 s each, new enemy types introduced one wave at a time, elites from wave 4, King Cockroach on wave 10 (volley, lane charge, brood call; enrages at 50%). HP scales +15% per wave (hpPerWave in src/content/chapters.ts, set by the bot balance sim). Crowd control cannot chain: a boss is never frozen or stunned (a freeze, stun or Sugar Crash on it is a 40% slow for the same time), an elite is held for half the time, and any enemy shrugs off the next freeze or stun for 3 s after one ends; chill and sugar stacks still build.

**Growth inside a run:** kills give XP (auto-collected, flying to the counter). About 9 level-ups per chapter. Each offers 3 cards: new bread (max 4), new dip (max 4), upgrade (L1→L5) or a passive; 1 free reroll; the first offer guarantees a dip so the counter fills early. Evolutions (bread L5 + partner L5) arrive in S3.

**End:** HP 0 → wake-up screen with a random line, run summary, gold. Boss down → victory line, trophy. Best wave and totals saved locally.

**Feel (S1 bar):** hit flash + squash on enemies, prata spin and trails, flour-puff and curry-splash particles in the dip's colour, damage numbers coloured by source, small screen shake on blasts, short hit-stop on crits and kills of elites, boss intro banner, coins and XP flying to the counter, haptics on hit-taken / level-up / boss. Danger cue: an enemy biting at the counter pulses a red glow on the counter's edge under it with a bobbing "!" badge above it, every hit on Kannan flashes and shakes the HP pill, and the hurt sound plays at most every 450 ms. Details: `docs/research/game-feel.md`.

## 4. The stall (meta, S2+)

Hub = the real stall in the morning (rendered scene, tappable spots). **Every real run pays**: one that reaches wave 2 earns coins = 20 + 12/wave + 60 boss + the coins it picked up in the run (Tips bonus included), stall XP = 40 + 10/wave + 50 boss, a chest and ingredients, shown on the wake-up screen with "next unlock in N". A run that ends on wave 1 pays nothing ("Too short a daydream — no tips this time"), so ending runs at once cannot farm chests or XP; it still counts in the records. **Stall level** = account XP bar (levels 2–10 at 150 / 350 / 600 / 900 / 1300 / 1800 / 2400 / 3100 / 3900) with one named unlock per level: gear + towel (L2), training + headband (L3), 2nd reroll (L4), apron (L5), gloves + recipe book (L6), slippers (L7), Chef's Special (L8). **Gear:** towel / headband / apron / gloves / slippers; rarity Common → Uncommon → Rare → Epic → Legendary → Raja; merge 3 identical into the next tier up to Rare; Epic+ only from chests and bosses; chest pity (every 5th ≥ Rare, every 20th ≥ Epic); affixes from Rare. **Recipes (crafting, S3):** materials unlock breads and dips into the run pool — Roti Bomb and Condensed Milk are the first, cheapest. **Training:** 3 big ladders (wrist = damage, stamina = HP, flip = throw speed) × 5 steps (60–400 coins), free respec. **Idle earnings:** 20 coins/h (+2/h per stall level), capped at 12 h, no pushes before day 3. Code: `src/meta/` (unit-tested). Rationale: `docs/research/engagement.md`.

**Flow (S2).** Title → the first launch starts run 1 at once (no hub before it); a returning player's tap opens the stall. The wake-up screen shows the payout (coins, stall XP bar filling, any unlock, the chest, ingredients), applied once per run; "Daydream again" starts the next run with the loadout the save holds (gear + training → `computeLoadout`), "Back to stall" opens the hub: the scene with a tap area on each prop (`src/game/ui/stall/helpers.ts` HOTSPOTS, percentages of the 1080 x 1919 picture), level bar with "Next: <unlock> in N XP", coins, and a Start button. Its sheets: gear (wear, merge three, upgrade), training (buy, free respec), tip jar (idle collect), calendar (streak claim), chests (open with a reveal), and locked previews of the recipe book and Chef's Special. A chest is owned the moment it is rolled and listed in `pendingChests` until opened, so closing the app never loses it. One writer owns the save (`src/game/ui/saveStore.ts`): writes never overlap, the newest save always lands last, and a failed read is never replaced by a fresh save.

## 5. Coming back daily (S2–S4)

7-day login ladder (two rest days a week absorbed; a longer miss drops one day, never to zero), Chef's Special (one seeded daily run with a modifier; best score; family leaderboard on Supabase), 3 daily quests, idle earnings, achievements and a Bread-dex. Ranked by leverage in `docs/research/engagement.md`.

## 6. Look and sound

- Paper/clay diorama, copied from concept A1 (`assets/concepts/a-stall-paper.png`); every sprite is **rendered art** (Codex image sheets on magenta → sliced to webp), never code-drawn. Pipeline: `~/cell/.design/prata-raja-2026-10-12/s1/{gen,gen2}.sh` → `slice_s1.py` → `assets/game/**` + `manifest.json`.
- Cut-out animation only: pose swaps for Kannan, tweens (bob, squash/stretch, tilt, spin, flash) for everything else; enemies only ever face the camera (one image each).
- UI in React DOM over the canvas with rendered paper pieces (cards, ribbons, buttons) and Fredoka/Nunito.
- Sound: ZzFX procedural SFX in S1 (tiny, no files); music later.

## 7. Architecture

- **App:** `~/prata-raja` (Cell starter, Expo SDK 57). Private repo Mola-Bola/prata-raja-app; web build on a public Pages repo Mola-Bola/prata-raja. Supabase project `prata-raja` (`nzxgskzmofddxyjocduq`, ap-southeast-2) for OTA updates, Tell-us feedback, later leaderboard/cloud save.
- **One DOM component** (`src/game/GameRoot.tsx`, `"use dom"`) hosts Phaser 4 (gameplay canvas) and React DOM (HUD, cards, menus). Same code on web and inside the Android WebView; native features via async bridge props (haptics, save/load, telemetry).
- **Layers:** `src/core/` pure TS rules (rng, view, stats, status, cards, waves, sim, save, autoplay) → `src/content/` typed data → `src/game/phaser/` renderer (reads World, drains events into FX, sends input) → `src/game/ui/` React overlays. The renderer never decides rules; the core never touches pixels.
- **Determinism:** seeded RNG state lives in the World, so a run replays from its seed + inputs (daily challenge, tests, balance sims).
- **Save:** versioned JSON via the bridge (expo-sqlite kv on device, localStorage on web): SaveV2 under the same key (`parseSaveV2` migrates v1 saves from 0.1.x).
- **Telemetry (allowlisted, anonymous):** `run_start`, `run_end {wave, won, kills, secs}`, `level_up`, `card_pick {kind}`.
- **Analytics and notes (see `docs/TELEMETRY.md`, `docs/FEEDBACK.md`):** PostHog events, replay and errors with an in-game Analytics off switch; "Tell Kannan" files notes into the family inbox via the `game-feedback` edge function.
- **Performance budget:** ≤150 enemies, ≤300 projectiles, 60 fps on a mid-range Android; pooled sprites.

## 8. Slices

| Slice | What you can tap | Exit check |
|---|---|---|
| S0 spike | Phaser in the DOM component on web + Android | FPS on both, OTA-safe bundle |
| **S1 First Daydream** | web link: title → run (5 breads, 4 dips, 8 passives, 11 enemy types, King Cockroach) → wake-up screen | tests green, bot balance sane, Playwright smoke, Codex review P0/P1 clear |
| S2 The Stall | APK + OTA: hub, stall level, gear + rarity + merge, training, daily login, idle earnings | APK installs over nothing; OTA lands |
| S3 Recipes | crafting, all 12 breads / 10 dips, evolutions, chapter 2 (Burger Baron) | |
| S4 Daily | Chef's Special + family leaderboard, daily quests, achievements, Bread-dex | |
| S5+ | chapters 3–5, music, AI flavour text (DeepSeek via edge function), iOS | |

## 9. Who does what

Lead (Opus): contracts, integration, reviews, merges, ships, owner reports. Haiku swarm: content, core modules + tests, slicing, UI screens, Playwright, balance runs. Sonnet: spike, simulation, renderer (riskiest code). Codex: art sheets, one review per slice (P0/P1 block). Claude budget: owner OK'd spending this week's remainder; check usage between slices.

## 10. Risks

WebView performance on low-end phones (pool, cap entities, fewer particles) · AI art drift (one style ref, sheets per family, contact sheet before wiring) · balance (headless bot sims every change) · scope creep (slices; S1 first).
