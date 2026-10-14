# Hub design research: home bases between runs

Scope: how roguelite/ARPG hubs get engagement, where they cause tedium, and what to borrow for Kannan's prata stall. Sources are Steam, Reddit, wikis, GDC coverage and design write-ups found in one cheap search pass. Items marked (unsourced) are from general knowledge, not checked this pass.

## 1. What players engage with

- **Walkable hubs with people in them.** Hades House and Hades II Crossroads are the reference. Hades' hub has voiced characters with their own stories and relationships that you raise with gifts and conversation (gamerant, gamepressure). Hades II Crossroads is praised as "an all-timer hub world" (thegamer) for its cast, vendors and benches to sit on.
- **The hub remembers your failures.** In Hades, every return to the House counts as a new escape attempt, and characters comment on your attempts (kokutech). Each failed run still advances something.
- **Visible base growth.** Soul Knight's Living Room, Workshop and Garden are walkable rooms; the Renovation Project Leader lets you reskin them, and the Garden unlocks after a few plays (soul-knight fandom). Halls of Torment's camp is praised as "a small island of rest" that gains progression (Steam suggestions thread).
- **Buff meal before the hunt.** Monster Hunter's Canteen: you eat once before leaving HQ, and the buffs last for the hunt and expire when you return (game8, fandom). Players call it the real pre-hunt ritual.
- **Diegetic crafting.** Potion Craft crafts in a Laboratory with physical tools (bellows, cauldron) on an alchemy map, so crafting is the room, not a menu (fandom wiki).
- **Business loop plus action loop.** Dave the Diver: dive by day, run a sushi restaurant by night. Players call it "comforting" and compare the community pull to Animal Crossing (invenglobal GDC24 write-up).
- **Short, always-progressing sessions.** Dave's loops take 15-30 minutes, each step gives audio/visual reward, and an in-game phone tracks progress across all loops (LinkedIn goal-loop analysis).

## 2. Complaints

- **Walking and slow movement.** Dave the Diver players say walking to tables and grinding wasabi "feels like a slog" because Dave is slow and tires (Steam discussion, Jhaeme).
- **Slow exit from action screens.** Dave's pour/wasabi action screens take too long to leave, so customers get missed (Steam discussion, Saurixy).
- **Distant stations.** Diablo 4's most-upvoted complaint (r/Diablo, about 1,000 votes): stash, blacksmith and occultist are too far apart in every town. Players asked for consolidation (Blizzard forums, same topic).
- **Base management overload.** Cult of the Lamb players say the base grows too fast and the "constant base management" overwhelms them (Steam, "Base progressing TOO FAST?").
- **Monotony of the day/night split.** GDC24 talk admits the dive-by-day, restaurant-by-night routine "could feel monotonous" and the team added side activities to counter it (invenglobal).
- **Menu bloat / thin meta.** Death Must Die commenters say a lack of meta progression "really hurts" the game, while Vampire Survivors works through a simple Unlocks list (Steam discussions). Menu-only meta reads as a checklist, not a place.
- **Hidden state.** Dave players could not find the count of angry customers in the management app (Steam, Jhaeme). Hidden info costs the loop.

## 3. Patterns for combining stations

- **Stash plus crafting at one bench.** Diablo's complaint is distance, not the features. One counter that holds stash, forge and enhance removes the walk.
- **Forge and enhance as one station.** Hub stations that share a workbench avoid two trips for one gear loop (inference from the Diablo complaint).
- **Pre-run meal at the stall.** Monster Hunter's canteen buff is a one-meal, one-run choice with a clear expiry. It fits a prata stall: cook a dish, the dish buffs the next run, and it expires on return.
- **Shortcut to the run.** Hades uses doors and a single "go" point. Keep one station = one interaction, with a map/travel shortcut for anything far.
- **Gossip-based NPC relationships.** Hades' gift-and-talk loop gives every visit a reason to walk to someone (gifts = ingredients from the last run).

## 4. Dave the Diver dual loop: why it works

- **Action loop:** dive, hunt, grab ingredients. Hunting technique changes ingredient quality (LinkedIn).
- **Business loop:** the restaurant turns dive hauls into dishes; gold and acclaim fund suit and gear upgrades, and dish quality ties to customer likes, which raise rank and unlock slots (LinkedIn).
- **Why loved:** the two loops feed each other, each step pays out, and the restaurant is a "vicarious" real-life job (gamedeveloper.com).
- **Where it breaks:** the restaurant's action screens and walking. Fix by making the business phase fast and by a clear priority rule (clean first).

## Recommendations for Prata Raja

**Concept A: The stall as a walkable home (one room, all stations).** Kannan walks a small hawker-centre stall. Rotis, dips, forge, pantry and recipes are fixed stations in one room, each one interaction away. A single "stall board" shows the day's specials and what is ready.
- Mesh: Hades House + Potion Craft diegetic crafting.

**Concept B: Pre-run prata buff (the Canteen moment).** Before leaving, Kannan cooks one order at the stall. The meal buffs the next run and expires on return. Buff choice comes from pantry ingredients from the last run, so the hub and run connect.
- Mesh: Monster Hunter canteen + Hades gift loop.

**Concept C: Fused stations (forge + enhance + stash at one bench).** Merge stash, forge and enhance into one counter, so gear work needs one trip. The other stations stay separate.
- Mesh: fixes the Diablo distance complaint.

**Concept D: The stall business loop (Dave-style night shift).** Each run's haul becomes stock for the next day's stall. Customers order from the day's board: dish quality ties to customer taste, rank unlocks stall slots. The business phase is a quick tap-through, never a walk.
- Mesh: Dave the Diver dual loop, with the business phase kept short.

## Anti-tedium rules

1. Every station reachable in one interaction from the stall. No walk longer than about 10 seconds.
2. Business phase: one screen, tap-only, under 2 minutes. No animation that delays the next action.
3. One "go" button into the run from anywhere in the hub; the last pre-run choice is remembered.
4. Stash, forge and recipes search from one list, not separate menus.
5. Show hidden state on the board (orders waiting, angry customers, buffs active).
6. Cap menu depth at 2 levels from the stall.
7. Hub changes are visible: the stall grows (new stool, sign, stove) when a milestone is hit.
8. Clean-first rule: any queued-urgent task appears first, never buried.
