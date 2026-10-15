# Prata Raja v2: the game concept

Lead design, 15 Oct (late). Sits on top of docs/plans/v2-spec.md (screens, process) and the paper cut-out look (DIRECTION.md). Art: ~/prata-raja-assets/v2/ (Codex batch 4). Every number below is a starting point for tuning, not a promise.

## The fantasy in one line
A tired prata man daydreams himself into a legend: every night he flips his way from Tawa Boy to a Raja of the street, and his build is a recipe he keeps perfecting.

## Pillars (every feature is checked against these)
1. **Crazy throwing**: throwing is the toy; it must feel great with zero upgrades and absurd at Raja tier.
2. **Crunch**: every hit lands with weight; crits are the crunchiest thing in the game.
3. **Combos you can see**: statuses read on the pest, reactions are loud paper events with names.
4. **Paper hawker nostalgia**: a cut-paper memory of a 90s Singapore night: kopitiam radio, void-deck football, pasar malam lights, tingkat tiffins, old-school snacks.
5. **One cohesive paper world**: one material, one angle, one typeface; nothing breaks the craft.

## Throwing (the toy)
- **Every roti throws differently**: Kosong spins flat and fast; Tissue is a paper-thin blade that whistles through a line; Garlic Naan lobs in a high arc and slaps down; Murtabak is a heavy frisbee that bowls pests over; Egg prata bounces off walls; Thosai rolls out like a carpet.
- **Rhythm**: every 3rd throw is a **flip throw** (a little twirl from Kannan, bigger, guaranteed status). Keep walking and the rhythm holds; stand still and it builds faster.
- **Catch-back**: some throws boomerang; catching one as it returns (walk into it) gives a **Fresh off the tawa** bonus: next throw is double size.
- **Dodge throw**: dodging through pests fires a spray of pratas behind you (trick-shot feel).
- **Tawa charge**: no input for 1.5 s and the tawa sizzles; the next throw is a scorching **Sizzler** that applies Burn.
- **Escalation**: at Raja tier volleys fill the screen: fans of pratas, orbiting tawas, golden pratas raining; readability holds because statuses and reactions carry the information, not the projectiles.

## Crunch and feel (paper physics)
- Hit: pest squashes (1.2 x 0.8, 60 ms snap back), 1-frame paper-white flash, tiny paper flecks, 30 ms hit-stop on crits only.
- Crit: torn-paper **CRUNCH** starburst, golden flakes that tumble and land, a bigger chunky number, 2 px screen kick.
- Kill: pest folds flat like a paper cut-out tipping over, then tears into confetti; coins hop out on paper springs.
- Area (Wet): splats that drip, spread, then dry into stains on the paper road (stains fade after 6 s).
- Crowd control (Dough): pests sink into wobbly dough that stretches when they struggle and snaps when it breaks.
- Kannan: squash-and-stretch on throw, towel flutters on dodge, a paper "oof" crumple when hit.

## Sound (concept; procedural or recorded later)
- Throws: a soft whoosh per roti (tissue whistles, murtabak whumps, naan flaps).
- Hits: a doughy slap; crits a crunchy bite (like biting a crisp prata edge); kills a paper tear.
- Statuses: Dough a squelchy stretch, Wet a splash and drip, Burn a sizzle on a tawa, Crisp a crackle.
- Reactions: TOASTED a crackling pop, SHATTER glass-candy crack, STEAM a kettle hiss, SIMMER low bubbling, GOLDEN PRATA a bright chime.
- World: kopitiam radio tunes, a distant hawker calling orders, clinking cups; music is cheerful thavil and nadaswaram flavoured chiptune, calmer at the stall.
- UI: paper rustle on open, a stamp thunk on confirm, coins clinking into a tin.

## Visual engagement for everyone
- Colour carries meaning: each status has one colour and one shape (dough cream blob, wet curry drip, burn ember, crisp golden flake), readable for colour-blind players by shape.
- Big, legible paper numbers; reactions stamp their name in chunky letters.
- Every unlock is a little paper ceremony (job advance confetti, mythic unfold animation).
- Kannan visibly changes with every job tier and with sets (set pieces share a colour family).

## Three things the player chases
1. **Who Kannan becomes** (job path): a visible transformation every few levels.
2. **What his roti does** (build): dips, gear, sets and mythics that combine into combos.
3. **How far down the street he gets** (runs): longer streets, harder bosses, new places.

## 1. Job advancement (MapleStory-style tiers, hawker-themed)
Kannan starts as **Tawa Boy**. At Lv 10 he picks one of four paths; at Lv 30 and Lv 60 he advances again. Each tier changes his outfit (Codex standees), adds one signature skill and one passive, and unlocks a branch of the skill board. A free "re-train" at the Job Board lets the player switch paths (keeps malleability; costs only time).

| Path | Fantasy | Plays like | Lv 10 | Lv 30 | Lv 60 (Raja tier) |
|---|---|---|---|---|---|
| **Crisp** | Precision flipper | Crits, pierce, flaky layers | Flipper | Crispmaster | **Golden Edge** |
| **Soak** | Curry flood | Wet splash, area, spreading | Gravy Hand | Monsoon Cook | **Banjir Raja** |
| **Heat** | Sambal fury | Burn, stacking damage over time | Chilli Boy | Wok Blazer | **Sambal Raja** |
| **Dough** | Stretch artist | Crowd control, pull, tank | Dough Slinger | Stretch Artist | **Murtabak Titan** |

Signature skills (one per tier, auto-cast on a cooldown so the joystick stays the only control; a second skill slot at Lv 30):
- Crisp: Flip Storm (fan of pratas) → Golden Slice (piercing line, every pierce adds a Flaky Layer) → **Thousand Layers** (each crit adds a layer; 10 layers fire a Golden Prata).
- Soak: Ladle Slam (splash ring) → Gravy Wave (rolling wave) → **Curry Monsoon** (8 s of curry rain that makes the whole screen Wet).
- Heat: Sambal Mine (drops behind you) → Wok Flame (cone) → **Chilli Barrage** (burn stacks never fall off while you keep hitting).
- Dough: Dough Lasso (pull a group together) → Flour Bomb (blind + slow) → **Murtabak Slam** (doughs everything nearby, then slams).

## 2. Combos: four statuses, six reactions
Every hit can leave one of four statuses on a pest. Two different statuses on the same pest trigger a named reaction. This is the "mad combos" layer and the reason to mix dips, paths and gear.

| | Dough (sticky) | Wet (curry) | Burn (sambal) | Crisp (flake mark) |
|---|---|---|---|---|
| **Dough** | stronger hold | **Soggy dough**: pest is rooted 2x longer | **TOASTED**: dough bakes and bursts into golden crumbs (area damage) | **SHATTER**: crust cracks, next hit x3 |
| **Wet** | | **SIMMER**: wet pools merge and bubble (damage grows each second) | **STEAM BURST**: puff that knocks back and blinds | **SOGGY SPLASH**: crit splashes to everything wet nearby |
| **Burn** | | | stacks up (Heat path) | **CHAR**: crit consumes burn stacks for burst |
| **Crisp** | | | | 10 layers = **GOLDEN PRATA** |

Combo feedback is the paper effect for that reaction (fx-toasted, fx-shatter, fx-steam-burst, fx-soggy-splash, fx-simmer, fx-golden-prata) plus a combo name stamp. Combos are discovered: the first time one fires it lands in the Recipe Book with its card (combo-*.png).

## 3. The build (one Kitchen screen)
- **Roti** (weapon): Kosong (straight), Tissue (pierce), Garlic Naan (lob + area), Murtabak (slow, heavy, knockback), Egg (bounces), Thosai (wide bar). The roti decides how statuses get applied.
- **Katori** (dip sockets, 1–3 by roti and level): each dip applies a status and a small effect: Mint = Dough, Fish Curry = Wet + small burn, Sambal = Burn + pop on kill, Dhal = Wet + heal on kill, Condensed Milk = Dough + slow, Teh Tarik = chain to the next pest, Ghee = Crisp marks, Masala = random status.
- **Gear** (5 slots: towel, headband, apron, gloves, slippers): rarity common → rare → epic → raja → mythic; each piece has 1–4 affixes (numbers), can be enhanced on the tawa (+1 to +10) and rerolled.
- **Skill board** (from job): small nodes, one notable per branch, one keystone per path.
- **Kopi meal** (one buff per run).

### Gear sets (stacks)
| Set | 2 pieces | 3 pieces | 5 pieces |
|---|---|---|---|
| **Night Shift** | +6% crit | crits while walking add a Flaky Layer | every 5th crit is a Golden Slice |
| **Monsoon Season** | +15% area size | Wet lasts 2 s longer | Wet pests spread Wet when they die |
| **Uncle's Old Kit** | kopi meal buff +50% | +1 gift choice from tiffins | first gift each run is a rare |
| **Golden Tawa** | +10% tips | 1% damage per 100 tips held (cap 30%) | coins explode on pickup |

### Mythic items (one equipped at a time; each bends the rules)
| Mythic | Slot | Rule it bends |
|---|---|---|
| **The First Tawa** | weapon charm | every 7th throw is a Golden Prata |
| **Towel of a Thousand Flips** | towel | a dodge leaves an afterimage that keeps throwing for 2 s |
| **Ah Ma's Ladle** | gloves | your Wet pools heal you while you stand in them |
| **Teh Tarik Chain Mug** | charm | every throw chains once, like pulled tea |
| **Seven-Chilli Sambal Jar** | apron | burn stacks cap at 7 but each stack is 3x |
| **Durian Crown** | headband | pests within 90 u flee for 1 s every 5 s |
| **Midnight Supper Slippers** | slippers | walking leaves a starry trail that applies Crisp |
| **Lucky Red Apron** | apron | gifts can roll mythic-tier choices (1%) |
| **Marble Kopitiam Slab** | charm | blocks the first hit every 8 s, shatter on block |
| **Golden Spatula** | charm | crits refund 0.2 s of skill cooldown |
| **Thousand-Layer Cape** | towel | Flaky Layers cap at 20 |
| **Monsoon Umbrella** | headband | Curry Monsoon follows you; you are never Wet |

## 4. Example builds (what a player can aim for)
- **Golden Edge crit** (Crisp path, Tissue, Ghee + Teh Tarik, Night Shift 5, The First Tawa): pierce lines stack layers; Golden Pratas every few seconds; Shatter with any dough source.
- **Banjir flood** (Soak path, Garlic Naan, Fish Curry + Dhal, Monsoon Season 5, Ah Ma's Ladle): the whole screen is Wet and Simmering; you stand in your own pools to heal.
- **Toaster** (Dough path, Murtabak, Mint + Sambal, Uncle's Old Kit 3, Durian Crown): lasso a crowd, dough them, burn them, watch TOASTED chain through the pack.
- **Steam engine** (Heat path, Egg roti, Sambal + Fish Curry, Golden Tawa 2, Seven-Chilli Jar): bouncing throws mix Wet and Burn on everything for constant Steam Bursts.

## 5. Runs and places
- Places in order: Kopitiam Street → Hawker Centre at night → Pasar Malam → Wet Market → Food Street; each has its own pests, boss and art kit (street kit already generated for all five).
- A run: 3–5 min, distance to a boss; tiffin gifts every ~300 m (3 cards, run-only); an elite "Grade Inspector" spirit drops a mythic shard.
- Mythics come from shards (5 shards = one mythic of your choice from the ones you have seen). Never sold for money (fair-monetisation rule).

## 6. Long tail (later, not v2.0)
Hawker village that grows with bonds to regulars; day shift (serve the queue) feeding night power; daily Chef's Special seeded run; stall-vs-stall async duels.

## What v2.0 builds first
Vertical slice per v2-spec: hub → Kitchen → run with all four statuses and the six reactions → gift → results → job advance at Lv 10 (one path end to end: Crisp to Flipper), then widen to all four paths.
