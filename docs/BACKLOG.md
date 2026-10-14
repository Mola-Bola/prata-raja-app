# Prata Raja backlog

14 Oct 2026; published live 0.4.10; continuous player-visible development goal active. Owner notes are intent, not spec. Current implementation order is in [ROADMAP](ROADMAP.md).

- **Owner direction 13 Oct (live feedback on 0.2.0):** it feels very Archero-like now; make it our own. **Never pay-to-win**, progression never gated by dollars (Archero "mining money" is the anti-goal). Monetisation only later if the game picks up, and fair (cosmetics/convenience/support, never power caps). Build depth like **Path of Exile** (DoT, AoE, Spark, Volatile Dead, Spellslinger, Cyclone, potion/flask builds; gear + skills + potions working hand in hand, crazy unique combos), with progression lessons from **Borderlands 2** and **MapleStory**: something to do at every step, unique combinations. Owner will give item specifics later; we expand. Research + roadmap → `docs/DEPTH.md`, `docs/ROADMAP.md` (design docs merged).

## Shipped
- **0.4.10:** calmer vibration and screen impacts from owner report (both confirmed).951-unit pinned gate, independent review,3controlled presentation browser cases and2existing regressions passed. Live Kitchen smoke clean; fullpostship67 running. Realphonecomfort not yet verified.
- **0.4.9:** earned flavour-specific dip simmer, all-save collection and results receipts; existing Signature level9 retained.949-unit pinned gate,5focused browser tests and independent review passed, including actual manual-quit payout fix.3600ordinary simulations and8baseline identity pairs passed; bonuses conservative. Live collection verified; full post-ship59 passed949units,61browser cases,300-seed balance and independent review with no findings/errors.
- **0.4.8:** opt-in Experimental Flaky Kosong in Kitchen; ricochets retained, normal runs unchanged.927-unit merged gate, independent review,6Kitchen browser cases and3000paired sandbox runs passed; live smoke verified. Full post-ship51 passed:56browser tests,300-seed balance and independent review with zero findings/errors. Extra hit/support opportunities require owner steer before normal adoption.
- **0.4.7:** decelerating knockback, actual-haste Teh cup cue and scrollable320x480 offers.909-test ship gate; focused scroll/click browser proof and live Kitchen smoke check passed. Full verifier42 passed:53browser tests,300-seed balance and independent review with zero findings/errors.
- **0.4.6:** roti tags, dip families and visible matching-link bonuses in Kitchen/cards;884units and source CI passed. Live fit labels verified;52browser tests and300seed balance passed. Independent review found short-offer Reroll clipping at320x480; fix39 shipped0.4.7. Owner-pairing race test corrected without production changes.
- **0.4.5:** small-phone stall footer no longer blocks the chest hotspot;20focused browser cases and873units passed. Full post-ship50browser/300seed/review verification passed.
- **0.4.4:** Test Kitchen with existing content, seed/wave selection and live knobs; sandbox feedback context; reopened-note status and verifier retry fixes. 873-test gate and source CI passed; post-ship balance/review passed;49/50browser cases passed and the stall overlap failure is fixed in0.4.5.
- **0.4.3:** fleet machinery and in-game feedback categories, snapshots, private notes, threads and status. Owner device pairing remains pending.
- **0.4.2:** counter readiness/throw motion and dip effect plus explicit link scope; live HTML verified.
- **0.2.0:** stall hub, boss CC safety, counter-first targeting, breach/HP cues, short card copy and title layout.
- **0.2.1 (s2/feedback):** in-game Tell Kannan, PostHog analytics/replay/errors and chest pity copy.
- **0.2.2 feel pass:** throw anticipation/release/trails, outlined merged damage numbers, hit reactions, counter lunges, readable far pests, street projection/arrival fades, wave gaps, offer damping and staggered reveal. S3 retained these fold-ins.
- **0.3.0 S3:** recipes/evolutions/night chapter and content sprite keys for counter breads; bowls and bread stacks occupy fixed counter slots (`phaser/stall.ts`).
- **0.3.1:** prologue, mynah/drain rat and locked recipe copy. Verified in `StallHub.tsx`: “Cook evolved breads here from stall level 6.” The sole `Coming soon` in `src` is the Chef's Special preview (`stall/sheets.tsx`), not recipes.
- **0.4.0–0.4.1:** owner-delegated first spectacular build, loaded Murtabak; signature choice, Fish Curry/Condensed Milk/Mint links, heat Roti Bomb and bouncing Appam.

## Open items and remaining polish
- Ordered work: 0.4.10 postship verification (67) alongside measured attack-window polish (61/62) → Thosai rolling visuals (source confirmed63; sequence actors ownership) → jobs/drinks (ROADMAP 0.5). Flaky prototype38 is live in Kitchen only; ordinary adoption awaits owner steer. Decomp damage/RNG/boss-data refactors are optional later architecture.
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
- **13 Oct, polish follow-up:** use `research/decomp-mechanisms.md` as design research, not copied implementation or verified tuning. Next bounded physics experiment: decelerating knockback with preserved total displacement; then telegraphed lunge/recovery windows and simultaneous-attacker budgets, each independently measured against the existing 300-seed baseline. Swept projectile contacts and per-projectile hit tracking already exist in `src/core/sim/shots.ts`; do not rebuild them. Damage stages, named RNG streams and boss-emitter data are later architecture proposals, not prerequisites for feel work. Keep classic stop-to-fire provisional.
- **13 Oct, experimental branch:** `codex/polish-combat-1` (`5a4a12e`) applies existing slows to all boss movement but fails two balance gates (chapter 1 two-bread 39.33%; chapter 2 four-bread 67%). Do not merge or ship it as a bug fix without separately resolving the gameplay/balance consequences; retain the report as evidence.
- **14 Oct, in-game feedback (6e457239, 97cf030f; device unpaired):** (a) plain pratas visibly flake/disintegrate with splinter-like clusters; (b) an observation about Teh Tarik visuals on wave2. Initial inbox triage called both presentation-only; the lead’s bounded Kitchen-only flake prototype also tests damaging pieces, so it requires collision and balance evidence and is not normal-run direction. Actual-haste Teh cues shipped0.4.7. Preserve the original feedback without treating anonymous context as authenticated owner identity.
- **Tawa Heat (12 Oct):** an endurance/rage meter that rises the longer you hold the stall — the tawa burns hotter and hotter and boosts damage. Sketch: hits/kills add heat; getting hit or sliding sheds it (rewards the stop-to-throw rhythm); tiers add damage and throw speed; full heat triggers a short "Tawa Blaze" burst, then settles back to half. Shown on the tawa itself (glow, steam → flames, Kannan sweating), not as a bar. Fits the feel pass or S3; tune with the bot.
- **Hawker heroes (12 Oct):** more heroes beyond Kannan, each fighting with their own dish: a bak chor mee stall guy (noodle whips, meatball bombs), a nasi kandar fella (curry-splash waves, papadum shields), a chicken rice uncle (drumstick boomerangs, rice-ball scatter, chilli-sauce burn). "Teaming up": unlockable heroes to pick per run, and/or a neighbour stall that fires its dish alongside Kannan as an assist. Same contracts (breads/dips are per-hero data), new art per hero.

## QA debts (13 Oct)
- Real-phone notch/haptics/FPS and replay bandwidth pass outstanding.
- Economy pacing awaits owner playtest evidence; worn-gear art not wired.
- Date-only lastPlayed acceptance; legacy zero-run prologue once is accepted.
- In-game owner identity/status/threads are implemented; owner device pairing and real-browser taps remain outstanding.
