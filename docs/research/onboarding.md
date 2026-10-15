# Onboarding: first 15 minutes and progressive disclosure

Research for the r8 hub problem: a new player lands in a hub with 8 empty stations, 0 coins and no next step. Checked 2026-10-15. Sources are search snippets and player guides (not fetched in full, not developer postmortems) unless marked "design read" or "unsourced". Treat exact numbers as leads to verify, not facts.

## 1. What is visible or locked (minute 0, 5, 15)

| Game | Minute 0 | Minute 5 | Minute 15 | Source |
|---|---|---|---|---|
| Dave the Diver | Dive only; debt of $100 is the goal | Gun tutorial after fetching rope + scrap; first iDiver upgrade free on early mornings | Phone/iDiver around the one-hour mark; night diving locked until chapter 2 | [ThereviewGeek](https://www.thereviewgeek.com/davethediver-walkthrough-prologue/), [GGRecon](https://www.ggrecon.com/guides/dave-the-diver-starting-tips/) |
| Archero 2 | Stage 1 only; energy gates chapters (5 per stage) | Level-up picks: 1 of 3 skills | Chapter 2 needs gear; characters unlock at stage 3 | [LevelWinner](https://www.levelwinner.com/archero-2-beginners-guide/), [PocketGamer](https://www.pocketgamer.com/archero-2/guide/) |
| Cult of the Lamb | Scripted intro, revived by a spirit | Tutorial gives first few followers; missions marked | Tutorial ends with a small starting cult; worship unlocks build options | [LevelUp](https://www.levelup.com/en/news/693769/Cult-of-the-Lamb-Creating-your-cult-has-never-been-this-fun) |
| Moonlighter | First dungeon = tutorial; death triggers shop cutscene | Blacksmith bought early; bow advised | Level 3 and a 2-way portal back to town | [Gameranx](https://gameranx.com/features/id/152028/article/moonlighter-beginners-guide-16-tips-to-help-your-dungeon-shop-thrive/), [TrueAchievements](https://www.trueachievements.com/game/Moonlighter/walkthrough/3) |
| Cookie Run Kingdom | Story + basic controls tutorial | Spell slots unlock via World Exploration | Castle waits until end of episode 1 | [Prima](https://primagames.com/tips/cookie-run-kingdom-beginners-guide-tips), [GamerTag](https://gamertagmythras.com/blog/cookie-run-kingdom/crk-beginner-mistakes-to-avoid) |
| Soul Knight Prequel | Some classes locked | Prestige class needs level 5 | Battle pass gates one basic class | [ItemLevel](https://itemlevel.net/soul-knight-prequel-best-tips-tricks-for-beginners/) (Prequel, not original) |
| Brotato | Visible unlock icons; conditions shown as "?" | Clearing early level unlocks items | 20-wave clear unlocks new levels | [Gamesasylum review](https://www.gamesasylum.com/?p=56743), Steam discussion (player quotes) |
| Vampire Survivors | Few weapons; hidden unlocks | Unlocks fire after unscripted in-run events | Wiki needed to find requirements | [Steam discussion](https://steamcommunity.com/app/1942280/discussions/0/3800526046835386383), [Epic store](https://store.epicgames.com/p/vampire-survivors-f699a1?lang=cs) |
| Survivor.io | Short run, upgrades in run | Between runs: menu with soft-currency upgrades | Early power ramp then "progression wall" (purchases) | [Mobilegamer / Naavik](https://mobilegamer.biz/two-months-in-survivor-io-passes-75m-from-37m-downloads/) |
| Hades (House of Hades) | Central hub, 1 room open | Bedroom unlocks after 8 runs (talk to Achilles) | Full bedroom after 10 runs; Admin Chambers ~27 runs | Search snippet, [TrueAchievements](https://www.trueachievements.com/game/Hades/walkthrough/4); verify on wiki |

## 2. How features are introduced

| Pattern | Seen in | Note |
|---|---|---|
| One verb per short objective | Dave | "Catch 3 fish" then move on; each step is one action |
| Money or repair goal as the hook | Dave | $100 debt to repair the sushi bar; loop = dive, gather, sell |
| Tutorial reward that is also a mechanic | Dave, Cult | Gun tutorial comes from a fetch task; first followers from tutorial |
| Death or fail teaches the system | Moonlighter | Cutscene explains the shop after the dungeon fail |
| Feature waits for story/chapter | Dave, CRK, Archero 2 | Night diving, castle, chapter 2 |
| Visible lock with condition | Brotato, Cult (marked missions) | Lock icon shows what is needed |
| Hidden lock, discovered by play | Vampire Survivors | Works for players who read wikis; bad for first session |
| Pulse / red dot on new things | Archero 2 menus (per [mobile-ui-flow](mobile-ui-flow.md)) | Repo doc, not re-verified |

Design read: the common thread is one new thing at a time, each tied to a reward the player already wants. Unsourced: a single pulsing target is the usual FTUE convention in mobile games.

## 3. First three runs: tuning

| Game | Run 1-3 tuning seen | Source status |
|---|---|---|
| Archero 2 | Chapter 1 clearable with no gear; chapter 2 needs gear | Guide |
| Moonlighter | Tutorial dungeon: die as many times as you like | Guide |
| Dave | Fish quota (3) before sushi bar, no fail state | Guide |
| CRK | Forgiving first two weeks, Common starter team | Player opinion |
| Soul Knight (original) | Start with Bad Pistol each run (free to fire) | Guide |
| Guaranteed win / scripted boss | Not found in any source | Gap; unsourced design guess only |

Design read: the safe pattern is "cannot lose the first run, cannot waste the first reward". Scripted boss is common in story games but no source confirmed it for these titles.

## 4. Results screen: next-goal nudges

- Dave: next objective is always a money goal shown on the boat (design read).
- Survivor.io: return to menu with a spend target; power ramp shown there (Mobilegamer piece).
- Archero 2: red-dot menus signal what is new (mobile-ui-flow).
- Unsourced: a results screen should show one "next" line, with a button to the station it names.

## 5. Text density limits for tips

- Repo rule: prompt once at a time, 3-5 uses max (readability-refs, mobile-ui-flow).
- Brotato and Moonlighter: short tooltips, not paragraphs (observed in reviews; unsourced number).
- Unsourced limit we adopt: tip <= 12 words, one visible prompt on screen, one pulse at a time.

## Prata Raja first-15-minutes script (proposal, not built)

Assumes 8 stations: Rotis, Dips (sockets), Gear Forge, Pantry, Orders, Spec tree, Kopi uncle meal, Street exit. Coins counter hidden until first coin. Pulsing target = the single go-button. Locked stations show a silhouette and "after <beat>".

| Time | Visible | Unlocks | Station copy (max 12 words) | Pulsing target |
|---|---|---|---|---|
| 0:00 | Hub, Rotis, Street exit; 7 locked silhouettes | Rotis | Amma: "Pick your prata. Then go outside." | Rotis |
| 0:01 | Roti pick (2 cards) | Roti equipped | "Good. Street exit is that way." | Street exit |
| 0:02-0:05 | Run 1: no fail, 3 weak enemies, 1 telegraphed pest | Coins (first) | Results: "+N coins. Bring a dip next time." | Pantry |
| 0:05 | Hub: Pantry shows coins; Dips station lit | Pantry buy (cheapest flour), Dips | Pantry: "Flour first. Cheap and useful." | Pantry buy |
| 0:06-0:09 | Run 2: one guaranteed chest with a dip | Dip socket | Results: "Socket it at Dips." | Dips |
| 0:10 | Orders board: 1 order (bring one roti) | Orders | Order: "One prata for the aunty. Thank you." | Orders |
| 0:11-0:14 | Run 3: scripted pest boss, cannot die | Gear Forge (story beat after boss) | Results: "Forge lets you make gear. Come back." | Gear Forge |
| 0:15 | Forge, Kopi uncle meal | Kopi uncle meal | Kopi: "Eat before you go. Gives a small buff." | Kopi uncle |

Still locked at minute 15: Spec tree (Kannan level 2, about run 5), Dips beyond 2 sockets, places. Shown as silhouettes with "after 5 runs" text, never as empty stations with no reason.

Rules for the script:
- Never show a station with no unlock reason.
- Never reference a thing the player has not met (fix the current copy that names unmet items).
- One pulse at a time; the pulse moves only after the player acts or 20 s pass.
- Run 1-3 cannot end in a loss screen; the results screen replaces it.

Gaps: no developer sources for any title. Hades FTUE, Soul Knight original, Cookie Run Kingdom and Moonlighter numbers are thin. The 0:xx timings above are design proposals, not measured.
