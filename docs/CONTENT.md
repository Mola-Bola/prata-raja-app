# Prata Raja: Content Compendium (v1, 2026-10-12)

Drafted by a Haiku agent, edited by the lead for the stall-defense view (owner pick A). Numbers are first-pass; the balance sim tunes them. Distances are field units (SPEC §3.2: field 540 wide × 1000 deep, counter at y=0).

Kannan, a cheerful Tamil-Singaporean prata cook at a kopitiam stall, zones out over his tawa and daydreams he is PRATA RAJA. Runs are daydreams. He defends the stall from pests, junk-food invaders and weather spirits by throwing spinning breads. Dying wakes him up ("Oi Kannan!"). Between runs he upgrades gear, crafts recipes and trains at the real stall.

## Baselines (locked)

| Item | Value |
|---|---|
| Plain Prata (Kosong) | 10 dmg, 0.8 s cooldown, 900 px/s, single target |
| Walker, wave 1 | 20 HP, 60 px/s, 5 contact dps |
| Enemy HP | base × (1 + 0.12 × (wave − 1)); walker at wave 10 = 42 HP |
| Kannan | 100 HP base; crit 5% chance, ×1.5 dmg |
| Levels | Breads 1–5; dips 1–5 |

Conventions: dmg is per hit at L1. cd is seconds between casts. IDs are kebab-case. Quoted status names are placeholders.

## Draft decisions (check these)

- One boss per chapter: 5 chapters, 5 bosses. King Cockroach closes chapter 1 (wave 10 in S1); The Burger Baron closes chapter 2.
- "Rent Hike Landlord" is a spirit, not a person. Enemies are never people.
- S1 pool (no meta yet): breads Kosong, Tissue, Roti Bomb, Thosai, Chapati; dips Fish Curry, Condensed Milk, Mint Chutney, Masala; 8 passives. From S2 the starter pool is Kosong, Tissue, Thosai, Chapati, Appam, Idli + Fish Curry, Mint Chutney, Masala, Chicken Curry, Teh Tarik, Dhal, and recipes unlock the rest (Roti Bomb and Condensed Milk are the first, cheapest recipes).
- Evolutions cover 8 of the 12 breads in v1.

## 1. Breads (weapons)

| id | name | mechanic | dmg | cd s | special | L2–L5 upgrade | unlock | flavor |
|---|---|---|---|---|---|---|---|---|
| kosong | Kosong | Plain round, ricochets from L3 | 10 | 0.8 | 900 px/s, single target | L2 +2 dmg · L3 1 ricochet · L4 2 ricochets · L5 +3 dmg | starter | Plain, honest, and it never leaves the tawa. |
| tissue | Tissue | Thin pointed shot, pierces | 8 | 0.9 | pierce 3; 1000 px/s | L2 pierce 4 · L3 +2 dmg · L4 pierce 5 · L5 ignores 25% armour | starter | Paper-thin and sharp enough to poke a cockroach. |
| roti-bomb | Roti Bomb | Lobbed, explodes AoE on landing | 12 | 1.6 | lob 0.9 s; blast r 80 px | L2 +3 dmg · L3 blast r 100 · L4 scorch 2 s · L5 2 bombs | rc-roti-bomb | Lands soft, explodes loud, clears the whole row. |
| egg-telur | Egg (Telur) | Splits into fragments on hit | 9 | 1.1 | 3 fragments × 4 dmg; 700 px/s | L2 4 fragments · L3 fragments home weakly · L4 +2 dmg · L5 fragments split once | rc-egg-telur | One egg in, three fragments out. Breakfast economics. |
| thosai | Thosai | Wide golden wave that rolls up the street, hitting everything it passes | 11 | 1.2 | width 200; 700 u/s; range 900 | L2 +20% width · L3 +3 dmg · L4 rolls back once · L5 cd 0.9 s | starter | Wide and golden, sweeps the whole counter clean. |
| chapati | Chapati | Boomerang out 600 px and back | 7 × 2 | 1.2 | hits on the way out and back | L2 +2 dmg per hit · L3 hits again on return · L4 range +25% · L5 cd 1.0 s | starter | It always comes back, like a regular customer. |
| naan | Naan | Slow lob, big landing AoE | 18 | 1.8 | lob 1.2 s; blast r 110 px | L2 +4 dmg · L3 blast r 130 · L4 0.3 s stun · L5 cd 1.5 s | rc-naan | Slow to fly, heavy to land, impossible to ignore. |
| garlic-naan | Garlic Naan | Drops a lingering garlic zone | 6 per tick | 2.4 | zone r 90 px, 3 s; tick 0.5 s | L2 zone 4 s · L3 +2 per tick · L4 slows 20% · L5 zone r 120 px | rc-garlic-naan | The smell lingers, and so do the enemies. |
| murtabak | Murtabak | Heavy slam: knockback and stun | 16 | 1.6 | knockback 120 px; stun 0.4 s | L2 +4 dmg · L3 stun 0.6 s · L4 knockback 160 px · L5 cd 1.3 s | rc-murtabak | Stuffed heavy, lands heavier. Nobody stands after. |
| appam | Appam | Bounces to nearby enemies, 3 hops | 8 (−15% per hop) | 1.0 | hop range 300 px | L2 4 hops · L3 +2 dmg · L4 no hop loss · L5 hops can crit | starter | Bowl-shaped and bouncy, passes the hot potato along. |
| idli | Idli | Rapid volley of 4 mini-idli | 3 × 4 | 1.0 | 0.1 s apart; 700 px/s | L2 5 mini-idli · L3 +1 dmg each · L4 20° spread · L5 cd 0.8 s | starter | Little steamed rounds, many of them, all at once. |
| vadai | Vadai | Ring of 4 vadai circles the counter front | 3 per hit | orbit | ring r 140 px; each enemy hit every 0.5 s | L2 5 vadai · L3 ring r 170 · L4 +1 dmg per hit · L5 knockback 40 px | rc-vadai | Round and humming, guards Kannan like a bodyguard. |

## 2. Dips & curries

On-hit effects. Once picked, each sits as a steel bowl on the counter.

| id | name | effect | L1 | per-level gain (L2–L5) | damage colour | flavor |
|---|---|---|---|---|---|---|
| fish-curry | Fish Curry | Burn DoT on hit | 3 dmg/s for 3 s | +1 dmg/s | #E8702A | Hot enough to make even the flies sweat. |
| condensed-milk | Condensed Milk | Slow 30% for 2 s. Each hit adds 1 "Diabetes" stack (8 s). 5 stacks = Sugar Crash, 1 s stun | 30% slow; 1 dmg/s per stack | +5% slow; +0.5 dmg/s per stack | #F7E7A1 | Sweet, sticky, and a little bit too much. |
| mint-chutney | Mint Chutney | Each hit adds 1 chill (−10% speed, 6 s). 3 chills = Freeze 1 s | Freeze 1 s | +0.25 s freeze | #7FE0C0 | Cool as a fan at five a.m., sharp as a whistle. |
| masala | Masala | On hit, a spark jumps to 1 enemy within 150 px | 5 dmg; 1 jump | +2 dmg; +1 jump at L3 and L5 | #FFD23F | One spark hops to a friend, then another. |
| mutton-curry | Mutton Curry | 40 px knockback. "Tenderised": −10% armour, +5% dmg taken for 4 s | 40 px knockback; +5% dmg taken | +5% dmg taken; +1 s tenderised | #B5533C | Falls apart on contact, like slow-cooked mutton. |
| chicken-curry | Chicken Curry | Each hit +2% dmg (max 5 stacks, 4 s). 5 stacks = +3% crit | +2% dmg per stack | +0.5% dmg per stack; +0.5% crit at max | #F28C28 | Stack the fragrance, stack the damage, stack the luck. |
| sambal | Sambal | Burning enemies explode on death (60 px), spreading 1 burn | 8 dmg blast | +4 dmg | #E3262F | Bang, bang, bang, and the whole queue catches fire. |
| teh-tarik | Teh Tarik | Every 5th hit: +20% throw speed for 3 s | +20% throw speed | +5% throw speed | #C68E4E | Pull it high, pour it fast, keep the rhythm. |
| ghee | Ghee | Spin: after a hit, +10% projectile speed and +20% crit dmg for 4 s | +10% proj speed; +20% crit dmg | +5% proj speed; +5% crit dmg | #F4C430 | Golden spin, the smell of a busy breakfast. |
| dhal | Dhal | Heal 1 HP per kill | 1 HP per kill | +1 HP per kill | #7BD389 | Every kill fills the bowl a little more. |

## 3. Passive cards

Picked on level-up, same as breads and dips.

| id | name | effect per level | max level |
|---|---|---|---|
| strong-wrists | Strong Wrists | +6% damage | 5 |
| fast-flip | Fast Flip | +5% throw speed | 5 |
| extra-dough | Extra Dough | +1 projectile, 12° fan | 3 |
| big-dough | Big Dough | +10% projectile size and AoE radius | 5 |
| hot-tawa | Hot Tawa | +10% DoT damage | 5 |
| lucky-towel | Lucky Towel | +2% crit chance | 5 |
| thick-skin | Thick Skin | +10 max HP | 5 |
| kopi-break | Kopi Break | +0.3 HP/s regen; heal 5% max HP on level-up | 5 |
| sharp-eye | Sharp Eye | +8% range | 5 |
| bigger-tips | Bigger Tips | +15% XP (XP flies to the counter by itself) | 5 |
| multitasker | Multitasker | Throw while moving at 50% rate, +15% per level | 3 |
| second-helping | Second Helping | +1 revive per run; revive at 50% HP | 2 |

## 4. Evolutions

Both items must be L5 in the same run. The evolved bread replaces the base bread in its slot.

| id | L5 bread | L5 partner | evolved name | effect |
|---|---|---|---|---|
| golden-ghee-chakra | Kosong | Ghee | Golden Ghee Chakra | 6 bounces while spinning; +30% projectile speed; every bounce can crit |
| tarik-lance | Tissue | Teh Tarik | Tarik Lance | Pierces every enemy in a line; +30% throw speed |
| inferno-bomb | Roti Bomb | Sambal | Inferno Bomb | Blasts leave 3 s of fire; burning enemies chain-explode |
| half-boiled-halo | Egg (Telur) | Dhal | Half-Boiled Halo | Fragments home onto enemies; each hit heals 1 HP |
| thosai-typhoon | Thosai | Fast Flip | Thosai Typhoon | Full-width sweep every 2 s; pulls enemies inward |
| tandoor-meteor | Naan | Mutton Curry | Tandoor Meteor | Landings knock back ×2 and leave a 4 s tenderised zone |
| garlic-thunder-zone | Garlic Naan | Masala | Garlic Thunder Zone | Zone sparks chain lightning to 3 enemies every 1 s |
| crusher-murtabak | Murtabak | Chicken Curry | Crusher Murtabak | 1 s stun; every 5th slam always crits |

## 5. Enemies (Chapter 1 skins: Kopitiam Street)

Other chapters reskin the same archetypes. HP is wave-1 base, before the wave formula.

| id | skin | archetype | HP | speed (px/s) | contact dps | xp | behaviour | weak to |
|---|---|---|---|---|---|---|---|---|
| walker | Sugar Ant | Walker | 20 | 60 | 5 | 1 | Marches straight at Kannan along the sugar trail | AoE, burn |
| runner | Scuttle Roach | Runner | 12 | 130 | 4 | 2 | Dashes in short bursts, pauses, dashes again | Chill, pierce |
| flyer | Fruit Fly | Flyer | 14 | 90 | 3 | 2 | Flies over ground hazards; zigzags across the street | Chain (Masala) |
| swarm | Lalat Swarm | Swarm | 6 each, 8 per cloud | 80 | 2 each | 0.5 each | Spawns as a cloud; each hit bursts it apart | AoE (Roti Bomb, Naan) |
| tank | Burger Bun Brute | Tank | 120 | 35 | 9 | 8 | Plods to the counter and slams it (heavy contact damage); knockback-resistant | Knockback (Murtabak) |
| shooter | Chilli Padi Imp | Shooter | 18 | 50 | 2 | 4 | Stops mid-street (y 450-600); lobs chilli padi (6 dmg) at where Kannan stands and throws satay sticks (straight line); slide to dodge | Pierce (Tissue), Chapati |
| splitter | Bubble Tea Blob | Splitter | 40 | 50 | 4 | 3 | On death splits into 3 tapioca pearls (6 HP, 90 px/s) | Sweep (Thosai) |
| shielded | Tiffin Beetle | Shielded | 30 + 25 shield | 40 | 6 | 5 | Front tiffin shield blocks direct hits; pierce and lob bypass it | Pierce, lob |
| healer | Ice Kacang Sprite | Healer | 16 | 55 | 1 | 4 | Heals allies 4 HP/s within 120 px; keeps its distance | Idli volley, fast hits |
| summoner | Kettle Spirit | Summoner | 60 | 25 | 2 | 6 | Every 6 s spawns a Sugar Ant (max 4 alive) | Burn, focus fire |
| exploder | Durian Bomb | Exploder | 22 | 70 | 30 blast | 3 | Fuses 1.5 s on contact, then blasts a 90 px radius | Ranged kills before contact |
| elite | Golden tint (prefix) | Elite rule, any archetype | ×3 | +10% | ×1.5 | ×3 | From wave 4. 1 guaranteed Uncommon+ equipment roll on death | Same as base |

## 6. Bosses

One per chapter. HP is base at wave 1, then the wave formula applies. Telegraph = warning time before the attack lands.

| id | name | chapter | HP (base) | phases | attacks (telegraphed) | weak to |
|---|---|---|---|---|---|---|
| king-cockroach | King Cockroach | 1 (mini-boss) | 450 | 2 (wings out at 50%) | Tawa Slam: ring AoE (1 s tell) · Scuttle Charge: dash line (0.8 s tell) · Brood Call: 3 Scuttle Roaches (2 s tell) | Burn, pierce |
| burger-baron | The Burger Baron | 2 | 1400 | 3 (66%, 33%) | Patty Toss: 3 lobbed patties (1.2 s tell) · Sauce Fountain: 3 lines (1 s tell) · Combo Rush: lane dash (0.8 s tell) | Chill, knockback |
| monsoon-cloud | Monsoon Cloud | 3 | 2200 | 2 (storm at 50%: strikes twice as often) | Rain Curtain: all −30% speed for 6 s (3 s tell) · Lightning Strike: marked lanes (1 s tell) · Flood Surge: water sweeps one half, slide to the dry side (1.5 s tell) | Chain (Masala) |
| durian-emperor | Durian Emperor | 4 | 3000 | 3 (75%, 50%, 25%) | Spike Rain: 6 durians drop (1 s tell each) · Stink Cloud: DoT zone, −20% crit for 5 s (2 s tell) · Thorn Roll: charges the top row (1.2 s tell) | Burn (Sambal), chill |
| rent-hike-spirit | Rent Hike Spirit | 5 | 2500 + 5% per minute alive | 2 (50%: Eviction Notice) | Rent Bill: paper lines sweep (1 s tell) · Deposit Claw: homing claw (0.9 s tell) · Eviction Notice: summons 4 Scuttle Roaches (2 s tell) | Multi-hit (Idli, Appam), fast kills |

## 7. Chapters

| id | name | setting | enemy mix | boss | gimmick |
|---|---|---|---|---|---|
| kopitiam-street | 1. Kopitiam Street | Pre-dawn stall, tawa, marble tables | walker, runner, flyer, splitter, shielded | King Cockroach (mini) | Breakfast rush: every 60 s, spawns ×2 for 15 s |
| hawker-night | 2. Hawker Centre Night | Stalls after dark, plastic chairs, neon | swarm, flyer, shooter, healer | The Burger Baron | Plastic-chair barricades soak shots until broken |
| monsoon-alley | 3. Monsoon Alley | Five-foot-way in a storm, puddles everywhere | tank, summoner, shielded, healer | Monsoon Cloud | Monsoon slows everyone 15% (Kannan too); puddles slow 30% more |
| durian-row | 4. Durian Row | Night fruit-stall row, the smell hangs in the air | exploder, shooter, splitter, tank | Durian Emperor | Falling durians: telegraphed AoE drop every 8 s |
| shophouse-roof | 5. Shophouse Roof | Rooftop on rent day, water tanks, clotheslines | all archetypes; elites at 2× rate | Rent Hike Spirit | Rent clock: boss gains +5% HP per minute alive |

## 8. Equipment

Five slots. Rarity sets the main-stat multiplier (section 9). Affixes appear at Rare and above.

| slot (focus) | base items (3) | main stat (Common L1) | Rare+ affixes (examples) |
|---|---|---|---|
| Towel (crit/luck) | Faded Kopitiam Towel · Sweat-Stained Towel · Lucky Red Towel | +2% crit chance | +1% crit dmg per 10 kills · +10% gold drops · Crit kills heal 1 HP |
| Headband (damage) | Plain Headband · Stall Bandana · Cook's Hairnet | +3% damage | +5% dmg vs elites · +0.2 dmg per wave survived · +8% dmg above 80% HP |
| Apron (HP/defence) | Cotton Apron · Oil-Splashed Apron · Denim Apron | +5 max HP | −3% damage taken · +0.2 HP/s regen · Blocks the first hit each wave |
| Gloves (throw speed/spin) | Oven Gloves · Silicone Gloves · Chef's Gloves | +3% throw speed | +10% projectile speed on spin · +5% throw speed per dip · Every 10th throw fires twice |
| Slippers (move speed/dodge) | Rubber Flip-Flops · Kitchen Clogs · Old House Slippers | +3% move speed | 5% dodge chance · +10% move speed for 2 s after pickup · Dodge refunds 0.2 s of cooldown |

## 9. Rarity tiers

| tier | colour | stat × | affixes | drop weight (of 1000) | merge (3 same item + tier) |
|---|---|---|---|---|---|
| Common | #9CA3AF | ×1.0 | 0 | 600 | → Uncommon |
| Uncommon | #4ADE80 | ×1.3 | 0 | 250 | → Rare |
| Rare | #60A5FA | ×1.7 | 1 | 100 | → Epic |
| Epic | #C084FC | ×2.2 | 2 | 40 | → Legendary |
| Legendary | #FB923C | ×3.0 | 3 | 9 | → Raja |
| Raja (mythic) | #FACC15 | ×4.5 | 4 | 1 | No merge (top tier) |

## 10. Recipes (crafting)

Cook at the stall between runs. Materials: flour, ghee, egg, onion, spice, sugar, milk. Materials drop at run end: 2 random types per 5 waves survived.

| id | recipe | unlocks (run pool) | materials |
|---|---|---|---|
| rc-roti-bomb | Roti Bomb Dough | Roti Bomb (bread) | flour 4, egg 2, onion 2 |
| rc-egg-telur | Telur Batter | Egg/Telur (bread) | flour 3, egg 3, milk 1 |
| rc-naan | Tandoor Naan Dough | Naan (bread) | flour 5, ghee 2, milk 1 |
| rc-garlic-naan | Garlic Butter Naan | Garlic Naan (bread) | flour 4, ghee 2, onion 1 |
| rc-murtabak | Murtabak Filling | Murtabak (bread) | flour 4, egg 2, onion 2, spice 1 |
| rc-vadai | Vadai Ring Mix | Vadai (bread) | flour 2, onion 2, spice 2 |
| rc-sambal | Sambal Paste | Sambal (dip) | onion 2, spice 3, sugar 1 |
| rc-ghee | Ghee Clarifying | Ghee (dip) | milk 4, sugar 1 |
| rc-mutton-curry | Mutton Curry Base | Mutton Curry (dip) | spice 3, onion 2, ghee 1 |
| rc-condensed-milk | Condensed Milk Tin | Condensed Milk (dip) | milk 3, sugar 2 |

## 11. Training (permanent, bought with gold at the stall)

Buying level L costs base × 1.5^(L−1) gold, rounded up to the next 5.

| id | ladder | per level | max | cost (gold) |
|---|---|---|---|---|
| wrist | Wrist Training | +2% damage | 10 | 50 × 1.5^(L−1) |
| flip | Flip Speed | +2% throw speed | 10 | 60 × 1.5^(L−1) |
| tawa-heat | Tawa Heat | +3% DoT damage | 10 | 80 × 1.5^(L−1) |
| steady-hand | Steady Hand | +0.5% crit chance | 10 | 90 × 1.5^(L−1) |
| iron-stomach | Iron Stomach | +3 max HP | 10 | 60 × 1.5^(L−1) |
| dough-reach | Dough Reach | +2% range | 5 | 70 × 1.5^(L−1) |
| quick-feet | Quick Feet | +2% move speed | 5 | 100 × 1.5^(L−1) |
| regular-customer | Regular Customer | −3% upgrade cost at the shop | 5 | 120 × 1.5^(L−1) |

## 12. Daily engagement

### 12a. 7-day login calendar

Miss a day and the loop restarts at Day 1.

| day | reward |
|---|---|
| 1 | 100 gold |
| 2 | 2 flour, 1 egg |
| 3 | 1 Uncommon equipment roll |
| 4 | 1 ghee, 1 milk |
| 5 | 1 Rare equipment roll |
| 6 | 300 gold, 1 spice, 1 sugar |
| 7 | 1 Epic equipment roll, 500 gold |

### 12b. Chef's Special modifiers

| id | name | modifier |
|---|---|---|
| spicy-morning | Spicy Morning | Enemies +30% speed; your damage +20% |
| dry-tawa | Dry Tawa | No dips in the pool; crit chance +10% |
| one-bread | One Bread | Only Kosong; bread cards become passives |
| rainy-shift | Rainy Shift | Monsoon slow on every wave |
| pest-control | Pest Control | Sugar Ants spawn ×2; +1 XP per kill |
| lunch-rush | Lunch Rush | Throw cooldowns −25%; spawns +50% |

### 12c. Daily quest templates

| id | quest | target | reward |
|---|---|---|---|
| squash-ants | Squash sugar ants | 150 walkers | 80 gold |
| shoot-flies | Swat the flies | 40 flyers | 80 gold |
| reach-wave | Hold the stall | Reach wave 8 in one run | 120 gold |
| crit-streak | Crit happy | 60 crits across runs | 100 gold |
| burn-it | Light them up | 300 burn ticks | 100 gold |
| break-tiffin | Open the tiffin | 25 shields broken | 100 gold |
| boss-hunt | Boss hunter | Defeat 1 boss | 150 gold, 1 flour |
| craft-one | Cook something new | Craft 1 recipe | 60 gold, 1 egg |
| train-once | Train at the stall | Buy 1 training level | 60 gold |
| second-chance | Second helping | Use 1 revive | 90 gold |

## 13. Wake-up lines and loading tips

### Wake-up lines (20)

1. Oi Kannan! Two kosong, one tissue!
2. Oi Kannan, wake up lah, the tawa already smoking!
3. Wah, dream until forget to flip ah? Wake up!
4. Kannan, your teh-O getting cold, customer waiting sia.
5. Aiyo Kannan, roaches again ah? Come back, the sambal boiling!
6. Oi Kannan, you sweat more than the tawa lah. Wake up!
7. Kannan! Daydream cannot pay the rent, come back to work!
8. Oi Raja, the counter needs you more than the throne!
9. Kannan, put down the spatula sword, customer wants egg!
10. Walao Kannan, you flip the air, not the prata!
11. Oi Kannan, ice kacang melting, prata burning, wake up!
12. Kannan, auntie say her roti still raw, come quick!
13. Oi Kannan! Two plain, one egg, one dhal, go go go!
14. Wake up sia, the ants already taking the sugar!
15. Kannan, a roach sitting in the sugar jar, deal with it!
16. Oi Kannan! Your daydream very long, customers very hungry lah!
17. Kannan, morning rush starting, stop daydreaming!
18. Oi Kannan, how many times I call you already?
19. Kannan, the tawa cannot flip itself, your prata must!
20. Oi Kannan! Breakfast waiting, the Raja can come later.

### Loading tips (10)

1. Kosong ricochets to the next enemy from L3.
2. Tissue pierce and lobs (Roti Bomb, Naan) bypass Tiffin Beetle shields.
3. Sambal turns every burning enemy into a bomb on death.
4. Five Diabetes stacks trigger a 1 s Sugar Crash. Plan around the stun.
5. Monsoon slows you too. Train Quick Feet before Monsoon Alley.
6. Raja gear cannot be merged. Equip it, do not hoard it.
7. Three identical items of one rarity merge into the next tier.
8. Vadai circle the counter front and hit anything that reaches it.
9. Shooters aim at where you stand, so keep moving between throws.
10. Dhal heals per kill and Kopi Break adds regen. Stack both for long runs.
