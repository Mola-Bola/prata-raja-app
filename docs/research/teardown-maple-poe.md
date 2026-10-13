# Teardown: MapleStory and Path of Exile build depth

Scope: what makes each game deep, Last Epoch as the approachable PoE, then a moderate-depth port for Prata Raja. Accessed 12 Oct 2026. Public sources only. "(summary)" marks a figure taken from a search snippet because the page was blocked or missing; verify before it becomes a number in code. Night Lord job levels for 3rd and 4th are inferred from the advancement-quest list.

Sources
- MapleStory Wiki: [Night Lord](https://maplestorywiki.net/w/Night_Lord), [V Matrix](https://maplestorywiki.net/w/V_Matrix), [HEXA Matrix](https://maplestorywiki.net/w/HEXA_Matrix), [Potential](https://maplestorywiki.net/w/Potential), [Star Force Enhancement](https://maplestorywiki.net/w/Star_Force_Enhancement)
- MapleStory summaries: [StrategyWiki job advancements](https://strategywiki.org/wiki/MapleStory/Job_Advancements), [SEA wiki](https://www.maplesea.com/wiki/GettingStarted/CharacterStats), [ayumilove v132 note](https://ayumilove.net/maplestory-update-notes-gms-v132/), [ayumilove set guide](https://ayumilove.net/maplestory-equipment-set/), [ayumilove M guide](https://ayumilove.net/maplestory-m-guide/), meowdb.com MapleStory Classic item DB
- Path of Exile: [poedb Chaos Inoculation](https://poedb.tw/us/Chaos_Inoculation), [Resolute Technique](https://poedb.tw/us/Resolute_Technique), [Headhunter](https://poedb.tw/us/Headhunter), [Mageblood](https://poedb.tw/us/Mageblood), [poe-vault skill gems](https://www.poe-vault.com/guides/path-of-exile-beginner-guide-skill-gems), [Mobalytics 6-link](https://mobalytics.gg/poe/guides/6-link-early-game-methods), [ExitLag classes](https://www.exitlag.com/blog/path-of-exile-best-class/), [Sportskeeda affixes (PoE 2)](https://www.sportskeeda.com/mmo/path-exile-2-item-rarity-affixes-poe2), [Maxroll clusters](https://maxroll.gg/poe/resources/cluster-jewels-explained)
- Last Epoch: [Maxroll passives and skills](https://maxroll.gg/last-epoch/resources/passives-and-skills), [Maxroll crafting guide](https://maxroll.gg/last-epoch/resources/beginner-crafting-guide) (quotes the official Forging Potential article)
- Prata Raja inputs: docs/SPEC.md, docs/CONTENT.md, docs/WORLD.md, docs/BACKLOG.md

## A. MapleStory

### A1. Job tiers
Levels 10, 30, 60, 100, 200 and 260 are the advancement-quest levels on the Night Lord page. Older guides put the 3rd and 4th at 70 and 120.

| Step | Lv | What changes |
|---|---|---|
| 1st | 10 | Class branch chosen |
| 2nd | 30 | Commit to one branch (Thief to Assassin). Points from one tier can't be spent on another (summary) |
| 3rd | 60 | Hermit |
| 4th | 100 | Night Lord. Hyper skills open from about Lv 140 |
| 5th | 200 | V Matrix: nodes bought with V Points from Nodestones |
| 6th | 260 | HEXA Matrix: skill nodes (to Lv 30) and stat nodes (3 of 6 stats, to Lv 20), fed by Sol Erda |

### A2. Layers on top of the tiers
| Layer | What it is | Lesson |
|---|---|---|
| Skill tree | Each job's skill list; skill points raise skill levels | Fixed per class, few real choices |
| Skill points | 3 per level to Lv 100; tier ceilings such as 65 by Lv 30 (summary) | Caps keep each tier's choices small |
| Hyper skills | Separate hyper points: passive (boost skills) and active (new attacks, buffs). Timing disputed (summary) | A second currency over the first |
| V Matrix | Node grid: Job, Common, Boost (final damage), Special (one buff active at a time) | Every node is a visible upgrade |

### A3. Set bonuses
| Set | Thresholds | Lesson |
|---|---|---|
| Arcane Umbra (v178) | 2-piece: +2,000 max HP and MP, +30 atk. 3-piece: +50 all stats, +35 atk. 5-piece: +30% boss damage. Runs to 7 | Commit to one set; the top threshold is a big multiplier |
| MapleStory M Eclectic (mobile spin-off) | 2-piece: 189 max HP. 3-piece: 1,093 phys def, 1,845 at Legendary. 4-piece: +26 phys atk | Same set, higher numbers by grade |

### A4. Potential grades
| Grade | Lines | Rank-up cost (summary) |
|---|---|---|
| Rare (blue) | Up to 3 regular lines, plus up to 3 Bonus (additional) lines from a separate pool | Base |
| Epic (purple) | Same | Rare to Epic: cheapest step |
| Unique (yellow) | Same | Epic to Unique: middling odds |
| Legendary (green) | Same | Unique to Legendary: most expensive |

Each cube use rerolls the lines and may raise the grade. Higher grade and item level raise the max %.

### A5. Star Force (risk idea only)
| Attempt | Success | Fail | Destroyed |
|---|---|---|---|
| 15 to 16 star | 30% | 67.9% | 2.1% |
| 21 to 22 star | 15% | 72.25% | 12.75% |
| 22 to 23 star | 15% | 68% | 17% |
| 29 to 30 star | 1% | 79.2% | 19.8% |

MapleStory Wiki table; the region column is not confirmed. Risk climbs with investment. Safeguard (15 to 17 star) turns destruction into failure for 200% of base cost per attempt.

### A6. Claw plus throwing stars
| Part | Role |
|---|---|
| Claw | Required base weapon; stars cannot launch without one |
| Throwing stars | Consumable ammo that Night Lord uses up; Hermit is on the same line. Tiers differ: Mokbi +19 atk, 700 cap, 0.5 meso per star; Steely +25, 1,000, 0.8; Ilbi +27, 800, 0.9 (summary) |
| Lesson | Weapon = base x consumable projectile. The projectile's tier and refill cost become the economy |

## B. Path of Exile

### B1. Gems, links and supports
| Rule | Detail |
|---|---|
| Supports need a link | Supports do nothing unless linked in the same socket chain as an active skill |
| Socket limits | 6 on two-handers, bows and chest; 4 on gloves, boots and helmets; 3 on one-handers and off-hands (summary) |
| Colour and type | Gem colour must match the socket (white is a wildcard). Duplicates don't stack. Some supports are type-gated: Greater Multiple Projectiles only works on projectile skills |
| Scale | A six-link reportedly deals up to about 2x a four-link (summary) |

"Iconic links" is not a documented PoE term in these sources; the nearest concept is the named six-link. Firestorm with three supports: Concentrated Effect (smaller area, more damage), Fire Penetration (gets past fire resistance), Spell Echo (rapid repeat casts).

### B2. Passive tree: nodes, clusters, keystones
| Node | Role |
|---|---|
| Basic | Small stat bumps; rarely defines a build |
| Notable | Mid-size effect that anchors a section |
| Keystone | Changes a rule at a cost |
| Cluster jewel (outer-ring socket) | Adds a branch: small (2-3 passives, up to 1 notable), medium (4-6, up to 2), large (8-12, up to 3). Some carry a keystone (summary) |

| Keystone | Exact text (poedb) | Rule change |
|---|---|---|
| Chaos Inoculation | "Maximum Life becomes 1, Immune to Chaos Damage" | Life scaling disappears; build on other pools |
| Resolute Technique | "Your hits can't be Evaded", "Never deal Critical Strikes" | Hits always land; crit investment is wasted |

### B3. Affixes and tiers
| Rarity | Mods | Note |
|---|---|---|
| Normal (white) | None | Base only |
| Magic (blue) | Up to 2: 1 prefix + 1 suffix | |
| Rare (yellow) | Up to 6: 3 prefix + 3 suffix | |
| Unique (orange) | Fixed | Often build-enabling |

T1 is the best tier. Higher tiers need a higher item level; the roll picks a band first, then a value (summary; mostly PoE 2 sources).

### B4. Uniques that enable builds
| Unique | Base | Mechanic (poedb) | Build role |
|---|---|---|---|
| Headhunter | Leather Belt | Killing a Rare monster grants its mods for 60 s (20 s before 3.18.0e) | Borrow the map's best mods |
| Mageblood | Heavy Belt | Leftmost 2-4 magic utility flasks are always active; no manual use; flask-use triggers don't apply | Permanent flask uptime reshapes the build |

### B5. Ascendancy
Seven base classes with three ascendancies each (Scion has one): 19 total (summary). Ascendancy points come from the Labyrinth trial, about 8 in total after the Eternal Labyrinth (summary).

### B6. Why builds multiply, and why casuals drown
| Multiplier | Effect | Casual friction |
|---|---|---|
| Gems x supports x socket colours | Each skill is its own combinatorial space | Link rules must be learned before anything is tested |
| Passive tree + cluster jewels + keystones | Keystones swap stats for rules | Walking away from the start burns points; respeccing costs currency |
| Uniques | One item rewrites the playstyle | Players must know which uniques matter |
| 19 ascendancies | A second specialisation on top | Choice overload before endgame |

## C. Last Epoch (the approachable PoE)
| Mechanic | How it works (Maxroll) | Why it is easier |
|---|---|---|
| Specialization slots | 5 slots shared across skills, at levels 4, 8, 20, 35, 50. Each specialized skill gets its own tree | Depth sits in one skill's window, not spread across links |
| Passive points | From level 3, up to 113 with the campaign. Spent in the Base Tree or one Mastery; a Mastery's second half is locked to your pick | Smaller, gated tree |
| Minimum skill level | A new specialization starts at the minimum (cap 10, rising at 10, 15, 20, 30 up to 80) | A new skill never starts from zero |
| Forging Potential | Per-item budget. Each craft spends it (a tier 3 to 4 upgrade costs 1-18). Zero locks crafting. Start value scales with area level, rarity and roll | Crafting becomes a finite budget decision |

## Port to Prata Raja (deeper but not PoE-complex)

Budget: per run, dip sockets and cards; per account, 9 Tawa points and 3 keystones; per loadout, one set bonus and up to 4 tiered affixes per item. Conflicts to settle first: chapters 3-5 have three names (CONTENT.md is used here; WORLD.md has Pasar Malam, Wet Market, Food Street; BACKLOG has real places). SPEC.md limits merges to Rare while CONTENT.md merges up to Raja. "Tawa Heat" is both a training ladder and the owner's heat-meter idea.

### 1. Dip links (replaces "every dip on every bread") - S3
| Bread level | Sockets | Note |
|---|---|---|
| L1 | 1 | |
| L3 | 2 | |
| L5 | 3 | Evolution adds a 4th; the partner dip stays linked |

- The new-dip card names its target, e.g. "Socket into Idli (1 free)". With no free socket, the dip joins a shared bowl that hits every bread at 25%, so today's rule becomes the weak baseline.
- The same dip twice in one bread doesn't stack; the higher level applies. Full Plate: 3 different dips in one bread gives +20% bread damage.
- Bowls sit beside the bread they feed, so the counter still shows the build.

### 2. Kannan's job path - tiers 1-2 ship in S4, tiers 3-4 in S5+
| Tier | Gate | Unlocks |
|---|---|---|
| 1 Prata Apprentice | Start | Starter pool (Kosong, Tissue, Thosai, Chapati, Appam, Idli); 1 socket per bread |
| 2 Tawa Master | Stall L3 + chapter 1 boss (King Cockroach) | Wrist branch (damage) or Flip branch (throw speed). Keystone slot 1 |
| 3 Prata Raja | Stall L6 + chapter 3 boss (Monsoon Cloud) | Keystone slot 2. Active "Tawa Blaze" (the owner's heat burst). Crown on Kannan |
| 4 Maharaja | Stall L10 + chapter 5 boss (Rent Hike Spirit) | Keystone slot 3. Gold "Raja's Stall" hub art |

Tawa points: 1 per stall level (9 by L10). Each of tiers 2-4 has a 3-node branch at 1 point per node. Respec at the stall is free, like training. The tier shows on Kannan (towel to cape, crown colour by tier), per the WORLD.md rule.

### 3. Four keystones (one per slot; permanent, re-pick costs coins)
| Keystone (tier, slice) | Rule change | Trade-off | Pairs with |
|---|---|---|---|
| Kongsi Plate (T2, S4) | Dips ignore sockets: every owned dip hits every bread, as today | Each dip -35%; no Full Plate | Sugar Crash control |
| Pushcart (T2, S4) | Throw while moving at full rate; the first throw after a stop does +100% | All breads -25%; supersedes Multitasker | Inferno kiting |
| Tahan Lapar (T3, S5+) | Max HP becomes 1; immune to damage over time; every 10 HP from gear and training adds +1% bread damage (Chaos Inoculation analog) | One hit kills; Kopi Break heals almost nothing | Inferno Bomb glass cannon |
| Kampung Style (T3, S5+) | Shields can't block your hits. You never crit, but each 1% of crit chance adds +1% damage (Resolute Technique analog) | Crit sources convert instead of working directly | Headband damage |

### 4. Three gear sets (2 / 3 / 5 pieces)
| Set | Pieces | Bonuses | Slice |
|---|---|---|---|
| Morning Shift | Towel + Apron + Slippers | 2: +0.3 HP/s regen. 3: Apron blocks the first 2 hits each wave | S3 |
| Mamak Crew | Headband + Gloves + Apron | 2: +5% throw speed. 3: every 8th throw fires twice | S4 |
| Raja's Full Kit | All five, Epic or above | 2: +10% crit dmg. 3: +15% DoT dmg. 5: +30% boss dmg; crown glows | S5+ |

### 5. Affix tiers with hawker names
| Tier | Name | Roll vs base | Gate | Slice |
|---|---|---|---|---|
| T5 | Biasa | x1.0 | Rare, chapter 1+ | S3 |
| T4 | Sedap | x1.5 | Rare, chapter 1+ | S3 |
| T3 | Power Sedap | x2.0 | Epic, chapter 2+ | S3 |
| T2 | Shiok | x2.5 | Epic, chapter 3+ | S4 |
| T1 | Sifu | x3.0 | Legendary and Raja, chapter 4+ | S5+ |

Headband's "+0.2 dmg per wave survived" becomes 0.2 / 0.3 / 0.4 / 0.5 / 0.6. Seasoning (Last Epoch's forging budget, proposed numbers): Rare 3, Epic 5, Legendary 8, Raja 12. A reroll costs 6 minus the tier number; zero locks rerolls. Star Force idea: rerolling a Shiok or Sifu line risks a 10% burn, blocked by a coin Safeguard fee.

### 6. Three build archetypes
| Archetype (slice) | Build | Plays like | Weak spot |
|---|---|---|---|
| Sugar Crash control (S3; Kongsi adds spread in S4) | Condensed Milk in Idli (one volley adds 4 stacks). Mint Chutney in Kosong for freeze. Morning Shift for regen | Stun every 5 stacks; keep the rhythm | Bosses turn stun into slow (0.2.0 rule): add Fish Curry burn to a second bread |
| Inferno Bomb AoE (S4; glass-cannon variant S5+) | Roti Bomb at L5 + Sambal = Inferno Bomb (evolution in S3). Roti Bomb sockets: Sambal (partner), Fish Curry, Masala for Full Plate. Pushcart at tier 2, Tahan Lapar at tier 3 | Kite, bomb the queue, chain explosions | At 1 HP under Tahan Lapar, one shooter hit ends the run |
| Tarik Lance crit (S5+) | Tissue at L5 + Teh Tarik = Tarik Lance (pierces a line, +30% throw speed). Crit: Lucky Towel, Chicken Curry, Ghee, Full Kit 2-piece. Flip branch at tier 2 | Line shots through Tiffin shields; crits on the counter | Needs Shiok or Sifu crit affixes; Kampung Style is anti-synergy |
