# Prata Raja v2: one-page spec (presentation rebuild)

Status: draft for the owner's pick (15 Oct). Supersedes the round-8 UI pile; keeps the sim, saves and art.
A fresh session should read THIS file and the picked mockup (docs/superpowers/v2-looks.html), not the history.

## The game in one line
Kannan daydreams his prata stall onto the night street: walk, dodge, auto-throw rotis at pests, grab gifts, beat the boss; come home, make the build stronger, go again.

## Loop (one minute of reading, five minutes of play)
Hub (one screen) → Kitchen (build) → GO → run (3–5 min) → results (loot reveal + one next step) → hub.

## Keep (proven)
- Deterministic sim in `src/core` (free movement, crowd, damage pipeline, finds as tiffin gifts, bosses), balance bands and tests.
- Saves (`src/meta`, `saveStore.ts`), migrations, login wall, ship-fast.
- All painted art (street kit, hub room, stations, Kannan walk, pests, breads, dips, gear, icons).

## Rebuild (everything the player sees)
One hand, one spec, one token set. No feature lands without its screen showing its effect as a number.

### The build is ONE screen: the Kitchen
Today the build is split over Tawa, Dips, Gear rack, Pantry, Spec, Training, Curry pot, Tiffin. v2 folds it into one screen with a live stat card.
- **Roti** (weapon, 1): pick from owned. Card shows dmg, throws/s, special (pierce, hops, blast).
- **Katori** (1–3 sockets on that roti): drag/tap a dip in. Each dip states its effect in one line with numbers ("Hits chill 10%; 3rd hit freezes 1.5 s").
- **Gear** (5 slots: towel, headband, apron, gloves, slippers): tap a slot → list sorted by upgrade; Enhance and Reroll live on the item card (cost shown).
- **Stat card** (always visible): Damage/s, Crit, Speed, HP, plus status lines. Any hover/selection shows before → after in green/red. This is the answer to "I can't see what my build does".
- Spec tree stays its own screen (it's a longer-term plan), reached from the Kitchen header.
- Cut for v2.0 (data kept, UI hidden): training (folds into spec), curry-pot fusion, tiffin packing, recipes, calendar, tip jar.

### Hub: four places, not nine
Walkable stall stays (owner liked the idea), but only four interactables: **Kitchen** (the tawa: build), **Spec board**, **Kopi uncle** (meal buff, one tap), **Street** (GO + place pick). Chests open on the results screen, not in a pantry.

### Run
- HUD: HP + level ring top-left, distance bar top-centre (no truncated names), coins + pause top-right; Dodge bottom-right; nothing else permanent.
- Gifts: walk into a tiffin → pause → 3 cards, each "what it is / what it changes (number) / what you have now → after".
- Status reads on the pest (chill tint, freeze ice, burn embers), not as side icons.

### Results
Headline, metres, loot reveal one item at a time (coins, XP bar, chest opens here), ONE next-step button that opens the screen it names ("Socket your new Mint Chutney" → Kitchen with that dip highlighted).

### UI rules
- One type scale (30/22/18/15/13), three button tiers (go / plain / chip), painted icons only, ≥44 px targets, ≥4.5:1 text contrast.
- Every screen: header (title + ×), body, footer with one primary action. Max two levels deep.
- Numbers over adjectives. Every effect has a number; every change shows before → after.

## Process (to stop the drift)
1. Owner picks a look from the mockup (A or B). 2. Build `/v2` route beside the current game, reusing the sim; one builder per screen against this spec, lead reviews every screen against the mockup before merging. 3. Owner plays `/v2`; when it beats the old game, swap and delete the old UI.
