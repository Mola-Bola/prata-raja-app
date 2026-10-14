# Prata Raja: build a stall, then cook a run

Design proposal, 13 Oct 2026. Owner direction in [BACKLOG](BACKLOG.md) governs this document. These are future rules, not a claim that live 0.4.1 implements them. Food details and names remain editable when the owner supplies specifics.
The identity: Kannan defends a fixed counter. He cooks a persistent signature dish, then discovers ways to serve it during a 6–12 minute daydream. Food behaviour, stall position, linked bowls and drink rhythm make the build visible.
Sources: [build engines](research/teardown-builds-poe-bl2.md), [fair monetisation](research/fair-monetisation.md), [WORLD](WORLD.md), [CONTENT](CONTENT.md), [feel](research/game-feel.md) and [owner clips](research/owner-refs-2026-10-13.md). All values here are proposed tuning starts.

## 1. Three layers, one build

**Persistent direction:** signature bread, equipped gear/uniques, job/tree, drink recipe and preferred dip links. These survive runs. A “Hot”, “Sweet” or “Spinning” suggested loadout sets them in one tap; players can edit each part later.
**Run expression:** signature bread starts at L1. Cards add breads, linked dips and passives, or level them toward L5/evolution. No permanent bread levels; the surprise and power climb still happen inside the run. Maximum four breads and four owned dip instances.
**Long-term discovery:** recipes, food mastery stamps, boss trophies and selectable Second Shifts. These open alternatives and new tests. Gear/training power stays bounded; progress eventually means a different engine or challenge, not an endless percentage ladder.
The persistent starter dip starts at L1 from stall L5. Before that, the preferred link biases the first offer but grants nothing. Tree and gear work immediately. A unique needing a second bread declares an L1 companion that occupies a real bread slot; its starter damage budget accounts for that companion. Its recipe includes access to both foods, so the engine can start without a lucky draw.

## 2. Unlocks: add one decision at a time

Keep the live XP thresholds and earned slot unlocks in `src/meta/stall.ts`. Existing players keep all training, gear, recipes and rerolls. New features appear as a guided stall task on a later visit, not a stack of pop-ups.

| Stall level | Existing unlock retained | New depth decision, when its release arrives |
|---|---|---|
| 1 | First run; Kosong and starter pool | First run stays curated. Thereafter choose one unlocked signature bread. Suggested pairs only; no tree or drink management. |
| 2 | Gear and towel | One main stat and a visible towel. Name one next recipe; do not introduce affix crafting yet. |
| 3 | Training and headband | Apprentice → Stall Cook; choose one of Heat, Hands or Hospitality. Free training respec stays. Branch choice is a suggested route, not an exclusive class. |
| 4 | Second free reroll | Show bread-specific dip pairing on paused cards. One link per bread; automatic sensible target with an optional Change action. |
| 5 | Apron | Stall Cook → Tawa Specialist; first tree points/keystone. One linked starter dip and one basic drink; default auto-sip. Teach them on separate visits. |
| 6 | Gloves and recipe book | First four unique recipes and simple affix choice. Two dip links on the signature bread; other breads still one. L5+L5 evolutions stay visible in the recipe book. |
| 7 | Slippers | Free named loadouts and free respec; optional manual drink button. Show the next job trial and target unique. |
| 8 | Chef's Special | Second drink slot, one passive notable and standardised daily loadouts. Introduce these on separate visits; the special never requires learning flasks. |
| 9 | Stall prestige art / next-unlock slot | Second keystone permission after its practice trial; target farming and selected-affix crafting. Learn one new delivery mode through a unique. |
| 10 | Golden stall, final art tier | Prata Raja job trial; two links on any bread, still four dip instances total. Recipe mastery and optional Second Shifts replace the finished XP ladder. |

Job trials ask for a real boss attempt and a simple demonstration, such as applying a linked burn. Repeat for free; a boss win is not required for the basic job kit. A first boss clear awards a trophy and opens its harder replay.
Chapter 2 keeps S3's three boss-attempt gate. Further story chapters can use comparable attempt gates; hardest challenge rungs require clears, without blocking basic recipes or jobs. No job promotion depends on spending, a streak or a random unique.

## 3. Damage and ailments in hawker words

Damage families are **Impact, Heat, Spice and Sugar**. Cooling and Tender are control/debuff tags, not extra damage/resistance types. Dhal recovery and Tarik rhythm are utility. Do not add a full resistance matrix at onboarding.

| Family / state | What the player sees | Rule and scaling |
|---|---|---|
| Impact | A bread thump / crack | Direct hit; scales hit damage and eligible crit. Knockback has its own resistance, not another damage number. |
| Heat / Scorch | Orange tawa embers | One strongest burn deals damage; weaker burns do not overwrite it. Scale heat DoT and duration. A tawa aura is continuous damage, not an ignite or a hit. |
| Spice / Sneeze | A little pepper cloud | Independently expiring DoT stacks, proposed cap eight per target. Hit rate builds stacks; spice DoT/duration scales them. Cloud spread needs a linked support or unique. |
| Sugar / Sticky | Milk streak with up to five pips | Hits stack sugar DoT and slow; fifth stack causes Sugar Crash then consumes the stacks. Keep the existing boss slow substitution and CC immunity. |
| Cooling / Chill | Mint breeze and ice shape | Keep current chill → freeze rules through S3. Later flavour pass can use cooling/pushback; do not silently change saved recipes. |
| Tender | Cracked tiffin icon | A bounded damage-taken debuff; Mutton Curry may also push ordinary pests. No additive chain of full damage multipliers. |

Use “Sticky” / “Sugar Crash” in new player copy rather than the old disease joke. Our Scorch means a burn, not PoE's resistance-lowering Scorch ailment. Retain save IDs until a versioned migration. Colours come from the brand palette; icons distinguish states without relying on colour.
DoT never crits or fires on-hit effects. Sugar slow takes the strongest applicable slow, rather than adding every slow. Bosses never hard-freeze/stun; elites get half duration and the existing post-CC immunity remains.
Compute conversion before damage bonuses, up to 100% once. Increased bonuses in a family add; only named rule changes multiply, under explicit caps. Use the base eligible hit for ailments, not the already mitigated/amplified hit; no double scaling.
Enemy traits create soft counters: armoured pests favour Tender, crowds favour zones/spread, shooters test reach, bosses test sustain. No compulsory Slag-like setup and no full immunity to a player's chosen food family.

## 4. Food is the skill archetype

All 12 food IDs already exist in CONTENT/types. The four owner foods get deeper routes, not duplicate replacements. Base behaviour ships with S3; alternate routes arrive through a named unique and keep a recognisable food silhouette.

| Food | Base identity retained | Advanced route and useful scaling | Weakness / phone limit |
|---|---|---|---|
| Kosong | Honest direct throw; later ricochet | Consistent impact; Ghee rebound crits; broad starter for any dip | Bounces lose damage; bounded hops. |
| Tissue | Narrow piercing shot | Tarik Lance; crit or trigger carrier through a row | Narrow coverage; one hit per target per pass. |
| Roti Bomb | Lobbed crowd blast | Scorch ground, Sambal death relay, crumb production | Flight delay; burst cannot repeatedly proc off one explosion. |
| Telur | Egg fragments on hit | Secondary fans, conversion, one loaded fragment route | One split generation; same-volley target cap. |
| Thosai | Broad rolling wave | Typhoon travels up the street and pulls pests toward its centre line | Pull is bounded, never moves Kannan in depth or cancels a boss tell. |
| Chapati | Out-and-back boomerang | Return-hit crit, drink-charge rhythm, narrow lane duelist | Explicit out/return hit limits; cannot orbit forever. |
| Naan | Slow heavy landing | Focused blast or pre-laid tandoor batches via a unique | Delay and ground reach; max batch count. |
| Garlic Naan | Lingering garlic zone | Sneeze spread, stacked patches, Tender boss zone | Cap overlapping patches; flyers retain partial zone damage, not immunity. |
| Murtabak | Stuffed heavy slam | “Loaded”: store filling between slams, release a big scorch or a bounded crumb payload | Slow service; max one filling charge bank, not damage multiplied by every dip. |
| Appam | Bowl-shaped bounce chain | “Skitter”: seeded Spark-like wall rebounds; “Chope”: stationary serving bowl | Delivery modes replace each other; one mode per bread. |
| Idli | Rapid small volley | Spice/sugar stacks; final-idli trigger; steamer helpers | Volley count and helper limit; weaker first-hit burst. |
| Vadai | Rings guarding the counter | Cyclone sweep while sliding; hot perimeter or crit-trigger rings | Short reach; orbit hit interval cannot be bypassed by fast animation. |

## 5. Dips are linked supports

One dip instance belongs to one bread, never every bread. Two copies of a recipe may support different breads, spending two of the four dip instances. Duplicate dips on the same bread are illegal. A support link is not an extra equipped weapon or gear socket.
Pick a dip card to add/upgrade that link. The card names its bread: “Fish Curry → Murtabak: longer burn.” Automatic targeting favours the signature or the stated evolution partner. Change target while paused; moving an owned dip keeps its level and does not replay any pickup effect.
Saved link preferences guide offers, not a guaranteed final build. On old saves, do not invent a permanent dip inventory from an old run; supply recommended preferences and the earned starter recipe. Test compensation/loadout migration before global dips are retired.

| Dip | Supports | Linked effect and cost |
|---|---|---|
| Fish Curry | Hit breads | Applies Scorch. Heat DoT links favour slow heavy hits; no extra per-tick on-hit applications. |
| Condensed Milk | Hit/volley/orbit | Sticky sugar stacks. Multi-hit breads ramp quickly; cap per-target application rate. |
| Masala | Hit or zone | Later rework: Spice stacks; zones apply once per zone interval. Existing chain behaviour remains through S3; migrate it with a free re-pick when this route ships. |
| Sambal | Heat-capable bread | Scorched kills burst and spread remaining Scorch. Pays for chain coverage with less direct hit damage; ancestry cap limits relays. |
| Mint Chutney | Hit / wave | Cooling control; reduced hit damage buys stronger chill. Bosses get slow, never indefinite lock. |
| Mutton Curry | Hit / landing / zone | Tender plus bounded shove on hits. Wider coverage has a weaker debuff; strongest Tender wins. |
| Chicken Curry | Repeated hits | A short combo builds damage/crit for this bread only. Cooldown between stacks; no self-feeding children. |
| Ghee | Projectile / return / orbit | Longer spin and eligible crit power. More travel/lifetime spends part of the hit budget; cannot support helper AI or DoT. |
| Tarik glaze | Throw / volley | Every N primary servings hasten this bread. This is the existing `teh-tarik` dip, distinguished from the flask; evolution ID/recipe stays compatible. |
| Dhal | Any damaging bread | Kills credited to this bread heal, under a wave cap. Secondary deaths inherit one owner; not one heal for each linked support. |

Two linked flavours can offer a combo card: Fish Curry + Condensed Milk on one bread unlocks Caramel Crust, consuming sugar to make a burst; Fish Curry + Sambal unlocks spread. Never add hidden dip-dip reactions to every hit.
S3 evolutions stay bread L5 + partner L5, offered as an eligible evolution card. Later a dip partner must be linked to that bread; a passive partner stays player-wide. Existing evolution replaces the bread in its slot and retains legal links. No new chest-only gate or extra L5 requirement.

## 6. Kannan's jobs and small tree

Apprentice (L1) → Stall Cook (L3) → Tawa Specialist (L5 + practice task) → Prata Raja (L10 + practice task). Specialist routes stay swappable. A crown and stall prop show each promotion, following WORLD.
Fifteen nodes total: three branches each with two small nodes and one notable, plus two keystone leaves. Each node costs one point. Earn three points at L5, one per level L6–L10: eight total. At most one keystone before L9, two afterwards; a leaf needs its branch's two small nodes. Free hub respec, no consumable cost.

| Branch | Two small nodes | One notable | Keystone leaves |
|---|---|---|---|
| Heat | Heat/Spice DoT; ailment duration | Slow Cook: longer loaded-food charge retains its filling while dodging | Slow Simmer; Sweet Spot |
| Hands | Throw rhythm; projectile/area control | Clean Flip: first primary throw after a short stop carries a bounded bonus | Steady Service; Wok and Roll |
| Hospitality | Recovery/ward; drink supply | Regular's Refill: periodic drink charge even when a boss has no adds | Last Clean Apron; Pot Luck |

| Keystone | Changes a rule | Gives something up |
|---|---|---|
| Slow Simmer | Linked hit breads can turn part of Impact into a stronger Scorch; commit to one strong burn | Lower direct hit damage; these converted hits cannot crit. Does not convert an aura into a hit. |
| Steady Service | Primary bread hits bypass pest shields for reliable service | No crits, including trigger crits; does not remove enemy attacks or telegraphs. Our own shield rule, not PoE RT. |
| Sweet Spot | A bread's recent primary crit boosts its Heat/Spice/Sugar damage for a short window | Crits lose their extra hit damage. Crit triggers still work; cannot combine with Steady Service or Slow Simmer. |
| Wok and Roll | Normal throws continue while sliding; first stop has a Clean Flip payoff | Lower throw rate everywhere. Replaces Multitasker, never adds another moving multiplier. |
| Last Clean Apron | One HP; ward based on pre-keystone HP replaces it; immune to incoming enemy DoT. Regen/heals restore ward instead | Ward recharges only after a safe interval; losing ward leaves one fragile HP. No normal HP healing or revive refills; self-cost still spends ward. |
| Pot Luck | Utility drinks have stronger effects; drink supply becomes the main scaling axis | Lower primary bread rate. Healing amounts and unique on-sip damage are not utility effect; all remain capped separately. |

Last Clean Apron arrives only after ward UI and recovery rules work. Ward is a visible separate pool, not invincibility; every damaging hit spills through depleted ward to HP. Its ordinary gear route must work without a unique. Zero or one keystone remains a valid late-game choice.

## 7. Drinks are reusable flasks

Equip one drink at L5, two at L8, never duplicate the same base drink. No consumable bottles or ingredient cost per run. Start charged; recharge from primary kills plus time in active combat, so bosses and weak builds have supply. Wave breaks/paused menus do not farm charges.
Default auto-sip uses a visible condition: low HP for recovery, a ready offensive bread for utility. Optional manual tap overrides auto when enabled; input is recorded for replay. No extra timing requirement on the family preset.
One active effect per base drink; re-use refreshes, never stacks. A shared minimum sip interval prevents macro spam. Display at most two cups with charge pips and an active outline. Cup recipes have one utility suffix later, such as “long pour” (duration) or “siew dai” (charge efficiency).

| Drink | Basic effect | Build connection / cost |
|---|---|---|
| Teh Tarik | Brief throw rhythm + a bounded centre-line pull | Group for a loaded hit. Pull works on ordinary pests; bosses cannot be dragged. |
| Kopi-O | Brief crit chance / sharp aim | Reliable trigger window or Sweet Spot uptime; supplies no free child-trigger loop. |
| Bandung | Recovery over time + longer Sticky duration | Sugar ramp and safety; cannot also multiply every sugar tick. |
| Milo Dinosaur | Temporary ward and area bonus | Survive near the counter while sweeping Vadai. Ward refreshes to a cap; cannot accumulate layers. |
| Lime juice | Clear one player debuff; short Spice boost | Spice stack build with a recovery alternative; enemy DoT immunity is not universal damage immunity. |

Four drink uniques below replace a base drink, keeping the same slot and duplicate rule. Every unique has a normal-play recipe. Eternal utility from Brass Kopitiam Apron applies only basic utility portions at reduced strength; it excludes healing, ward grants and unique on-sip events.

## 8. Gear, affixes and sets

Keep five worn slots: Towel (crit/spread), Headband (damage/identity), Apron (sustain/ward), Gloves (delivery/rhythm), Slippers (movement/return). Drinks occupy cups, not a sixth armour slot. All gear remains visible on Kannan.
Retain Common → Uncommon → Rare → Epic → Legendary → Raja and the existing earned items; Unique is a behaviour category, not a seventh stronger rung. A rare stat piece can beat a unique outside its engine. Target recipes provide a usable unique before perfect rolls.

| Hawker affix | Axis and eligible slots |
|---|---|
| Sizzling / Peppery | Heat / Spice DoT; Headband, Gloves |
| Sticky Fingers | Sugar application/duration; Gloves, Towel |
| Loaded / Wide Plate | Heavy hit / area; Headband, Gloves |
| Long Pull / Fast Service | Drink duration / charge supply; Towel, Apron |
| Crispy / Well Oiled | Crit / projectile travel; Towel, Gloves |
| Tahan / Fresh Linen | HP/ward / recovery; Apron, Slippers |
| Light Steps / Return Customer | Slide control / return-hit damage; Slippers |

Display one main stat and up to two relevant affix lines in the default sheet; expand for detail. Biasa, Sedap and Shiok denote three tunable affix bands; do not multiply the whole item by every band. A class-mod-like headband can improve one allocated small node, never grant free keystones or raise their limit.
Crafting starts with choosing one relevant affix. Later each item has two visible seasoning changes; choose/raise a line, show the result before accepting, consume earned ingredients. No destruction, bad-roll tax, bought safeguards or permanent loss of the unique rule. Salvage duplicates into the same ingredient economy; no third currency.
Pin one unique recipe on the menu board; its page names a chapter/material route and a finite guaranteed ingredient total. Failed qualifying runs still move that total; random drops can surprise, never replace the recipe path. First unique tasks ask for a few demonstrations of the food's mechanic. Later bosses offer themed material choices, not an exclusive random roll or a daily lockout.

| Set (three pieces) | Two-piece identity | Three-piece behaviour and cost |
|---|---|---|
| Morning Shift: towel, apron, slippers | Recovery | First counter hit each wave builds a small ward; lower crit bonus than mixed crit gear. |
| Mamak Crew: headband, gloves, apron | Throw rhythm | Every N primary throws adds one reduced-strength serving; lower individual main stats. |
| Satay Night: towel, gloves, slippers | Heat/Spice duration | A scorched kill leaves one slow smoke patch; fewer defensive stats. |

These are the chosen set versions; earlier teardown sets are candidates, not extra bonuses. Sets use no five-piece multiplier. A three-piece set leaves two unique slots, but mixed gear must remain competitive at equal earned investment.

## 9. Nineteen original uniques

Red-text-style lines are original flavour, followed by a plain mechanical rule. All downsides are shown. First catalogue wave: Last-Order Gloves, Longkang Skippers and Milkman's Crown in 0.4; Smouldering Apron in 0.6 after sustain. The rest unlock through later recipe/trial tasks; no random-only build gate.

| Unique / slot | Original one-liner | Enabler / drawback |
|---|---|---|
| Smouldering Apron / apron | “The tawa never clocks off.” | Heat aura in counter-front semicircle, paid by steady self-drain. Recovery sustains it; cannot crit/proc hits; turns off before self-drain would kill. |
| Sambal Messenger / towel | “Pass it down the queue.” | Loaded Scorch deaths relay one reduced-strength burst; lower single-target hit. Copies remaining duration; no unbounded overkill. |
| Milkman's Crown / headband | “Too sweet? Toast it.” | At sugar crash, consume stacks for a heat burst instead of hard CC; less slow. Boss conversion remains legal. |
| Longkang Skippers / gloves | “Every drain leads somewhere.” | Appam becomes seeded skittering projectiles with pierce and fixed street-edge rebounds; removes its normal enemy hops. |
| Mortar Master's Band / headband | “Leave a little pepper behind.” | Garlic Naan patches spread remaining Spice once when a marked pest dies; shorter zone life. |
| Crumb Collector / apron | “Nothing good goes to waste.” | Roti Bomb creates crumbs; a linked loaded Murtabak consumes them for homing morsels. Fewer normal bombs; finite crumb/orb count. |
| Last-Order Gloves / gloves | “One more, then we close.” | Final primary Idli in a volley launches one owned Murtabak payload on cooldown; Murtabak's normal timer is replaced. |
| Lucky Receipt / towel | “Your number is up.” | Primary Vadai crit triggers one owned Tissue shot; Tissue's normal timer is replaced, trigger cooldown applies. |
| Rolling Slippers / slippers | “Slide the whole breakfast over.” | Vadai's ring sweeps laterally with Kannan, with extended front reach; lower orbit damage and no extra enemy-CC duration. |
| Banana-Leaf Banner / headband | “Make room for the big plate.” | Thosai waves carry a travelling swirl and bounded centre pull; slower wave rate, max one swirl. |
| Thousand-Steam Apron / apron | “Small bites, busy hands.” | Idli becomes short-lived helpers instead of volleys; lower direct output, capped count. Helpers inherit only Idli's legal links. |
| Chope Towel / towel | “This table is serving.” | Appam becomes a stationary serving bowl at the counter lane, casting while Kannan moves; weaker casts and fixed lifetime. |
| Closing-Time Mitts / gloves | “Serve them all together.” | Naan throws lay armed portions; next stop detonates the batch. Lower placement rate; at most three, automatic expiry. |
| Regulars' Roll Call / headband | “Learn something from every customer.” | An elite kill lends one allowlisted trait briefly, max two; lower base damage. No boss traits, immunity or recursive summons. |
| Brass Kopitiam Apron / apron | “The kettle keeps its promise.” | Basic utility portions of equipped drinks stay on at reduced effect; disable their sipping/on-sip triggers, healing and ward grants. No ordinary apron recovery. |
| Stretching Teh / Teh Tarik cup | “Pull until the queue bends.” | Sips send a short visible stream down Kannan's lane, grouping ordinary pests; slower recharge and reduced haste. |
| Double-Shot Kopi / Kopi-O cup | “Count the cups, count the crits.” | After a sip, a bounded number of primary hits guarantee crit; replaces timed crit chance and consumes more charge. |
| Rosy Toast / Bandung cup | “Pink first. Golden after.” | On sip, turn one target's remaining sugar into a limited Scorch; reduced recovery, target nearest counter. No passive conversion loop. |
| Bottom-of-the-Tin Milo / Milo cup | “There is always one last scoop.” | Full-charge sip makes a cocoa blast using the drink's own damage budget; no ward grant, slower recharge. Blast cannot refill itself. |

## 10. Twelve example builds

Each food family has an ordinary-gear route; the named unique opens the exact special engine. “Cards” means desired picks, not a guaranteed script. Tree entries may be small nodes instead of keystones. One or two drinks, within unlocked slots; one delivery replacement per bread. Early variants get drinks/tree additions when those systems ship.

| Build / first engine release | Gear + tree + drinks | Run links/cards | Fun / genuine weakness |
|---|---|---|---|
| Tawa Saint / 0.6 | Smouldering Apron; Hospitality recovery; Bandung + Milo | Vadai–Dhal, Garlic Naan–Fish Curry; Hot Tawa, Kopi Break, Big Dough | Hold a hot perimeter while healing the self-cost. Ranged bosses force a second reach option. |
| Sambal Relay / 0.6 | Sambal Messenger; Slow Simmer; Stretching Teh | Loaded Murtabak–Fish Curry/Sambal; Big Dough, Hot Tawa | Group, slam, watch the queue pop. A lone boss provides no relay fuel. |
| Pepper Popper / 0.5 | Peppery gloves + Tahan apron; Heat duration; lime + Kopi-O | Idli–Masala, Garlic Naan–Mutton Curry; Fast Flip, Hot Tawa | Stack spice then dodge while it ticks. Takes time to ramp; quick runners test it. |
| Caramel Queue / 0.4 then drinks 0.5 | Milkman's Crown; Hands rhythm; Bandung | Idli–Condensed Milk/Fish Curry; Caramel Crust, Fast Flip | Sticky pips become bursts. Sacrifices hard control; bosses keep advancing their tells. |
| Appam Arcade / 0.4 | Longkang Skippers; Hands travel, later Sweet Spot; Kopi-O when drinks ship | Appam–Ghee/Chicken Curry; Extra Dough, Lucky Towel | Fill the street with skittering bowls. Needs duration/pierce; collision caps stop boss shotgunning. |
| Crumb Comets / 0.6 | Crumb Collector; Heat duration; Stretching Teh + lime | Roti Bomb supply + Murtabak–Fish Curry; Big Dough, Hot Tawa | Make crumbs, then a homing swarm. The bomb supplies crumbs on its throw cycle even with no kills; long recharge limits burst. |
| Last Order Loader / 0.4 | Last-Order Gloves; Hands rhythm; Teh Tarik when available | Idli–Chicken Curry, Murtabak–Fish Curry; Fast Flip, Big Dough | Little bites launch a huge loaded hit. Throws drive it without crit; speeding past cooldown gives no extra payload. |
| Lucky Counter Cyclone / 0.6 | Rolling Slippers + Lucky Receipt; Wok and Roll; Double-Shot Kopi + Milo | Vadai–Ghee, Tissue–Chicken Curry; Lucky Towel, Big Dough | Slide a ring through pests; crits launch the lane shot. Short reach and two gear commitments cost defence. |
| Thosai Monsoon / 0.6 | Banana-Leaf Banner; Hands area; Stretching Teh + Milo | Thosai–Mint, Naan–Mutton Curry; Big Dough, Fast Flip, Typhoon | A visible swirl groups a whole row. Bounded pull cannot keep a boss still; slow waves leave gaps. |
| Steamer Brigade / 0.7 | Thousand-Steam Apron; Hospitality supply; Bandung + Teh Tarik | Helper Idli–Masala/Dhal; Fast Flip affects serving cadence, Thick Skin | Tiny helpers work while Kannan dodges. Helper count/lifetime and reduced direct damage keep it finite. |
| Chope and Close / 0.7 | Chope Towel + Closing-Time Mitts; Hands Clean Flip; Milo + lime | Appam–Condensed Milk, armed Naan–Mutton Curry; Big Dough, Thick Skin | Park a serving bowl, prepare three landings, stop to detonate. Setup and fixed lanes punish poor placement. |
| All-Day Kopitiam / 0.7 | Brass Kopitiam Apron + ordinary affixes; Pot Luck; basic Teh Tarik + Kopi-O | Chapati–Ghee, Murtabak–Fish Curry; Fast Flip, Lucky Towel | Permanent gentle rhythm and crit sustain the build. No on-sip powers/healing/ward; slower base service means uptime must earn its cost. |

## 11. Cards chain off the persistent build

At run creation, derive two dominant tags from actual signature/links, gear rules, tree and cups. A title alone never biases cards. Track new picks so the run can pivot; a skipped family gradually loses weight.
Start with the existing weights. Filter illegal/maxed picks and absent targets, then proposed ×1.5 for useful matching tags. Reserve an owned upgrade slot while one exists; reserve a viable signature link until filled; the remaining slot explores an unlocked alternative. Deduplicate the three cards.
Raise the missing evolution ingredient's weight when its recipe is pinned; once eligible, keep S3's guaranteed evolution on the next offer. Never offer a locked recipe or an incompatible delivery mode. Keep card upgrades and evolution prerequisites visible.
Damp a declined card to half weight for two offers; rerolls also avoid the just-rejected triple. No duplicate reward-level offers. If fewer than three legal choices remain, fill with heal/coins, never an inert dip or maxed skill.
One default reroll, two from L4 as live; no paid or ad rerolls. Free Skip accepts a modest heal. Paused link changes and choice results are seeded/core-owned; purchases, wall clock and analytics never affect card RNG.
An offer annotation says “Fits your hot Murtabak.” Default card copy stays within eight words; exact before/after numbers and the cost sit in an optional detail sheet. Weighted help improves reliability but cannot force an identical run every time.

## 12. Guard rails and implementation contracts

- Family surface: one thumb, suggested loadouts, automatic dip placement and sipping, three cards, one named next goal. Details/tree/crafting stay in paused hub sheets. Optional manual cups do not sit over the drag zone; targets at least 48 dp.
- Portrait readability: at most two cups, three status icons per pest then a compact overflow, merged DoT numbers. Hazards draw above player fog/swirl FX. Enemy silhouettes and true hit-area shapes survive low-effects mode; rendered art follows the existing pipeline.
- Keep the pure seeded core. Future contracts need link target/owner, damage tags, primary/child origin, generation depth, trigger cooldown, drink charge/effect state and ward. None exists by implication in today's `OwnedDip` or `Loadout`; renderer/React/Expo cannot own these rules.
- Fixed simulation ticks and stable target-ID ordering resolve ties. A primary action may trigger one child stage; death relays get a small explicit depth limit. DoT cannot fire on-hit; child damage cannot refund its own charge or mint unbounded crumbs. Save/replay captures loadout/content version, seed, choices, link changes and manual sipping.
- Provisional semantic caps: eight spice stacks, five sugar pips, three placed Naan, six crumbs, six homing morsels, four helpers, one Thosai swirl, two borrowed elite traits. Every cap and overflow rule lives in tunable content; no renderer clipping may delete damage or secretly kill a pest.
- Preserve SPEC's engine ceilings (150 enemies, 300 projectiles) as hard safeguards; aim well below them for phone clarity. Bound spawn pressure; aggregate redundant visual particles, not damaging entities. A build that exceeds the logical budget must be redesigned before shipping.
- Extend the existing bot harness for each engine, sustained and burst damage, wave clear/time, boss time, HP/ward loss, drink uptime, dead offers and peak entities. Compare equal earned-investment loadouts across seeded novice/par/sloppy models; publish worst-matchup results and sensitivity to each tuning axis.
- Use 300 shared seeds for routine comparisons; broaden only for unstable results. Existing four/two/solo-bread baselines are regression signals, not permanent targets for every archetype. Every named build must have a useful normal-gear route and at least one visible counterplay weakness.
- Old-save migration is versioned and idempotent; never erase inventory or refund training twice. UI swaps and preview sheets cannot alter the live sim. Resume preserves trigger clocks, crumb ownership and cup charge. Award run/meta payouts once, as today.
- No paid power, dollar caps, mandatory dailies, energy, crafting destruction or attendance penalties. Proposed calendar becomes cumulative visits; ordinary runs earn the same essentials. Chef's Special uses equal supplied gear/tree/cups and versioned seeds for comparison, separate from personal-build play.

Ship by [ROADMAP](ROADMAP.md): feel first, S3 next, one linked engine, then drinks, then more delivery modes. The catalogue is a destination; each release earns its complexity by making the next run feel different.
