# Teardown: Vampire Survivors and Brotato, plus open-source to learn from

Researched 12 Oct 2026 from public pages only (wikis, guides, press, GitHub metadata). Nothing cloned, downloaded or decompiled. "S2.5 feel" = the feel pass after 0.2.0 in `docs/BACKLOG.md`. Slices follow `docs/SPEC.md` §8. Tags: **[wiki]** read on the named page · **[sec]** guide, press or search summary · **[judgement]** our number, to tune with the bot. Brotato wiki pages show a last-edit date, not a patch, so their figures are approximate. Sibling file: `docs/research/teardown-habby.md` (Survivor.io, Capybara Go, pickups, grates); this file does not repeat it.

## Part A: design teardown

### A0. Sources and gaps
- Dev talks: no primary Poncle (Vampire Survivors) talk found. Galante's own design account sits in a Noclip documentary, not read. Blobfish's Thomas Gervraud described the intent in a French Xbox interview, read as a summary only: horde fights fused with an autochess-style shop, six weapons, and a futuristic setting for latitude. [sec]

### A1. Weapons, passives and evolutions: gating and signposting
- VS evolution = base weapon fully leveled + paired passive (most weapons) + a Treasure Chest whose first reward is the evolved weapon, unless that weapon is banished. The wiki gives no probability, so it is deterministic once the conditions hold, and it describes no in-run preview. [wiki]
- The signpost is the chest tier. Bronze (Level 1) usually cannot evolve and mostly drops from bosses before 10:00. Silver (Level 2) can evolve and mostly drops from bosses after 10:00. [wiki]
- Mad Forest shows the gate in practice: every non-Arcana boss chest after 10:00 can evolve (12 of 12 on the timeline); before 10:00 only the 1:00 stage exception can. [wiki]
- Never a dead chest: if nothing can evolve or level up, items become Big Coin Bags (25 gold each, about 150 in total). [wiki]
- Brotato has no evolution recipes. Weapons have tiers I–IV; two identical same-tier weapons merge into one tier higher, manually or automatically when a purchase hits full slots. Tier IV is the cap. [wiki]
- Our rule (SPEC §3): L5 bread + L5 partner, fired at the next breather. Keep it deterministic; the wiki shows the chest gate is what VS players feel as luck. [judgement]

### A2. Stat economy and the shop
- Brotato armor: damage taken = 1 / (1 + Armor/15), no hard cap. Negative Armor uses (15 − 2A) / (15 − A), so −30 Armor means 167% damage taken. The glass cannon is bounded. [wiki, Armor]
- Brotato's Stats page gives every stat a limit or a negative-side rule: attack speed diminishing, max 12/s; crit max 100%; life steal max one trigger per 0.1 s; dodge 60% (70% with Cryptid, 90% with Ghost); HP regen 0.20/s for the first point, then 0.089/s each. Copy that column into our CONTENT.md. [wiki, Stats, Dec 2024]
- Brotato shop: 4 offers. Waves 1–2 guarantee 2 weapons and 2 items; waves 3–5 guarantee 1 weapon. Tiers unlock at shops 1, 2, 4 and 8. Locks are free and unlimited. Buying all four gives a free reroll. [wiki, Shop]
- Reroll price: first = floor(0.75 × wave) + step; step = floor(0.40 × wave), minimum 1. The wiki's update log says 1.1.4.0 changed this to 0.33 × wave and wave ÷ 2, so check live numbers before copying. [wiki, conflicting]
- Materials: each kill drops a blob worth XP and gold. Drop chance = 100% − 1.5 × wave from wave 5 (92.5% at wave 5, 70% at wave 20, floor 50% at wave 34). Blobs you miss go into a Bag and add to later drops. Max 50 blobs on the map; extra value merges into one. [wiki, Materials]
- Brotato sets ("classes", counted 2–6 across weapons): Gun +10 to +50 Range; Heavy +5% to +25% damage; Precise +3% to +15% crit. Drawback sets: Legendary −20 to −100 Max HP; Blunt trades −2% to −10% speed for armor and HP; Ethereal trades −1 to −5 armor for +6% to +30% dodge. The page was last edited Jul 2023, so it may be stale. [wiki, Weapon_class]
- VS player stats: Curse +10% per rank up to +50% (more, faster, tougher enemies; 500 on-screen cap); Luck (chest quality and item counts); Greed (gold); Growth (XP per gem); Magnet (XP pickup range). The Luck and Greed-Growth-Magnet details are secondary. [wiki, Curse, Treasure Chest; sec]

### A3. Arcana, Curse and difficulty
- VS Arcana are picked at run start or from Arcana chests at 11:00 and 21:00 (4 or 6 options). Normally three are active. [wiki, Arcana]
- Deliberate breaks, with the cost printed on the card: Game Killer halts XP, turns gems into exploding projectiles and gives every chest at least 3 items. Silent Old Sanctuary gives +3 reroll, skip and banish, and each empty weapon slot +20% Might and −8% cooldown. Chaos in the Dark Night swings projectile speed between −50% and +50% over 10 s. [wiki, Arcana]
- Brotato Danger 0–5 plus Nightmare. Each level sets totals, not sums: Danger 3 +12% damage and HP; Danger 4 +26% and elite or horde waves 11–18; Danger 5 +40%, two bosses on wave 20 with 25% less HP each; Nightmare +60% and +10% speed, plus fog. Elites from Danger 2 drop a Legendary Crate. [wiki, Danger_Levels]
- Accessibility sliders multiply with Danger; effective difficulty is the geometric mean of the three sliders. Worth a family-mode slider set. [wiki]
- Read-across: VS Curse trades risk for volume (more enemies, more gems). Brotato trades risk for published multipliers. Ours should be the second kind so the bot can test it. [judgement]

### A4. Wave pacing, elites and bosses
- VS Mad Forest runs on the clock: boss chests from 1:00 (1:00, 3:00, 5:00, 9:00, 10:00 … 29:00), Arcana chests at 11:00 and 21:00, map events (bat swarm 2:00, flower wall 5:00), and the Reaper at 30:00 with one more each minute after. [wiki, Mad Forest]
- Brotato runs on waves: 20 waves; durations 20 s (wave 1), +5 s per wave to 60 s at wave 9, 60 s through wave 19, 90 s on wave 20. [wiki, Waves]
- Brotato challenge waves: none on Danger 0–1; one on Danger 2–3 (wave 11 or 12); three on Danger 4–5 (11/12, 14/15, and an elite wave on 17/18). Elites on waves 12 and under spawn at 75% health. [wiki, Waves, Danger_Levels]
- Ours (SPEC §3): 10 waves of 22–30 s, elites from wave 4, a boss on wave 10. A run is about six minutes; VS runs go to 30:00, Brotato runs under 30 minutes. [repo, sec]

### A5. Pickups
- VS Floor Chicken heals a fixed 30 HP (doubled by Sarabande of Healing). It drops from light sources, and its rate depends on Luck. [wiki, Floor_Chicken]
- VS chests hold 1, 3 or 5 items, with odds set per boss and boosted by Luck. Luck changes quality, not gold; Greed multiplies gold. The first six chests follow a fixed 1-1-3-1-1-5 sequence, so new players see variety at once. [wiki, Treasure_Chest]
- Brotato's Bag rule means no material is lost; extra value merges into an existing blob when the map is full. [wiki, Materials]
- VS Magnet is a stat (pickup range) that items and characters raise. Our XP and coins auto-fly to the counter (SPEC §3), so the gap is a floor pickup you have to reach; the sibling file's grates fill it. Our heals today are per-kill (Dhal), regen (Kopi Break, gear affixes) and one evolution (Half-Boiled Halo). [repo]

### A6. What makes a build feel broken in a fun way
- Trade the economy for power, visibly: Game Killer halts XP to turn gems into explosions; Brotato's Legendary class is a pure Max HP cost (−20 to −100) that rides with its strongest weapons. The cost is on the card, so the break feels chosen. [wiki]
- Bound the upside: Brotato's negative Armor tops out near 167% damage taken; VS Curse stacks, but enemies cap at 500 on screen. Unbounded multipliers break our readability rules (`docs/research/game-feel.md` §2). [wiki, repo]
- Reward commitment: Brotato's positive sets pay at every count from 2 to 6, so each extra piece is visibly worth more. Silent Old Sanctuary pays for empty slots, so it rewards restraint over hoarding. [wiki]
- Show the number: Brotato's 0.6.1.6 added a per-weapon damage readout for the last wave, so players can test a build against numbers. [sec]

Sources. VS wiki: [Evolution](https://vampire.survivors.wiki/w/Evolution), [Curse](https://vampire.survivors.wiki/w/Curse), [Arcana](https://vampire.survivors.wiki/w/Arcana), [Treasure Chest](https://vampire.survivors.wiki/w/Treasure_Chest), [Mad Forest](https://vampire.survivors.wiki/w/Mad_Forest), [Floor Chicken](https://vampire.survivors.wiki/w/Floor_Chicken). Brotato wiki: [Weapon class](https://brotato.wiki.spellsandguns.com/Weapon_class), [Shop](https://brotato.wiki.spellsandguns.com/Shop), [Materials](https://brotato.wiki.spellsandguns.com/Materials), [Armor](https://brotato.wiki.spellsandguns.com/Armor), [Stats](https://brotato.wiki.spellsandguns.com/Stats), [Waves](https://brotato.wiki.spellsandguns.com/Waves), [Danger levels](https://brotato.wiki.spellsandguns.com/Danger_Levels). Secondary: [Luck explainer](https://gamerjournalist.com/what-does-luck-do-in-vampire-survivors-answered), [Brotato 0.6.1.6](https://www.player.one/brotato-update-0616-improves-stats-screen-implements-gladiator-changes-152839), [Gervraud interview, French, summary only](https://news.xbox.com/fr-fr/2024/02/09/entretien-exclusif-avec-thomas-gervraud-brotato-le-jeu-qui-a-de-la-patate/).

## Part B: open-source (MIT, BSD or Apache only; no GPL)

Checked 12 Oct 2026 through the GitHub API (metadata and README or source reads). "Pushed" = last code push. GitHub reports MIT on every row below. Read each LICENSE file before copying anything.

| Repo | License · ★ · pushed | Stack | Borrow |
|---|---|---|---|
| [m2-md/game-feel-hitstop-juice](https://github.com/m2-md/game-feel-hitstop-juice) | MIT · 0 · 2026-09 | TS | `HitStop` (sim dt split; longest freeze wins, no summing); seeded value-noise trauma shake; squash with sx = 1/sy; one `impact()` call; tests |
| [m2-md/broad-phase-collision-spatial-hash](https://github.com/m2-md/broad-phase-collision-spatial-hash) | MIT · 0 · 2026-09 | TS | `SpatialHashGrid` and a quadtree; pairs deduped with an id-ordered key; cell size about 1–2× the diameter; benchmark at 200 to 20,000 bodies |
| [timohausmann/quadtree-js](https://github.com/timohausmann/quadtree-js) | MIT · 639 · 2023-11 | JS | 639-byte quadtree; a rect sits in every leaf it touches. Only if the grid falls short |
| [getify/deePool](https://github.com/getify/deePool) | MIT · 126 · 2022-08 | JS | `use()` / `recycle()` pool that doubles when empty; about 30 lines to re-implement |
| [sajmoni/screen-shake](https://github.com/sajmoni/screen-shake) | MIT · 5 · 2025-02 | TS | Eiserloh trauma with Perlin noise and a seed; about 700 B, no dependencies |
| [saltmire/saltmire-juice](https://github.com/saltmire/saltmire-juice) | MIT · 5 · 2026-08 | GDScript (Godot 4) | Pooled damage numbers; hit-stop via time scale, latest call wins |
| [jumpingmushroom/DamageSplash](https://github.com/jumpingmushroom/DamageSplash) | MIT · 0 · 2026-10 | C# (Valheim mod) | Damage-number design: size = share of target HP; crit, sneak and kill tags; DoT ticks merge into one climbing number; pop, then arc |
| [pixijs/filters, `src/outline`](https://github.com/pixijs/filters/tree/main/src/outline) | MIT · 1,139 · 2026-02 | TS, GLSL/WGSL | `OutlineFilter` sprite-outline fragment shader; port to a Phaser 4 filter |
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | MIT · 40,458 · 2026-10 | JS (Phaser 4) | Use first: Shake, Tween, ParticleEmitter, Glow and Shadow filters, Text styles (stroke) |
| [giovanneluna/poke-survivors](https://github.com/giovanneluna/poke-survivors) | MIT · 11 · 2026-04 | TS (Phaser 3) | Closest stack. Evolution design doc (Portuguese): weapons Lv1–8; evolution = max weapon + item + form; slots by stage |
| [matthiasbroske/VampireSurvivorsClone](https://github.com/matthiasbroske/VampireSurvivorsClone) | MIT · 277 · 2024-04 | C# (Unity) | Object pools for enemies, shots, items, chests and damage text; spawn-rate keyframe curve for pacing |
| [DarkRewar/SurvivorsStarterKit](https://github.com/DarkRewar/SurvivorsStarterKit) | MIT · 104 · 2026-04 | C# (Godot 4) | Upgrades for the player and for enemies (basis for a per-run difficulty dial) |
| [m2-md/tweening-easing-penner](https://github.com/m2-md/tweening-easing-penner) | MIT · 0 · 2026-09 | TS | Penner easing curves (copied into the hit-stop repo) |
| [dmaslov/phaser-screen-shake](https://github.com/dmaslov/phaser-screen-shake) | MIT · 26 · 2014 (stale) | JS | Phaser plugin from before Phaser 3. Skip |
| [RetroVX/phaser3-juice-plugin](https://github.com/RetroVX/phaser3-juice-plugin) | MIT · 31 · 2020 (stale) | JS (Phaser 3) | Per-sprite juice tweens. Read only |
| [koreezgames/phaser3-particle-editor](https://github.com/koreezgames/phaser3-particle-editor) | MIT · 176 · archived | TS | Particle preset format. Reference only |
| [zym9863/2D-Shooting-Game](https://github.com/zym9863/2D-Shooting-Game) | MIT · 1 · 2026-02 | TS, PixiJS 8, ECS | Small bullet-heaven ECS reference |

- Archero-likes: no TypeScript or Phaser project with traction and an MIT license turned up. The MIT Archero clones are small Unity projects (onuryuzak/Archero-Clone, C#, 1★). Our lane-telegraph design (`game-feel.md` §6) stands on its own.
- GSAP: GitHub reports no OSI license for greensock/GSAP. Do not vendor it.
- Hygiene: copy only small MIT pieces we re-implement or port, with a header comment naming repo, file and commit. No GPL code, no decompiled code.

## Port to Prata Raja

Overlap rules: Tawa Heat uses `teardown-habby.md` idea 7's numbers, plus two additions here. Set bonuses are an input to the planned DEPTH.md. Pickups, grates, Tip Jar and Tingkat evolutions stay in `teardown-habby.md` §4. "Ang Pow" is already P4 there, so the chest idea below is named Tingkat tiers. Every number goes through the bot first (`src/core/autoplay.ts`, `BALANCE_SEEDS`). "(judgement)" marks first guesses.

1. **Tawa Heat rage meter** (visuals S2.5, mechanic S3). Numbers from teardown-habby idea 7: +2 per kill; −25 per hit taken; sliding sheds 10/s; tiers at 25/50/75 give +5/+10/+15% damage; full heat fires Tawa Blaze for 6 s (+40% damage, +20% throw speed), then settles at 50. Added here: state the peak (+55%, a Brotato-style bound) and show one live multiplier number on the tawa, the way VS shows Curse as a plain %. Four rendered tawa states, no code-drawn art. Rename the training ladder `tawa-heat` (CONTENT §11) to `season-tawa` first. [judgement]
2. **Clean Flip** (S2.5). The first throw after 0.30 s of stillness is a clean flip: +20% damage, a spin pop and a flip sound. Named to avoid the existing Fast Flip passive. [judgement; SPEC §3 stop-to-throw]
3. **Set Menu** (S3; input to DEPTH.md). Four families: Mamak (Roti Bomb, Naan, Garlic Naan, Murtabak, Chapati, Teh Tarik); South Indian (Thosai, Idli, Vadai, Appam, Dhal); Kopitiam (Kosong, Tissue, Egg, Condensed Milk, Ghee); Curry House (Fish, Mutton, Chicken Curry, Masala, Sambal, Mint Chutney). Two owned: +5% damage to that family. Three: +10% and a family perk. Curry House three or more: −5% move speed. Family bowls glow on the counter. [Brotato class counts 2–6, with drawbacks]
4. **Dip pairings** (S3; dip-to-dip, not dip-to-bread). Caramel Crust: sugar 3+ and burn on one target → 12 burst, and one sugar stack jumps to each enemy within 80 u. Steam Cloud: chill and burn on one target → 30% slow for 1.5 s in a 70 u cloud. Clouds never hide telegraphs (game-feel rule). [VS evolution pairs, applied to statuses]
5. **Chilli Oath passives** (S3). Single-level cursed passives with the cost on the card (8 words max): Extra Chilli +15% damage, −10 Max HP; Extra Sugar +1 Diabetes stack per hit, −5% throw speed; Double Ghee +20% crit damage, −1 HP/s regen. [Brotato Legendary and Ethereal]
6. **Tingkat tiers and the never-dead rule** (S3; extends teardown-habby T1). Chest lids show the tier: steel = 1 card, brass = pick 1 of 3, gold Tingkat = the only chest that can evolve. If nothing on offer can evolve or level, each item pays 25 coins, so a chest is never dead. [VS Treasure Chest tiers and Big Coin Bag fallback]
7. **Limits column** (S3 content pass, before any new stat ships). Every bread, dip and passive gets a "limit or cost" entry, as Brotato's Stats page does. Examples: Dhal heals at most 10 HP per wave; Sugar Crash re-fires at most once per 4 s. [Brotato Stats, Dec 2024]
8. **Wok Clang** (S2.5; balance S3). A 1.5 s warning at the horizon edge (wok icon and clang) before every elite. Elites on waves 4–6 spawn at 75% HP, mirroring Brotato's rule for waves 12 and under. [Brotato Danger levels]
9. **Card readout** (S2.5). Each card shows the number it changes, for example "Naan 18 → 22 dmg" (the L2 value in CONTENT). The run summary shows damage per bread for the top three. Fits the 8-word card rule in BACKLOG. [Brotato 0.6.1.6 readout, sec]
10. **Opening Order** (S2.5; bot-tested). The first six level-ups follow a fixed shape: dip, bread, upgrade, passive, bread, dip. VS scripts its first six chests (1-1-3-1-1-5) for the same reason: early variety for new players. Reroll and skip stay as they are. [VS Treasure Chest beginner's luck]
11. **Kopi Order ladder** (S4, the Chef's Special dial; complements teardown-habby's Second Shift trial). Siew Dai: −15% enemy HP, rewards ×0.9. O (default): ×1. Gao: +12% damage and HP, one elite wave (wave 7), rewards ×1.25. Gao Kosong: +26% damage and HP, elite waves 6 and 9, rewards ×1.5, elite kills drop a Legendary Crate. Totals per level, not sums. [Brotato Danger levels; VS Curse volume trade]
12. **Nenek's Recipe** (S5+, with chapters 3–5). Offered from the wave 5 elite chest and the wave 10 boss chest; pick 1 of 3; max 3 active. Slow Simmer: no level-up cards for 60 s, then three picks at once. Empty Plate: each empty bread slot +15% damage and −8% cooldown. Chaos in the Wok: throw speed swings ±50% over 10 s. [VS Arcana: Game Killer, Silent Old Sanctuary, Chaos in the Dark Night]

Considered, not in the 12: Brotato's full wave-end shop (a new decision layer on top of level-up cards; test in S5+ only if breathers feel empty); VS-style stacking Luck and Curse (breaks readability and the bot); Brotato's silent enemy-cap kill (do not copy).

Three open-source techniques for the renderer's feel:
1. **Hit-stop as a sim-dt gate** (m2-md `HitStop`, MIT). Put it in `src/core/`: it takes real dt, returns simDt (0 while frozen), splits the partial frame, and keeps the longest freeze when hits overlap instead of summing them. Tweens and input keep real dt. Pair it with sajmoni's seeded trauma shake (MIT, about 700 B), which fits our seeded core, instead of Phaser's default `Shake`.
2. **Damage numbers** (DamageSplash rules, saltmire pooling, a deePool-style pool). Size by share of target HP; tags for crit, kill and sneak; DoT ticks merge into one climbing number; pop, then arc; pool capped at 12 on screen. Outline comes from Phaser's built-in Text stroke, not a shader.
3. **Sprite outline** (pixi-filters `OutlineFilter`, MIT). Port the fragment shader to a Phaser 4 filter for enemy hit outlines and the Tawa Blaze halo. Phaser 4's `src/filters` ships Glow and Shadow but no Outline (checked on the default branch, 12 Oct 2026). Trails: no MIT Phaser trail is worth vendoring, so keep the BACKLOG plan.
