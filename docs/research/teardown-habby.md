# Habby teardown and Prata Raja port

Researched 12 Oct 2026 from public pages only: guides, store listings, design write-ups, release notes, one Reddit mirror. Nothing downloaded or decompiled; no datamine used; no Fandom wiki was reachable. "(s)" marks a fact taken from a search excerpt because the page returned 403. Sources disagree on patch versions and rarity names, so treat numbers as 2022–2025 snapshots.

## 0. Corrections to the brief

| Brief said | Finding |
|---|---|
| Capybara Go = auto-battles + choices | Habby (HABBY PTE. LTD.). A text-based roguelike/idle RPG: one tap = one in-game day. Choices are real; auto-battle is not confirmed and App Store reviews disagree ([store](https://apps.apple.com/app/capybara-go/id6596787726), [PocketGamer](https://www.pocketgamer.com/ahead-of-the-game/capybara-go)). |
| Legend of Slime = Habby-style roguelite | Not Habby, not a roguelite. Publisher LoadComplete; idle RPG with auto-battle, PvE and PvP arena ([store](https://apps.apple.com/app/id1618701110)). Dropped; Habby house-style titles used instead ([Mobilegamer](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/)). |
| Naavik, Deconstructor of Fun, Mobilegamer | Naavik: Survivor.io deep dive, Oct 2022 ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)). Deconstructor of Fun: nothing on Survivor.io found. Mobilegamer: Habby sequencing, Mar 2023. |

## 1. Survivor.io (Habby; Android launch Jul 2022; newest dated patch seen 3.10.6, Jul 2025)

### 1.1 Run structure (time-based waves)

| Element | Public facts | Source |
|---|---|---|
| Round | Target ~15 min. A timer drives new enemies plus mini and regular bosses | [PocketGamer.biz](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/), [Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) |
| Boss clock | A boss about every 5 min; elite, then boss, escalating each stage | Naavik; [PocketGamer best-powers](https://www.pocketgamer.com/survivor-io/best-powers/) |
| Boss kinds | Normal, scheduled and "allocated" bosses (allocated warns first) (s). Normal and scheduled bosses drop a golden chest | [TalkAndroid](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/); [AppGamer](https://www.appgamer.com/survivorio/daily-tasks) (s) |
| Chapters | Numbered blocks per update: 101–105 (v2.0.5), 111–120 (v2.2.1), 206–210 (v3.3.0, 16 Oct 2024). Ch.3 is the first closed-area map: edges block escape | [APKMirror 2.0.5](https://www.apkmirror.com/apk/habby/survivor-io/survivor-io-2-0-5-release/) (s), [3.3.0](https://apkmirror.com/apk/habby/survivor-io/survivor-io-3-3-0-release) (s), [AppGamer ch.3](https://www.appgamer.com/survivorio/chapter-3-basement-parking) (s) |
| Replays | "Trials" replay cleared levels on higher difficulty for unique rewards. Players reach level 50+ and max abilities early (power spike) | Naavik |
| Level-up | Three choices per level-up; reroll count not stated | [ProGameGuides](https://progameguides.com/survivor-io/how-to-get-weapons-evolutions-in-survivor-io/), PocketGamer.biz |

### 1.2 Skill catalogue and evolutions

Slots: 6 weapons and 6 passives ([MuMu](https://www.mumuplayer.com/blog/survivor-io-guide.html), Naavik). Evolution = weapon at L5 + its partner passive, and a boss golden chest opens it ([ProGameGuides](https://progameguides.com/survivor-io/how-to-get-weapons-evolutions-in-survivor-io/)). Max level beyond L5: not published in any source found (one unverified snippet cites L10 and L20 milestones). Tiers: PG23 = [PocketGamer 2023](https://www.pocketgamer.com/survivor-io/best-gear/); Inv22 = [Invenglobal 2022](https://labs.invenglobal.com/articles/17917/guide-survivorio-tier-list-for-best-weapons); BP22 = PocketGamer best-powers 2022.

| Weapon | Tier | Evolves to | Partner passive |
|---|---|---|---|
| Kunai | S (PG23, Inv22) | Spirit Shuriken | Energy Cube |
| Lightchaser | S (Inv22), A (PG23) | Eternal Light | Ronin Oyoroi |
| Shotgun | B (PG23, Inv22) | Gatling | Hi-Power Bullet |
| Katana | B (Inv22), C (PG23) | Demon Blade | Ronin Oyoroi (s) |
| Revolver | A (PG23, Inv22) | Two revolvers firing together | not stated |
| Baseball Bat | A (Inv22), B (PG23) | Lucille | not stated |
| Brick | S (BP22) | Dumbell (PG); "1-Ton Iron" in one source | Fitness Guide (s) |
| RPG | A (BP22) | Sharkmaw Gun | not stated |
| Laser Launcher | B (BP22) | Death Ray | Energy Cube (s) |
| Molotov | B (BP22) | Inferno Bomb | not stated |
| Drone Type-A + Type-B | B (BP22) | Destroyer; + Medi-Drone = Divine Destroyer (s) | Medi-Drone (s) |
| Guardian | A (BP22) | Defender | Energy Drink |
| Forcefield Device | A (BP22) | Pressure Forcefield | Energy Drink |
| Void Power | S (PG23) | not found | not found |

Also seen, no evolution data: Soccer (S), Lightning (S), Thunderbolt Bomb (A), Durian (A), Drill (B), Boomerang (C), Pistol (level-10 upgrade, unverified). Passives (9 seen): Energy Cube (cooldown, "close to mandatory" (s)), Hi-Power Magnet (XP pull), Fitness Guide (max HP), HE Fuel (AoE range), Hi-Power Bullet (crit damage), Hi-Power Scope (range), Energy Drink and Ronin Oyoroi (partners above), Medi-Drone (Destroyer partner, type unclear) ([ProGameGuides](https://progameguides.com/survivor-io/how-to-get-weapons-evolutions-in-survivor-io/)).

### 1.3 Pickups, chests and payouts

| Item | How it works | Source |
|---|---|---|
| Smashable crates | Drop soft currency or an item: healing meat (heals), bomb (kills enemies in view), magnet (pulls XP) | PocketGamer.biz |
| XP | From kills; collected manually early; vacuum range is an early pick; Hi-Power Magnet speeds it | Naavik, ProGameGuides |
| Golden chest | Each normal or scheduled boss; evolution is gated on opening it | TalkAndroid, ProGameGuides |
| Lucky train | Mid-run pop-up with random buffs, sometimes several | TalkAndroid |
| Chapter missions | Award keys that open equipment chests | TalkAndroid |
| Run payout | Death returns you to the menu: spend soft currency on heroes and gear. Blueprints upgrade rare gear | PocketGamer.biz |
| Patrol (idle) | EXP and coins; accrues up to 24 h; rewards rise with cleared chapters | TalkAndroid; [AppGamer](https://www.appgamer.com/survivorio/weekly-tasks) (s) |

### 1.4 Gear (6 slots)

Slots: weapon, armour, necklace, belt, gloves, boots ([PocketGamer 2023](https://www.pocketgamer.com/survivor-io/best-gear/), [AllClash 2025](https://www.allclash.com/best-gear-each-slot-in-survivor-io/)). Rarity ladders conflict:

| Source | Ladder as reported |
|---|---|
| PocketGamer 2023 | Grey, Green, Blue, Purple, Yellow, Red. Purple to +2, Yellow to +3, Red to +1; Grey, Green, Blue have no +levels |
| [TalkAndroid 2023](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/) | Normal, Good, Better, Excellent, "S Grade Excellent" (called the best available) |
| [Reddit mirror, Nov 2023](https://redlib.hbubli.cc/r/Survivorio/comments/186lw2q/merging_guide) | Purple = Epic; names and colours differ from PocketGamer 2023 |
| [AllClash, Jun 2025](https://www.allclash.com/best-gear-each-slot-in-survivor-io/) | "S-Grade" tops items; S+ to D is a per-piece power tier; Astral Forge upgrades to 1–3 stars |

- Merge: 3 identical (same tier and type) → next tier (PocketGamer 2023, TalkAndroid, Reddit). Same tier and type → +level (PocketGamer 2023).
- Excellent tier: any 3 weapons, or any 3 boots, necklaces or gloves ([GamerJournalist](https://gamerjournalist.com/how-to-get-epic-equipment-in-survivor-io/) (s)). Reddit requires identical items: conflict.
- Enough merged Excellent → Level-S; 3 Level-S of one type → first Epic (s). Epic and Legendary are not sold (s).
- Named families across slots (Eternal, Voidwaker). Gear resets cheaply (AllClash).
- "S-grade" is a rarity name in TalkAndroid but a power-tier label in AllClash. Keep them apart.

## 2. Capybara Go! (Habby)

| Item | Facts | Source |
|---|---|---|
| Price | Free with IAP ($0.99–$49.99); ads as optional rewards. Earliest visible version 1.0.5 (30 Sep 2024); latest seen 1.9.3 (year not shown) | [App Store](https://apps.apple.com/app/capybara-go/id6596787726) |
| Genre | Text-based roguelike adventure (store); "text-based RPG with idle and roguelike elements" (PocketGamer, 5 Nov 2024) | App Store; [PocketGamer](https://www.pocketgamer.com/ahead-of-the-game/capybara-go) |
| Session | Tap advances one in-game day; capybara treks seas and dungeons; events and choices (path, gear, abilities, animal allies); outcome = choices + luck | App Store |
| Combat | Fights monsters and humans each day. Auto or manual not stated; reviews split ("battling system" vs "tap one button") | PocketGamer, App Store |
| Pets, mounts | Hatch pets that fight alongside; unlock mounts; pet growth added in v1.9.3 | PocketGamer, App Store |
| Rage | Full rage meter fires rage skills; elites use the same mechanic | [Theria Games](https://theriagames.com/?p=58587) (s) |
| Chapters | Chapter = 60 in-game days; failing restarts it; entry costs energy; daily conditions shift HP, ATK, DEF | [findingdulcinea](https://findingdulcinea.com/capybara-go-beginner-guide) (s) |
| Idle | AFK rewards while away; roaming with a multiplier; stamina return (v1.1.0); sign-in events | PocketGamer, App Store |

Why it keeps players without skill demand (my inference; no source says it):
- One tap per session, so the bar to return is near zero.
- Choices are readable and luck-weighted: no reflex test, no skill wall.
- Progress accrues while away (AFK, roaming multiplier), so reopening pays.
- Stamina refills on a clock: a built-in "come back at X" moment.
- Long arcs (60-day chapters) and collection (pets, mounts, gear) supply goals.
- [Gamigion](https://www.gamigion.com/?p=21296) frames it as roguelite progression in idle clothing (undated; likely 2025).

## 3. Non-monetised retention systems (numbers where public)

| System | Survivor.io | Capybara Go | Prata Raja today |
|---|---|---|---|
| Daily board | 100 pts unlocks all daily chests. Most tasks 10 pts, some 20; 120 pts available. One 20-pt task needs a purchase, excluded ([AppGamer](https://www.appgamer.com/survivorio/daily-tasks) (s)) | Daily to-dos, incl. collecting AFK rewards before they cap (s) | 10 flat daily quests, 60–150 coins (CONTENT §12c); 7-day login (SPEC §5) |
| Weekly board | Six 20-pt tasks (e.g. 50 boss kills, merge gear twice). 5 of 6 unlocks the final chest: gold, 300 gems, 5 × 1 h patrol ([AppGamer](https://www.appgamer.com/survivorio/weekly-tasks) (s)) | not found | none |
| Idle | Patrol: EXP and coins, 24 h cap, rises with cleared chapters | AFK and roaming rewards; stamina return | Tip jar: 20 coins/h, +2/h per stall level, 12 h cap (SPEC §4) |
| Chests | Golden chest per boss; keys from chapter missions; daily login chest; lucky-train buffs | not covered | Pity: every 5th ≥ Rare, 20th ≥ Epic (SPEC §4). A chest rolls every run (runRewards.ts) |
| Energy | Starts battles; refills over time; login timer pauses offline | Stamina refills; chapter entry costs energy (s) | Rejected: no energy timer (SPEC §1) |
| Events | Event challenge quests give gems; daily quests vary by weekday ([PocketGamer.biz](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/)) | Sign-in events; PvE and pet updates (App Store) | Chef's Special (S4) |
| Achievements | Listed in Mission Center; reward numbers not public ([TalkAndroid](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/)) | not found | Bread-dex (S4, SPEC §5) |
| Replays | Trials at higher difficulty for unique rewards (Naavik) | Failed chapter restarts (s) | Second Shift (#15) |
| Retention | Day 1 mid-40%; D30 below Archero's ~10% (Naavik, 2022) | n/a | Targets: about half return day 2, a third day 7 (engagement.md) |

- Sequencing ([Mobilegamer](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/), Mar 2023): features unlock over several days, not one tutorial; equipment arrives around day 4 (Sssnaker); idle progression hooks stuck chapters; achievements, dailies and battle passes come last.
- Archero (Habby, via Naavik): few-minute runs, hero-and-gear meta, Day 1 nearly 80% at launch, D30 about 10%. Punball and Kinja Run: named only, no data found.

## 4. Port to Prata Raja

### 4.1 New hawker pickups, chests and abilities

Numbers are first-pass for the balance sim. "Grate" = Longkang grate (drain), see idea #1.

| ID | Name | Type | Effect | Source | Habby analogue | Slice |
|---|---|---|---|---|---|---|
| P1 | Kaya Toast Set | heal | +10 HP (10% of base) | grate, weight 30 | healing meat | S2.5 |
| P2 | Tip Jar | magnet | 4 s: XP and coins fly to the counter | grate, 25 | magnet | S2.5 |
| P3 | Otah Stink Bomb | bomb | 40 dmg to every pest in view (elites and bosses take 15); pests stunned 1.5 s | grate, 15 | bomb | S2.5 |
| P4 | Ang Pow | lucky roll | Pick 1 of 3 random 15 s buffs: +25% dmg, +25% throw speed, 3 s shield, +15% crit, +30% XP | grate, 15 | lucky train | S3 |
| P5 | Plastic Chair | barricade | Chair on the street soaks 5 shots or 8 s; the ch.2 prop | grate, 8 | none (ours) | S3 |
| P6 | Kopi-O Peng | haste | 6 s: +30% throw speed, +20% move speed | grate, 7 | none (ours) | S2.5 |
| T1 | Tingkat (tiffin carrier) | golden chest | Boss drop: 1 Rare+ gear roll, plus an evolution offer if a bread is L5 with its partner | boss | golden chest | S3 |
| T2 | Tiffin | chest | Reward from Stall Chores or Market Week (#12, #13) | boards | daily chest | S4 |
| A1 | Kopitiam Kucing | companion card, L1–L5 | Hits nearest pest every 2.5 s for 6 dmg; L5: every 2 s, 12 dmg, 0.3 s stun | level-up card | Capybara pets | S3 |
| D1 | Asam Pedas | dip, on-hit | Hit marks "sour" 4 s: enemy contact dps −30% at L1, +5% per level. A sour kill passes sour to the nearest enemy within 120 px | dip card | none (ours) | S3 |

### 4.2 Fifteen ideas

Gap check: our 12 passives already match Survivor.io's families (XP pull, max HP, AoE, crit, range). Cooldown is the gap; #5 fills it. Slices follow HANDOFF order: 0.2.0, 0.2.1, feel pass (S2.5), 0.3.0 (S3), DEPTH, S4. Dip-to-bread links, set bonuses and keystones belong to the planned DEPTH.md and are not repeated here. #3 changes S3 work in flight (sol/s3): settle before merge. No Habby leaderboard data found; S4 leaderboard stays as planned.

| # | From Habby | Prata Raja version (names, numbers) | Slice |
|---|---|---|---|
| 1 | Smashable crates | Longkang grate in the street. 3 hits break it and drop one of P1–P6 by weight (30/25/15/15/8/7). 1 per wave, 2 on boss waves. Pickups never come from the tip jar | S2.5 |
| 2 | Crate pickups: heal, bomb, magnet, lucky train | P1–P6 (4.1), each with a HUD icon; the counter shows held buffs | S2.5–S3 |
| 3 | Golden chest gates evolution ([ProGameGuides](https://progameguides.com/survivor-io/how-to-get-weapons-evolutions-in-survivor-io/)) | Evolutions come only from a Tingkat (T1), never a random card. A wave-5 elite also drops one. Divine (S5+): evolved bread plus a second L5 partner, e.g. Thosai Typhoon + Dhal = Divine Typhoon (cf. Destroyer → Divine Destroyer) | S3; Divine S5+ |
| 4 | Hint text under cards (s, [ProGameGuides](https://progameguides.com/survivor-io/how-to-get-weapons-evolutions-in-survivor-io/)) | Card footer "Pairs with Egg (Telur)" when a card's item partners something you own | S3 |
| 5 | Energy Cube: cooldown passive | Preheat, 13th passive: −5% bread cooldowns per level, max 5 (−25%) | S3 |
| 6 | Pets fight alongside you ([PocketGamer](https://www.pocketgamer.com/ahead-of-the-game/capybara-go), Nov 2024) | A1 Kopitiam Kucing: a level-up card, not a run-long companion | S3 |
| 7 | Rage meter (s) and the owner's Tawa Heat (BACKLOG) | Heat 0–100: +2 per kill, −25 when hit, slide sheds 10/s. Tiers at 25/50/75 give +5/+10/+15% dmg. Full = Tawa Blaze 6 s (+40% dmg, +20% throw speed), then settles at 50. Training named "Tawa Heat" needs renaming (4.4) | S2.5 |
| 8 | Timer and boss notifications ([PocketGamer.biz](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/); boss every 5 min) | HUD line "Rush 0:12 · Boss 1:40" (Rush = the existing 60 s spawn surge). Boss banner 10 s ahead stays | S2.5 |
| 9 | Merge grind (Naavik); Excellent-tier any-3 (s) | Any 3 pieces of one slot merge into the next tier (base random within the slot), across the Common→Uncommon→Rare steps in SPEC §4. No dead-end pools | S2 |
| 10 | None; dip gap check (ours) | D1 Asam Pedas: the only dip that cuts counter damage (4.1). Sambal already spreads on death, so sour spreads by a contact-dps debuff instead | S3 |
| 11 | Patrol: 24 h cap, rises with cleared chapters ([TalkAndroid](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/)) | Market Round: idle tip jar +1 coin/h per cleared chapter (max +5). Cap stays 12 h (SPEC §4) | S2 |
| 12 | Daily points unlock chests ([AppGamer](https://www.appgamer.com/survivorio/daily-tasks) (s)) | Stall Chores: 10 chores, eight at 10 pts and two at 20 pts (120 total). 100 pts unlocks a Tiffin: 1 Rare+ gear roll + 100 coins. Replaces CONTENT §12c's flat quests | S4 |
| 13 | Weekly board: 5 of six 20-pt tasks ([AppGamer](https://www.appgamer.com/survivorio/weekly-tasks) (s)) | Market Week: six 20-pt chores (e.g. 50 pests, merge twice, beat a boss). 5 of 6 = Epic roll + 300 coins | S4 |
| 14 | Chapter 3 closed area (s); owner's real-places list (BACKLOG) | 1 Kopitiam Street · 2 Newton Food Centre at night · 3 Tekka Centre, a closed hall: walls on all sides, pests enter from three doors · 4 Lau Pa Sat satay street · 5 Gluttons Bay finale. Stylised, no real stall names | S3 (ch.2); S5+ (3–5) |
| 15 | Trials replays for unique rewards (Naavik) | Second Shift, unlocked by a chapter boss win: +40% HP, +25% pests, ×1.5 coins. First clear per chapter adds a guaranteed Rare+ gear roll; repeats pay coins only (no farming) | S3 (after ch.2); S5+ |

### 4.3 Not ported

- Energy and stamina timers (Survivor.io, Capybara Go): SPEC §1 rules out energy timers.
- Gems, paid sets, battle pass, ad chests: SPEC §1 rules out IAP and ads.
- 15-minute rounds: Naavik calls the length a grind. Our 6-min runs stay.
- Hero power creep: Naavik says new heroes cannot be much stronger, and one hero plus one gear set lasts. Budget each hawker hero's kit (BACKLOG roster) and give each a signature bread.
- Max-everything power spike (Naavik): keep caps; Second Shift scales difficulty instead.

### 4.4 Conflicts to settle before S2

1. Currency: SPEC says coins (HANDOFF ruling: tokens → coins). CONTENT says gold; engagement.md says Dough.
2. Merge cap: SPEC §4 stops at Rare; CONTENT §9 chains to Raja; engagement.md stops at Rare and uses a "Fine" tier that appears nowhere else.
3. Tawa Heat: training ladder (CONTENT §11, +3% DoT) vs the owner's meter (BACKLOG). Rename the training to "Seasoning" (ours).
4. Chapter names: WORLD (Pasar Malam, Wet Market, Food Street) vs CONTENT §7 (Monsoon Alley, Durian Row, Shophouse Roof) vs BACKLOG (real places). #14 follows BACKLOG.
5. Evolution names: engagement.md "Dhal Burst" and "Egg Prata" vs CONTENT §4 "Half-Boiled Halo" and "Egg (Telur)". Use CONTENT.
6. Pests: WORLD's mynah, drain rat, tray rat, chope packet and Grade Inspector are missing from CONTENT §5.
7. Per-run chest: runRewards.ts rolls one every run; SPEC §4 gives Epic+ only from chests and bosses. Decide whether T1 replaces the per-run chest.
