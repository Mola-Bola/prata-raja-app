# Prata Raja: game feel and combat research

Sourced facts link to their page. "(judgement)" marks my starting values, to tune in the headless sim. Repo checked 2026-10-12: `phaser` 4.2.1 and `expo-haptics` are in `package.json`, `src/core` has no Phaser, React or Expo imports outside tests, and `src/core/waves.ts` is still stubs.

## 0. Repo facts that constrain the advice
- `view.ts`: horizon at 20% of screen height, counter line at 68%. The brief says the counter is the bottom ~22%. Reconcile one.
- Enemies scale to 0.3x at the horizon (`far` = 0.3). A 120 px sprite is 36 px there.
- Depth knockback moves ~1.35 px per field unit at the counter but ~0.12 px at the horizon (844 px screen, my arithmetic).
- `cards.ts` weights: bread level-up 1.2, new bread 0.8, dip level-up 1.0, new dip 0.8, passive 0.7; max level 5.
- `stats.ts` XP to next level: 9, 13, 19, 25, 33 for levels 1-5.

## 1. Juice checklist for S1
**Hit-stop.** Freeze the sim in core by milliseconds, not frames (120 Hz phones). Input and tweens keep running.
- Normal hit: 0 ms freeze; instead a 16 ms white tint and squash 1.12x0.88 for 60 ms.
- Normal kill: 0 ms; squash 1.25x0.6 for 80 ms, then shrink and fade over 120 ms, with 6 crumbs.
- Elite hit 33 ms (elite only). Boss phase change or part tear 100 ms. Boss death 167 ms.
- Fighting-game bands are 2-4 frames light, 6-10 heavy, 12-18 super at 60 FPS ([Gamineai](https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026), unsourced rules of thumb). Dense bullet-heaven hits need far less per hit.

**Shake.** Do not use Phaser's defaults. `Shake` defaults to 100 ms at intensity 0.05, which is up to ±19.5 px at 390 px wide ([source](https://unpkg.com/phaser@4.2.1/src/cameras/2d/effects/Shake.js)).
- Trauma model: offset = trauma² × 0.025 × viewWidth (about 10 px max), no roll, decay 1.0/s. The [Godot recipe](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/) squares trauma and credits a GDC talk ([Eiserloh 2016](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)); I did not check the talk's own formula.
- Trauma per event: normal kill 0; elite hit +0.5 (2.5 px); Kannan hit +0.6; boss phase +0.8; boss death +1.0.
- Shake the world container, never the HUD. No shake during windups ([Gamineai](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026)). Reduce-motion scales trauma by 0.3; [Xbox guideline 117](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117) covers shake and bobbing and expects player control.

**Knockback** runs along depth, away from the counter, which buys stall time. Field units: walker 8, splitter 10, shooter 6, flyer 4, tank 2; elite and boss 0 (stagger only). Quad.easeOut 90 ms, with a 300 ms per-enemy cooldown so nothing gets pinballed (judgement).

**Squash and stretch** keeps scaleX × scaleY near 1 (1.15 × 0.87). See [Lasseter's principles paper](https://www.evl.uic.edu/aej/527/papers/lasseter.pdf) on squash, stretch and volume.

**Damage numbers** (judgement): 15 px. Normal white; crit amber with a 1.4x punch over 100 ms. Rise 22 px over 450 ms, fade over the last 150 ms. Merge hits on one enemy within 150 ms. Max 12 on screen, pooled. DoT ticks get no number; the status icon pulses.

**Particles and sound** (judgement): pooled papercraft crumbs, 2 per hit, 6 per kill, 60 live max. Two sound layers per hit (click plus body), 8 voices max, 50 ms cooldown per sound, ±4% pitch. Distinct elite and boss cues.

**Haptics.** `expo-haptics` is already a dependency and imported in `src/game/bridge.ts`. Light on a Kannan hit, medium on an elite hit, heavy on boss phase or death. Max 4 per second, behind the settings toggle.

**Do not overdo it on a phone:** freezes on normal hits; flashes above 2 per second (WCAG caps at 3: [2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)); shake above 10 px or any rotation; slow-mo on normal kills; additive glow on more than ~10 entities; per-sprite blur filters; more than ~200 live tweens (WebView budget, judgement); haptics on every hit.

## 2. Readability in a crowded portrait screen
- **Layers, back to front:** horizon haze; floor and telegraph decals (alpha 0.35 max); flat ground shadows at field y (alpha 0.3); enemies sorted by field y; enemy shots; player breads; status icons and numbers; HUD. Enemies reaching the counter tuck behind the lip, so contact reads as arrival.
- **Silhouette test:** each kind reads as a black silhouette at 0.3x. Bake outlines at counter scale and keep them at least 1 px at the horizon. Use a simpler far frame if it fails.
- **Colour, colourblind-safe** ([Okabe-Ito](https://siegal.bio.nyu.edu/color-palette/)): hazards vermillion #D55E00, dashed. Safe gaps bluish green #009E73. Enemy shots vermillion, solid, dark outline, no glow. Statuses: burn orange #E69F00 flame; chill sky blue #56B4E9 crystal; freeze blue #0072B2 ice block; sugar reddish purple #CC79A7 with pips 1-5 (pip 5 pulses before the stun); stun yellow #F0E442 stars. Every status also has a shape.
- **Rarity:** border style and 1-4 glyphs first (plain, double, double with foil for keystones). Hue is secondary and never a status hue.
- **One palette per enemy family, not per enemy.** Darktide's dev blog found per-enemy palettes made the crowd noisier ([blog](https://darktide.gameslantern.com/news/darktide-101-enemy-character-art-dev-blog)).
- **Budgets** (judgement): 40 live enemies; 24 player shots in flight; 12 damage numbers; 3 status icons per enemy, then "+n"; 3 boss telegraphs at once. Over the cap, queue spawns; do not delete them. Brotato silently kills a random enemy above its 100 cap ([wiki](https://brotato.wiki.spellsandguns.com/Enemies)); don't copy that.
- **Effects slider:** "Effects: low" hides ambient particles and glow, never telegraphs or hitboxes. Vampire Survivors players asked for one after late-run effect clutter ([Steam](https://steamcommunity.com/app/1794680/discussions/0/4631482569784862180)).
- Keep HUD text out of the enemy band (horizon to counter line).

## 3. Wave pacing: 10 waves plus boss, about 6 minutes
- **Fix first:** `waves.ts` documents spent share = (t/T)^0.85. That spends 8.5% of a wave's budget in its last tenth, so spawns are front-loaded, against the "pressure builds" intent. Use exponent 1.2 (11.9% in the last tenth).
- Par-run timeline (budget in `ENEMY_COST` units; boss sits outside the budget):

| Wave | Start | Active | Breather | Budget | Adds |
|---|---|---|---|---|---|
| 1 | 0:00 | 18 s | 5 s | 10 | walkers |
| 2 | 0:23 | 20 s | 5 s | 13 | flyers |
| 3 | 0:48 | 22 s | 5 s | 16 | mosquito swarm |
| 4 | 1:15 | 24 s | 5 s | 19 | shooters |
| 5 | 1:44 | 24 s | 5 s | 22 | splitters |
| 6 | 2:13 | 26 s | 8 s | 31 | ELITE (+6) |
| 7 | 2:47 | 28 s | 5 s | 28 | recovery wave |
| 8 | 3:20 | 28 s | 8 s | 37 | ELITE (+6), densest |
| 9 | 3:56 | 30 s | 8 s | 34 | full mix, no elite |
| 10 | 4:34 | 26 s | 3 s warning | 28 | escort only |
| Boss | 5:00 | par kill ~60 s, enrage at 90 s | — | outside | phase 2 at 50% HP |

- Budget = 10 + 3 × (wave − 1), plus 6 (tank cost) on elite waves 6 and 8. Wave 10 is held at 28 so the boss is the spike.
- Elites: Brotato's first challenge wave is 11 or 12 of 20, and its elites spawn at 75% health ([waves](https://brotato.wiki.spellsandguns.com/Waves), [enemies](https://brotato.wiki.spellsandguns.com/Enemies)). Wave 6 of 10 is a similar slot. Spawning first elites at 75% HP is an option.
- Brotato ramps waves from 20 s to 60 s and makes its final wave 90 s ([waves](https://brotato.wiki.spellsandguns.com/Waves)). Ours run 18-30 s.
- Scale HP and counts, never speed. Brotato's enemy speed does not change with wave or danger; HP = base + (wave − 1) × per-wave ([enemies](https://brotato.wiki.spellsandguns.com/Enemies)).
- XP: 325 by the boss gives nine level-ups (9+13+19+25+33+41+51+61+73), about one per 33 s. Tune kill XP to land there.
- Level-ups queue to the next breather; the sim pauses while the card sheet is open.

Headless tuning (Node, no Phaser):
1. Run `waves.ts` and `sim.ts` with seeded `rng.ts` and dt = 1/60 s, 2,000 seeds per build.
2. Builds: weak, par, strong. Players: par (250 ms reaction, 10% misdodge) and sloppy (500 ms, 25%). Imperfect-player models are standard in [balance labs](https://www.skills.sh/thedivergentai/gd-agentic-skills/godot-monte-carlo-balancer).
3. Report per wave: clear rate, time to clear, HP lost (p50, p90), peak alive (p95), spawn overflow.
4. Starting targets (judgement): par clears waves 1-5 at 97%+ and 6-9 at 85-92%; boss 55-65% for par, 90%+ strong, under 20% weak. A par full run should land near one in three, the rate a [headless roguelike balance](https://solodevstack.com/blog/balancing-roguelike-headless-harness) targeted.
5. Tune budget first, boss HP second. Check that under-building loses before over-building does. A [2013 forum thread](https://ludeon.com/forums/index.php?msg=7967) warns that tying enemy strength to defence count rewards under-building (search snippet, not fetched).

## 4. Level-up cards
- **Keep the `cards.ts` weights**; they already favour upgrades over new items. Add (judgement):
  - Dead-pick filter: weight 0 for a dip no owned bread can trigger, and for an evolution before its ingredients.
  - Synergy ×1.5 for cards touching the top two breads or sharing a status family with the build.
  - Guarantee an owned upgrade in every offer while any owned item is below L5. The current guarantee covers only "no dip yet".
- **Rare pity**, if rarity tiers are added. Slay the Spire: rare 3% in normal fights and 10% in elites; a counter starts at −5, gains 1 per common, resets on rare, caps at +40 ([fan wiki](https://slay-the-spire.fandom.com/wiki/Card_Rewards); two wikis and a forum agree on start, step and reset). Our start (judgement): rare 5%; counter starts at −3, +2 per offer with no rare, cap +30, reset on rare.
- **Rerolls, banish, skip** (judgement). A [Hellscaper devlog](https://ezra-szanton.itch.io/hellscaper/devlog/547055/experimental-balance-update) cut rerolls to one to force accepting imperfect offers; [Survivor.io's guide](https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html) rations rerolls for build-defining picks.
  - Reroll: 1 at start, +1 per elite kill, cap 3.
  - Banish: 0 at start, +1 per elite kill, cap 2. Removes a card for the rest of the run, as in [Vampire Survivors](https://primagames.com/tips/how-banish-works-in-vampire-survivors-explained).
  - Skip: free, and takes the 30% heal card that `cards.ts` already falls back to.
- **Evolution signposting:**
  - The footer shows the recipe, e.g. [bread L5] + [dip] → evolution, with a lock on each missing piece.
  - Owning both makes the bread glow in its bowl; the evolution fires at the next breather with a 1.5 s fanfare. Deterministic, no chance roll.
  - Vampire Survivors gates evolutions on chest drops, which players feel as luck ([guide](https://primagames.com/gaming/vampire-survivors-weapon-evolution-guide); search snippet, page blocked).

## 5. Cut-out tween recipes
Each part is a container pivoted at its joint, animated by tweens; no bone rig for S1 (judgement). Ease names are Phaser's. Turning is a squeeze to a line: Paper Mario's flat sprites look paper-thin when turned ([Wikipedia](https://en.wikipedia.org/wiki/Paper_Mario)), so facing flip = scaleX 1 → 0.05 → −1 over 120 ms, Quad.easeInOut.
- **Walker (cockroach):** step 0.30 s. Body bob ±2% of height, Sine.easeInOut yoyo. Legs ±8°, alternating half-periods. Footfall squash scaleY 0.94 → 1.0 over 90 ms, Back.easeOut, with scaleX 1.03 for volume. Antennae ±12° over 0.2 s, random start 0-200 ms.
- **Flyer (pigeon) and swarm (mosquito):** hover ±6 px over 1.0 s. Shadow stays at field y, so height still reads. Wings scaleY 1.0 ↔ 0.55 on a 0.12 s yoyo, random phase. Lean ±8° from x velocity over 150 ms, Quad.easeOut. Swarm: 6 instances, ±6 px jitter at 0.5 s.
- **Splitter (bubble-tea blob):** idle scaleX 1.0 ↔ 1.08 with scaleY 1.0 ↔ 0.92 over 0.6 s. Hit: (1.2, 0.8) for 60 ms, then Elastic.easeOut over 350 ms. Split: pinch (0.8, 1.2) for 120 ms, then two children at 0.6x fly ±28 u over 180 ms, Quad.easeOut.
- **Thrower (chilli imp):** windup arm −25° over 250 ms, body scaleX 0.94. Telegraph: two pulses over 400 ms, scale 1.0 ↔ 1.08 with vermillion tint. Release: arm to +35° over 90 ms, Quad.easeIn; projectile spawns at the hand socket. Recovery over 200 ms, Back.easeOut. The 650 ms windup sits in the medium band ([Gamineai](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026)).
- **Boss (multi-part):** idle breath scale 1.0 ↔ 1.02 over 1.6 s. Lunge: back −20 u over 400 ms, hold 500 ms (900 ms windup), strike 150 ms Quad.easeIn with trauma +0.5 at impact only. Phase change at 50% HP: 100 ms freeze, one arm tears into a child that spins 360° over 800 ms and fades. Death: 167 ms freeze, three parts tear off, trauma 1.0.

## 6. Boss telegraphs with left-right dodging only
- Every hazard is a lane (an x-band) or a horizontal line. Circles need depth, and Kannan has only x. [Gamineai](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026) maps lines and lanes to directional strikes and circles to radial zones, so use the first two.
- Windup at least 900 ms for lanes and walls. Phase 2 may drop to 700 ms, with the reason written into the pattern table; Gamineai wants explicit intent for shorter high-punishment windups.
- The telegraph is the hitbox: the lane runs full height, horizon to counter, and damage is exactly that rectangle.
- Audio starts at windup start. Nothing shakes during windup.
- Every pattern reaches the outermost positions (±230 u). Archero players tuck beside a [chapter 2 boss](https://progameguides.com/mobile/archero-chapter-2-guide-tips-tricks/) or hug walls against a [chapter 5 pig's orbs](https://progameguides.com/archero/archero-chapter-5-guide/) to dodge less, so the generator must close those spots.
- At least 1.5 s with no hazard after each strike keeps stop-to-shoot a real choice (judgement).

Clearances use Kannan's 68 u body (`types.ts`) and 700 u/s moveSpeed (`stats.ts`).
1. **Lane strike:** 1-2 lanes, 96 u wide. Windup 900 ms, strike 200 ms. Clearing needs 82 u (48 + 34), about 0.12 s, so the telegraph is the decision.
2. **Gap wall:** a horizontal line rolls from horizon to counter in ~2.5 s, with 1-2 gaps of 95 u. Gap arrows show at spawn. [Archero's trail gaps](https://www.allclash.com/all-bosses-in-archero-how-to-beat-them/) read the same way.
3. **Lock-on lane:** a dotted aim line locks to Kannan's x for 800 ms, then the lane fires there. Moving through the lock punishes standing still to shoot.
4. **Twin lanes:** two lanes at random x, centres at least 200 u apart. Kannan's 68 u fits between them, so a safe spot always exists.
5. **Drop lanes (summons):** two glowing drop zones (lanes, never circles) for 1 s; minions land in them.

Phase 2 adds gap walls at double frequency and allows 700 ms windups.
