# Prata Raja: engagement research (no monetization)

Researched 12 Oct 2026 for slices S1-S4. Names (Dough, Dhal Burst, Burger Bandit, Crisp, Puff, Quick) are placeholders. "(secondary)" marks claims that rest on a blog, forum or single consultant; everything else comes from pages I read.

**Verdict.** Build S1 as one curated run where every run pays and every menu matters. S2 (idle, streak, stall ladder, training) carries the return. S3 evolutions and recipes are the long tail. Pull only one S4 item forward: Chef's Special, as a greyed preview on the S2 hub. Skip daily quests until testers ask for them.

**Why these ten.** Archero's day-1 retention was near 80% early on, but its day-30 was around 10% (data.ai, as cited by [Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)). The hooks that matter are the ones that pull people back on days 2-30. Ranking is by return lift per unit of build effort.

## 1. Ten mechanics, ranked

### 1. Build-defining level-up picks (S1)
- **What:** three cards per level-up; one always fits the bread you carry; one free reroll per run.
- **Reference:** Survivor.io also offers three skills per level-up ([PocketGamer.biz](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/)). Vampire Survivors' build choices feed the competence and autonomy its pull is credited to ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)).
- **Why:** each pick changes how the next 30 seconds play, so the run keeps asking a question.
- **Prata Raja:** 10-12 picks per run, one about every 30 s, first pick by 0:20. The first two menus always include a card you can use (dead-build insurance). Reroll: 1 per run, 2 from stall level 4.

### 2. Every run pays, and the death screen shows progress (S1; spend loop in S2)
- **What:** a payout on every run, win or lose, shown before the retry button.
- **Reference:** Vampire Survivors' short runs still earn gold, so no run feels wasted ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)). Strayspark's death-screen checklist: how far you got, what killed you, meta-currency earned, new unlocks, a prominent try-again, aimed at reflection rather than frustration ([Strayspark](https://www.strayspark.studio/blog/building-roguelike-ue5-procedural-progression)).
- **Why:** at six minutes our runs are short next to the 15-30 minute norm, so a wave-3 death must still feel like progress. Survivor.io runs last about 15 minutes ([PocketGamer.biz](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/)).
- **Prata Raja:** Dough = 20 + 12 per wave cleared + 60 for the boss (range 20-200). Stall XP = 40 + 10 per wave + 50 for the boss (max 190). The death screen shows both bars and "next unlock in N Dough". "Run again" is focused: two taps max from death to the next run.

### 3. Idle stall income with a printed cap (S2)
- **What:** the stall earns while the app is closed; one tap collects it on return.
- **Reference:** Clicker Heroes has no fixed offline time limit and counts only idle output; its post says offline progress removes FOMO and rewards routine check-ins ([Clicker Heroes blog](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/embed/)). Capybara Go dresses its roguelite loop in idle clothing ([Gamigion](https://www.gamigion.com/?p=21296), secondary).
- **Why:** the cheapest reason to open the app is a number already waiting.
- **Prata Raja:** 20 Dough per hour at stall level 1, +2 per hour per level, capped at 12 hours (240 at level 1, about 460 at level 10). The welcome-back card lists hours counted and the cap. Idle never gates a run and sends no push notifications before day 3.

### 4. One unlock per stall level (S2)
- **What:** a named next unlock at all times; each level unlocks one slot, dip, bread, reroll or codex page.
- **Reference:** Brotato adds one new character per Danger tier, from Bull at Danger 1 to Demon at Danger 5 ([Brotato wiki](https://brotato.wiki.spellsandguns.com/Dangers)). Slay the Spire's original unlocks key off cumulative end-of-run score per character, at fixed thresholds ([slaythespire.info](https://slaythespire.info/en/how-to-unlock-characters-cards-and-relics-spoiler-warning/)).
- **Why:** a named next unlock turns every run into progress toward something specific.
- **Prata Raja:** stall XP totals of 150, 350, 600, 900, 1,300, 1,800, 2,400, 3,100 and 3,900 for levels 2-10. At about 115 XP per run, level 10 takes roughly 34 runs. The unlock list is in section 3.

### 5. Bread + dip evolutions with a codex stamp (S3; one hard-coded combo in S1)
- **What:** a bread and a dip fuse into a named form; each first trigger gets a stamp, and the codex shows silhouettes of the rest.
- **Reference:** Vampire Survivors' evolutions are its screen-clearing peaks (the game itself). Hades ties new dialogue to every death, so each loss reveals something ([itch.io loop analysis](https://itch.io/blog/774695/to-hell-and-back-again-a-look-at-loops-and-arcs-in-hades)).
- **Why:** the combo is the build-crafting payoff. The codex turns "what else is there?" into a goal that survives a bad run.
- **Prata Raja:** six evolutions across chapters 1-2 (Egg Prata + Dhal = Dhal Burst). Pull Dhal Burst into S1 as one hard-coded combo for the 2:30 wow; build the system in S3.

### 6. Daily streak with free rest days (S2)
- **What:** a daily login with a 7-day gift ladder; a missed day is absorbed, not punished.
- **Reference:** Duolingo lets learners hold up to two streak freezes ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Its own figures (+0.38% relative daily actives; 3.6x course completion for 7-day streakers) are unaudited and the comparison groups are unnamed. Its retention lead says the first week is the most fragile and that letting people pick their streak length lifted retention ([Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)).
- **Why:** streaks run on loss aversion, so one miss must not feel like a wipe.
- **Prata Raja:** day 1 50 Dough; day 2 reroll token; day 3 one material; day 4 80 Dough; day 5 training token; day 6 two materials; day 7 a Rare-or-better chest. Two rest days per 7-day window, applied automatically. A miss beyond that drops the streak by one day, never to zero. Freezes are never for sale.

### 7. Chef's Special: one seeded run a day, previewed the day before (S4; preview from S2)
- **What:** a daily run with the same seed for everyone, plus modifiers.
- **Reference:** Slay the Spire's Daily Climb launched in March 2018 with one challenge a day and one seed for all players ([intothespine](https://intothespine.com/2018/03/05/slay-the-spire-daily-climb/)). Its modifier sets never repeat two days running, which the coverage framed as a reason to return daily ([Kotaku](https://kotaku.com/slay-the-spires-daily-challenges-keep-getting-better-1823780588)).
- **Why:** a shared seed makes runs comparable, and a visible tomorrow gives a reason to return with no timer.
- **Prata Raja:** 3 modifiers from a pool of about 12; no set repeats on consecutive days; reward 300 Dough and one Rare gear roll. A greyed card shows tomorrow's modifiers from stall level 7; playable from level 8. Family leaderboard where the first attempt counts (our rule: it stops rehearsing the exact map).

### 8. Recipes and chapter gates counted in attempts, not wins (S3)
- **What:** progress advances on attempts and materials, so a loss still moves the player forward.
- **Reference:** Slay the Spire's unlock score accumulates across runs, and the page never says a win is needed ([slaythespire.info](https://slaythespire.info/en/how-to-unlock-characters-cards-and-relics-spoiler-warning/)). Hades keeps advancing its story through every death ([itch.io](https://itch.io/blog/774695/to-hell-and-back-again-a-look-at-loops-and-arcs-in-hades)).
- **Why:** a losing run still counts, so the next attempt has a reason to exist.
- **Prata Raja:** chapter 2 opens after 3 boss attempts, win or lose; the boss warning shows "2 of 3". Recipes (materials that become one new bread or dip in the run pool) unlock from materials gathered in runs, not from a boss kill. The recipe book opens at stall level 6.

### 9. Gear merge-3 with pity (S2)
- **What:** three identical items merge into one of the next tier.
- **Reference:** Naavik says Survivor.io's crafting and merging add grind without payoff when they split progress into small pieces, and it asks for long-term tracks with real milestones ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)).
- **Why:** a merge feels good only if the output is a visible jump and the pool never dead-ends.
- **Prata Raja:** merges are 3-to-1 and stop at Rare (Common to Fine to Rare is 9 commons). Epic and above drop only from chests and bosses. Pity: every 5th chest guarantees Rare or better; every 20th guarantees Epic or better.

### 10. Training: five big steps per stat, free respec (S2)
- **What:** permanent stat ladders bought with Dough, visible in the next run.
- **Reference:** Vampire Survivors lets players reset upgraded builds for free and respend their gold ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)). Naavik's complaint about granular progression applies here: few big steps beat many small ones ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)).
- **Why:** permanent power you can see; a free respec removes the regret that makes people stop spending.
- **Prata Raja:** three stats (Crisp = damage, Puff = stall HP, Quick = throw rate), five steps each at 60, 120, 200, 300 and 400 Dough (1,080 per stat). Step 5 adds a visible signature (every fourth bread splits). Respec is free at the hub.

**Not in the top ten:** daily quests and achievements (S4). Habby's framework unlocks daily quests and achievements last ([Mobilegamer](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/), secondary). If built, keep quests to three a day, one free reroll, Dough only.

## 2. First 15 minutes (target script)
- **0:00** No menu, no login. Kannan's stall and one wave; a "drag to move" hint disappears on the first drag; Plain Prata throws by itself. (S1)
- **0:20** First pick of three: Egg Prata, Dhal dip, or Plain Prata with +damage. Run 1 is curated: menus 1-3 always offer Egg Prata and Dhal. (S1)
- **0:45** Wave 2: Dhal slows the first pest; one tooltip on the first hit, never again. (S1)
- **1:30** Wave 3: first elite, a Burger Bandit that steals a dip. The menu includes the run's free reroll. (S1)
- **2:30** Wow: Egg Prata plus Dhal fires a Dhal Burst across the lane, with a "First combo" stamp. (S1, hard-coded)
- **4:00-5:30** Waves 6-10, a pick about every 30 s; the stall HP bar is the only warning. (S1)
- **5:30** Boss telegraphed 10 s ahead by sound and silhouette. (S1)
- **6:00** Run 1 ends, win or lose: Dough and Stall XP payout; Onion Prata joins the pool as a first-run gift. (S1)
- **6:30** First hub visit: Towel slot open; one guided buy (Crisp step 1 = 60 Dough); "Run again" still one tap away. (S2)
- **7:30** Run 2 starts. (S1)
- **9:30** Wave 5: the first gear chest drops a Common Towel; slot 1 fills and the stat change shows on the HUD. (S2)
- **13:30** Run 2 ends: one card, "Sambal dip (burn) unlocked", at level 2. (S2)
- **14:00** Hub: "Your stall earns while you're away", tomorrow's gift shown, and a greyed Chef's Special card. (S2, S4)
- **15:00** Stop. No account, no rating prompt, no sign-in wall; cloud save offered on day 3, never required. (S2)

Opinion: build these fifteen minutes before any art polish. They decide day 1.

## 3. Unlock pacing, first 7 days
Assumes about 4 runs a day (two short sessions) and about 115 XP per run. Stall levels follow the curve in item 4.

| Day (cumulative runs) | Stall level | Unlocks | Return hook at day's end |
|---|---|---|---|
| 1 (4) | 3 | Towel slot; Sambal dip (L2); Headband slot (L3); training opens; Onion Prata from run 1 | Idle explained; day-2 gift shown |
| 2 (8) | 5 | Cheese Prata and a second reroll per run (L4); Apron slot (L5); chapter 2 likely open (3 boss attempts); Murtabak joins the pool | Welcome-back idle (~250-330 Dough); chapter 2 gauge |
| 3 (12) | 6 | Gloves slot (L6); recipe book opens with 3 recipes (S3) | First recipe one material away |
| 4 (16) | 7 | Slippers slot (L7); training step 3 within reach | Day-4 gift |
| 5 (20) | 7 | Pity counter visible on the chest screen; codex shows the first evolution silhouette (S3) | Dhal Burst silhouette |
| 6 (24) | 8 | Chef's Special unlocks (S4); tomorrow's modifiers greyed on the hub | Tomorrow's special shown |
| 7 (28) | 9 | First Chef's Special live; 7-day chest (Rare or better guaranteed); Raja-tier silhouettes in codex | Raja-tier silhouette |

Training maxes out around days 6-7 (3,240 Dough across three stats), which is why a Dough sink must exist before then (see pitfalls).

## 4. Pitfalls that hurt without monetization
- **Grind walls.** Survivor.io farming meant replaying whole 15-minute rounds, and critics called both Archero and Survivor.io grindy and unrewarding ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)). Rule: no single purchase longer than one day of casual play; earlier chapters replay as one-tap runs with lower reward, never as farms.
- **Dead runs.** Brotato players describe restarts when the weapon they need never shows in the shop; the complaint recurs in Steam threads (anecdotal). Soul Knight reviewers found shops stocking duplicates and progression slow ([TouchArcade](https://toucharcade.com/?p=212191)). Rule: the first two menus of every run contain something usable.
- **Meta that ignores the run.** A Rogue Legacy analysis argues that when only the next run benefits, runs blur together, and that each upgrade raises the price of the others ([game-wisdom](https://game-wisdom.com/analysis/rogue-legacy-genealogical-rogue-like)). Rule: every meta purchase shows up inside the run (a stat on the HUD, a regular who grants a free pick), and no purchase makes another dearer.
- **Finished ladder.** Training maxes out around day 6-7. Rule: add a Dough sink (recipes, the Chef's entry fee) before then, or the ladder ends the game.
- **Short-run trap.** Strayspark's author puts the sweet spot at 20-40 minutes ([Strayspark](https://www.strayspark.studio/blog/building-roguelike-ue5-procedural-progression)), and our six-minute runs sit well below it. Rule: every run pays (item 2) and carries 10-12 real picks.
- **Unreadable screens.** Electric Square's Kristina Miles blames wordy intros and pop-up chains for early churn, and says tutorials should be played rather than read ([PocketGamer.biz](https://www.pocketgamer.biz/news/77289/pgc-digital-how-to-enhance-the-first-time-user-experience/)). Rule: 8 words max per card; at most two currencies on screen; tap targets at least 48 dp (our rule).
- **Streak punishment.** A streak that resets to zero is the loss-aversion trap that freezes were built to soften ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Rule: never reset to zero; never sell a freeze.
- **Onboarding walls.** Miles lists big first downloads, forced social logins, required accounts and rating prompts as early-churn drivers, and cites 80-90% of users never returning after first use ([PocketGamer.biz](https://www.pocketgamer.biz/news/77289/pgc-digital-how-to-enhance-the-first-time-user-experience/)). Rule: none of those in the first session.
- **Boss walls.** Brotato's Danger 5 combines +40% enemy stats, elite rounds 11-18 and two bosses at round 20 ([Brotato wiki](https://brotato.wiki.spellsandguns.com/Dangers)). Rule: boss 1 is learnable by a typical run-3 build; tune with testers until most beat it by run 5.
- **Idle nagging.** Pushes and "you're missing out" timers punish the people you want back. Rule: no push before day 3; the only expiry is the printed cap.
- **Near-miss copy.** Vampire Survivors' pull leans on near-miss feedback and its designer's gambling background ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)). For a family audience, keep drops pity-backed (item 9) and never word a result that did not happen.

## 5. Benchmarks, measures, gaps
- **Benchmarks (sanity floor only).** GameAnalytics' 2025 edition (2024 data, 11,600 apps, classic retention): top-quartile D1 26-28%, median D7 3.4-3.9%, top-quartile D7 7-8% ([summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)). A family cohort is self-selected, so watch the trend, not the percentage.
- **Measure with 10-20 testers.** Our targets, not benchmarks: most testers start run 2 within two minutes of run 1 ending; about half return on day 2; about a third on day 7. Read their notes too; percentages will be noisy.
- **Gaps.** No readable GDC talk on roguelite meta-progression. I only saw a preview of the GDC 2019 Slay the Spire metrics talk ([gamedeveloper](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019)); Riot's roguelike-mastery talk ([GDC Vault](https://www.gdcvault.com/play/1022119/Level-Up-Your-Game-The)) is a listing I did not open. Several pages refused access (Vampire Survivors evolutions, Hades' Mirror of Night, the Slay the Spire 2 unlock guide, a GDC 2024 Tencent onboarding session). Archero 2 has store copy and opinion only, no retention data. Archero's day-1 and day-30 numbers are 2022 third-party estimates. Balatro is not covered.
