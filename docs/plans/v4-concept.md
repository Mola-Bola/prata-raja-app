# Prata Raja v4: wood legend

Owner ideation, 15 Oct (late night), expanded by the lead. Keeps v2 (systems) and v3 (rough cut-out, nostalgia, five tiers) as references; this is the direction to solidify. Names are working names: the owner gave a naming direction, not final names. Art: ~/prata-raja-assets/v4/ (Codex batch 6).

## Core idea
A hawker's daydream that reaches back through history. Kannan's craft (prata, curry, sambal, dough) connects him to the old monsoon and spice routes, where cooks, sailors, smiths and heralds of many lands became legends. As he ascends he takes on their mantles: Tamil maritime traders, northern sea travellers, Greek voyagers, kiln keepers. Heroes and creatures from history and myth, never gods.

## Material: wood
- Everything is a cut-out made of wood: woodcut prints, marquetry inlay, carved teak, driftwood and burl, charred shou-sugi-ban, layered ply. Paper only where it tears.
- **Legendary parallax.** Like the Guild Wars legendaries that show a starfield inside the weapon, Kannan's armour and relics show a window of deep layered wood grain that shifts with his movement. Each ascension unlocks a deeper grain (pine, teak, rosewood burl, ebony with gold inlay, then a luminous many-layered grain). Technically: a screen- or world-space grain texture masked by the sprite's alpha in a Phaser shader, with two or three layers at different scroll rates.
- The world follows: shophouses, void decks and carts as wood and paper cut-outs borrowed from nature (bark, rings, knots) and 60s–80s Singapore.

## Paths (working names, owner's direction)
| Route | Tier 1 | Tier 2 | Tier 3 | Legend |
|---|---|---|---|---|
| Prata (Crisp) | Flipper | Crispmaster | Golden Edge | **Millennium Fold** |
| Curry (Soak) | Hawker Ladler | Curry Tidecaller | Spice Nimbus | **Monsoon Vanguard** |
| Heat | Chilli Chap | Sambal Soldier | Herald of Heat | **Kiln Sovereign** |
| Dough | Dough Slinger | Stretch Artist | Murtabak Warden | **Dough Colossus** |
Naming convention: a hawker word plus a rank from heraldry, voyages or soldiering (Chap, Soldier, Herald, Warden, Vanguard, Sovereign). Grounded at the start, titled at the top.

## Ascendancies (branches unlocked by bosses and story, not just levels)
Each route offers two ascendancies along the spice and monsoon routes. They change how the route plays, not just its numbers.
- Prata: **Chola Bladewright** (crisp blades forged like ship timber; pierce becomes a chain of cuts) or **Varangian Flipper** (northern sea traveller; a shield-throw that boomerangs).
- Curry: **Monsoon Navigator** (reads the winds; curry rain drifts and steers toward pests) or **Argonaut Ladler** (voyager hero; a ladle-oar that sweeps waves).
- Heat: **Kiln Herald** (terracotta kilns; burn becomes slow-baking zones that explode) or **Forge-Jarl** (northern smith-chieftain; burn stacks become a hammered brand).
- Dough: **Harbour Colossus** (a giant astride the harbour; huge slow slams) or **Bakehouse Golem** (oven and clay; absorbs hits, releases them as dough shockwaves).

## Progression without the 10/30/60/100 ladder
- **Levels** give small, constant growth (skill points, stat nodes).
- **Milestones** give the big moments: beat a boss, finish a story chapter, discover a combo, find a relic. Milestones unlock tiers, ascendancies, skill sets and relic slots.
- A route's tiers are earned by its own milestones (e.g. Golden Edge after defeating the Queue Hydra with 50 Crisp kills that run), so progression feels authored, not grindy.
- Story carries it: each chapter is a night street with its boss, a regular's story and a historical echo told through Kannan's daydream.

## Bosses (place + mythic creature, no gods)
Drain Serpent (a world-serpent coiled through the monsoon drains), Queue Hydra (pest heads rising from tangled hawker trays), Wet Market Minotaur (a labyrinth of fish crates and ice at 4 a.m.), Grease Kraken (oil-and-charcoal tentacles from a giant wok), the Rat King on a throne of mahjong tiles and stacked stools, the Moth Queen of the sodium lamp. Each boss guards a milestone.

## Living cut-outs: what moves
Three kinds of objects, so the world feels hand-made and alive without animating everything:
- **Static:** facades, HDB blocks, signboards (parallax layers only).
- **Sway:** one-piece wobble on springs: lamps, umbrellas, stools, hanging signs, laundry.
- **Puppet:** multi-part cut-outs with joints (brass-pin look): Kannan, the kopi uncle, carts (the ice kacang cart's crank turns, ice shaves, syrup bottles tilt, the cup fills), bosses (hydra necks, kraken tentacles). Rigged as simple bone hierarchies tweened in code (Spine-style without Spine), with paper-flutter secondary motion.
Rule: interactive or story objects are puppets; scenery sways or stays still.

## Relics
Kept from v3: storied mythic items, one equipped, each bends a rule; now with a legendary-parallax grain window.

## Keeps from v2
Four statuses and six reactions, the Kitchen as one build screen, gear slots and sets, throwing feel, crunch and sound pillars, the operating model.
