# Prata Raja backlog

13 Oct 2026 evening; live 0.4.1. Owner notes are intent, not spec. Current implementation order is in [ROADMAP](ROADMAP.md).

- **Owner direction 13 Oct (live feedback on 0.2.0):** it feels very Archero-like now; make it our own. **Never pay-to-win**, progression never gated by dollars (Archero "mining money" is the anti-goal). Monetisation only later if the game picks up, and fair (cosmetics/convenience/support, never power caps). Build depth like **Path of Exile** (DoT, AoE, Spark, Volatile Dead, Spellslinger, Cyclone, potion/flask builds; gear + skills + potions working hand in hand, crazy unique combos), with progression lessons from **Borderlands 2** and **MapleStory**: something to do at every step, unique combinations. Owner will give item specifics later; we expand. Research + roadmap → `docs/DEPTH.md`, `docs/ROADMAP.md` (design docs merged).

## Shipped
- **0.2.0:** stall hub, boss CC safety, counter-first targeting, breach/HP cues, short card copy and title layout.
- **0.2.1 (s2/feedback):** in-game Tell Kannan, PostHog analytics/replay/errors and chest pity copy.
- **0.2.2 feel pass:** throw anticipation/release/trails, outlined merged damage numbers, hit reactions, counter lunges, readable far pests, street projection/arrival fades, wave gaps, offer damping and staggered reveal. S3 retained these fold-ins.
- **0.3.0 S3:** recipes/evolutions/night chapter and content sprite keys for counter breads; bowls and bread stacks occupy fixed counter slots (`phaser/stall.ts`).
- **0.3.1:** prologue, mynah/drain rat and locked recipe copy. Verified in `StallHub.tsx`: “Cook evolved breads here from stall level 6.” The sole `Coming soon` in `src` is the Chef's Special preview (`stall/sheets.tsx`), not recipes.
- **0.4.0–0.4.1:** owner-delegated first spectacular build, loaded Murtabak; signature choice, Fish Curry/Condensed Milk/Mint links, heat Roti Bomb and bouncing Appam.

## Open items and remaining polish
- Decomp rebuild slices: damage core first, then boss scripts as data, fair crowds, feel and gear (see `docs/research/decomp-mechanisms.md`). Then jobs/cups in ROADMAP 0.5.
- Chef's Special and family leaderboard remain previews/future scope.
- World-tier scenes are sliced but unwired; worn-gear layers and Grade Inspector gameplay remain future work.
- Counter staging: extra contact shadows, rendered bowl tray/bread basket and subtle rendered tawa steam are not implemented. Fixed bowl/bread slots already shipped; do not rebuild them as missing work.
- Street staging: projection and arrival fade shipped; curved wandering/less regular spawn patterns remain polish, to be balanced with the bot.
- Themed card borders: banana leaf / steel thali / brass kolam / rangoli; further food-specific dip mechanics (Masala especially). Signature links shipped, but the full theme/mechanics proposal has not.
- Owner refs remain `docs/research/owner-refs-2026-10-13.md`; phone checks govern further motion, hit feedback and counter polish.
- Chapter 3–5 places are to be decided at 0.6; owner food/filling/drink specifics remain open.

## Later: real places (owner, 12 Oct)
Chapters become recognisable Singapore food spots with living ambient detail (swaying lanterns, ceiling fans, steam, birds, a crowd that moves): e.g. Kopitiam Street → Newton Food Centre at night → Tekka Centre → Lau Pa Sat's satay street → Gluttons Bay finale. Stylised and respectful; no real stall names or logos.

## Owner ideas (loose; fold in where they fit)
- **Tawa Heat (12 Oct):** an endurance/rage meter that rises the longer you hold the stall — the tawa burns hotter and hotter and boosts damage. Sketch: hits/kills add heat; getting hit or sliding sheds it (rewards the stop-to-throw rhythm); tiers add damage and throw speed; full heat triggers a short "Tawa Blaze" burst, then settles back to half. Shown on the tawa itself (glow, steam → flames, Kannan sweating), not as a bar. Fits the feel pass or S3; tune with the bot.
- **Hawker heroes (12 Oct):** more heroes beyond Kannan, each fighting with their own dish: a bak chor mee stall guy (noodle whips, meatball bombs), a nasi kandar fella (curry-splash waves, papadum shields), a chicken rice uncle (drumstick boomerangs, rice-ball scatter, chilli-sauce burn). "Teaming up": unlockable heroes to pick per run, and/or a neighbour stall that fires its dish alongside Kannan as an assist. Same contracts (breads/dips are per-hero data), new art per hero.
