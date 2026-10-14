# PLAN-2: from arena/waves to Direction 2.0

Order matters. Each slice is one Haiku (H) or Sonnet (S) agent, 1-2 hours, ships alone with `tsc` + touched tests + web build (Direction 2.0 light verification). "Owner sees" is the one-line acceptance. Do not change the deterministic-sim contract: same seed + same inputs = same world. Never pay-to-win; never delete the old paths until the new one is live behind a flag.

## Design decisions (recommended)
| Topic | Decision |
|---|---|
| (a) Spawn | `src/core/director.ts`: a pressure curve over run distance `d` (metres travelled), not waves. Spawns by weighted mix + budget-per-second, bosses/elites fire at **story beats** (`beats` list in chapter data). Reuse `ENEMY_COST`, `spawnEnemy`, rng streams. Old `waves.ts` kept for Test Kitchen until retired. |
| (b) Moving stall | Sim gains `world.dist` (advances at `stallSpeed`, slows to 0 during boss/dialogue beats). Presentation scrolls 2-3 parallax layers by `dist`. Spawn lanes: ahead (x far end, as now), left/right sides (new `lane` on spawn request, enemies run in from screen edge). Enemies drift backwards relative to scroll so they "approach". |
| (c) Story unlocks | `story beat id -> unlock list` table in `src/meta/story.ts`; `save.beats: string[]`. Replaces `UNLOCK_TABLE` level gates and `chapterUnlocked` boss-attempt gate. Gear/roti/dip availability checks beats, not stall level. |
| (d) Kannan level | One `save.kannanXp`/level from kills, beats and run end. Run-level and stall level removed from the UI. See card note below. |
| (e) Crafting | Reuse `MATERIALS` (flour ghee egg onion spice sugar milk); add `masala` (rename/alias spice into `masala` + `spice` types). Drops from enemy kinds and route stops; spent at stall bench. |
| (f) Dips | Add `supportEffect` to dip data: chill/freeze, spicy DoT, sneeze cloud. See below. |
| (g) Save | `SaveV3` + `migrate` v2->v3, idempotent, keeps everything, maps `stallXp` to Kannan level (no loss). |
| (h) Stall | Stall = component list on save (`stall: {wheels, awning, tawa, ...}`), PvP later. |

### (d) In-run cards after one persistent level
Options: **1)** keep cards on level-up, now using the persistent Kannan level thresholds each run (run XP resets, level doesn't). **2)** Cards only from story beats / junction stops ("a customer offers you something"). **3)** Replace with crafting-bench picks between route segments. **Recommend 2 plus a small beat-time pick of 1-of-3**: cards become the same decision at a calm moment, no mid-fight pause (fits continuous flow, avoids double progression). Cards are a placeholder per owner, so keep the card UI and just change the trigger (`pendingLevelUps` -> `pendingPicks`, filled at beats). Fallback if the owner dislikes it: option 1 is one line away.

### (f) Dips as supports with themed effects
| Dip | Effect (read on the enemy) |
|---|---|
| Mint chutney | stacks `chill` (blue tint, frost breath, slower walk); full stacks = **freeze as a stiff, shivering enemy with frost rim**, not an ice block; shatter chip damage on hit |
| Curry (Fish/Mutton) | **Spice DoT**: new status `spicy` (red-orange sweat drops, enemy fans mouth, ticks scale with Spice stat); not generic `burn` and no side icon; spreads if enemy dies of it only when Rendang-style tag |
| Masala | **Sneeze cloud**: zone on hit; enemies inside sneeze (brief stagger, accuracy loss), cloud lingers 3s, grows with Richness |
| **Roti scatter/flake (new)** | Crisp rotis (Tissue, Kosong) shed **flakes** on every pierce/hit; flakes are tiny slow projectiles that stick to enemies and *crumble* (small AoE) when the enemy is hit by anything else. Dips decide the flake type (mint flakes chill, curry flakes spicy). Gives a producer/consumer loop, readable as crumbs, cap 12 live flakes for phone perf. |

## Slices
| # | Slice (model) | Owned files | Owner sees (acceptance) |
|---|---|---|---|
| 1 | **Director core** (S): `director.ts` pressure curve + `world.dist`, behind `chapter.mode='flow'`; waves untouched | `src/core/director.ts`, `src/core/sim.ts`, `src/core/types.ts`, `src/core/__tests__/director.test.ts` | Autoplay bot survives a flow chapter; same seed gives same kills |
| 2 | **Scrolling street** (S): parallax layers driven by `dist`, no wave banner/strip in flow mode | `src/game/phaser/RunScene.ts`, `look.ts`, `layout.ts` | The street visibly moves while Kannan fights |
| 3 | **Side and ahead spawns** (H): `lane` on spawn requests; enemies enter from edges with entrance anim | `src/core/sim/spawn.ts`, `waves.ts` types, `actors.ts` | Pests come from the sides as well as ahead |
| 4 | **Beat track** (S): beats data per chapter (dialogue, boss, junction); sim pauses scroll on beats; reuse story panels | `src/content/story.ts`, `src/content/chapters.ts`, `src/core/director.ts`, `src/game/ui/*` | A beat line pops, boss arrives at its beat, run ends at route end |
| 5 | **Story unlocks** (H): `save.beats`, beat->unlock table, replace `UNLOCK_TABLE`/`chapterUnlocked` | `src/meta/story.ts`, `stall.ts`, `chapters.ts`, `types.ts`, tests | Finishing a beat unlocks a roti/dip with a toast; no "reach level N" text |
| 6 | **SaveV3 + migration** (S, do before 7): v2->v3, `beats`, `kannanXp`, `stall` component, keep `stallXp` | `src/meta/migrate.ts`, `types.ts`, `src/core/save.ts`, `src/meta/__tests__/migrate.test.ts` | Owner's existing save loads with same gear, coins, recipes; nothing lost |
| 7 | **One Kannan level** (S): kannanXp from kills/beats/run end; remove in-run level and stall level HUD; gear never rolls above current level (cap ilvl at Kannan level) | `src/core/stats.ts`, `sim.ts`, `src/meta/runRewards.ts`, `stall.ts`, HUD | One level bar, persists across runs; no gear you cannot equip |
| 8 | **Beat picks** (H): replace mid-fight level-up pause with beat-time 1-of-3 pick | `src/core/sim.ts`, `cards.ts`, UI offer sheet | No pause mid-fight; a pick appears at calm beats |
| 9 | **Materials loop** (H): drops by enemy kind, route-stop pickups, HUD pickup text, `masala` added | `src/meta/runRewards.ts`, `types.ts`, `gear.ts`, `src/core/sim/enemies.ts` | Kills drop flour/ghee/onion/masala visibly; counts in stall |
| 10 | **Stall bench** (S): themed enhancements (season tawa +1..+15, re-roll affix with ingredient, patch cloth) spending materials; never destroys items | `src/meta/gear.ts`, new `src/meta/bench.ts`, hub UI | Spend masala + ghee to upgrade the tawa and see its stat change |
| 11 | **Status look: chill/freeze/spicy** (S): statuses drawn on the enemy (tint, particles, posture); no icon or ice block | `src/core/status.ts`, `types.ts`, `src/game/phaser/fx.ts`, `actors.ts` | Mint chills visibly; spicy enemies sweat; no corner icons |
| 12 | **Dip supports data** (H): `supportEffect` on dips, mint chill->freeze, curry spicy DoT, tags and link bonus | `src/content/dips.ts`, `src/core/dipLinks.ts`, `sim/hit.ts` | Link mint to a roti: enemies slow, then stiffen |
| 13 | **Masala sneeze cloud** (H): zone effect with stagger/miss | `src/core/sim/shots.ts`, `status.ts`, `fx.ts` | Masala hit leaves a cloud; enemies sneeze |
| 14 | **Roti flakes** (S): flake shot type, stick/crumble rules, cap 12, dip-typed flakes | `src/core/sim/shots.ts`, `hit.ts`, `breads.ts`, `fx.ts` | Tissue roti sheds crumbs that burst when another hit lands |
| 15 | **Moving stall as component** (S): stall layout/art reads `save.stall` (wheels, awning, tawa); upgrades through bench | `src/meta/types.ts`, `src/game/phaser/stall.ts`, hub | Stall on the street shows a visible upgrade |
| 16 | **Retire waves** (H): delete wave HUD/paths from normal play, keep Test Kitchen on fixed spawns | `waves.ts` users, `src/game/ui/*`, `kitchen.ts` | No wave counter anywhere; kitchen still works |
| Later | **PvP stall-vs-stall** (S+): second stall lane in the same strip, seeded rounds | new `src/core/pvp.ts` | Needs the login wall and a server; plan after slice 15 |

## Dependencies
1->2,3,4; 4->5,8; 6 before 7 and 5; 7->8,9; 9->10; 11 before 12,13; 12 before 14. Slices 1-3 and 11 can run in parallel; 6 is the gate for any meta change. Each slice touches few shared files; the lead merges between slices.

## Save migration (g) rules
- `migrate` v2->v3 is pure and idempotent; unknown fields are dropped only if defaulted.
- `stallXp` -> `kannanXp` 1:1 (levels recomputed from a new curve that is no lower than the old stall level).
- Beats are derived from existing progress: any chapter with `bossAttempts >= 3` marks that chapter's beats done; `prologueSeen` marks the prologue beat; unlocked rotis/dips/gear stay unlocked (never re-lock).
- Keep a copy of the v2 blob under a backup key for one release.

## Owner questions (closed choices)
1. In-run cards: (a) at calm story beats, 1-of-3 **(recommend)**, (b) keep level-up pop-ups per run, (c) remove cards until gear/story settle.
2. Route shape: (a) linear route of the 5 places with 1-2 junction choices **(recommend)**, (b) fully linear, (c) free choice of district from a map.
3. Stall speed: (a) fixed steady cruise, slowing only at beats **(recommend)**, (b) player controls speed, (c) auto speed scaled to pressure.
4. Freeze look: (a) stiff, shivering enemy with frost rim and breath **(recommend)**, (b) frost overlay only, (c) skip freeze, chill slow only.
5. Open-world ambition: (a) A now, design B later **(recommend)**, (b) go straight to B, (c) stay arena-only.
