# Decomp mechanisms: status audit (14 Oct 2026)
Checked against `docs/research/decomp-mechanisms.md` (5 sections) and DIRECTION.md (Direction 2.0: flow, no waves, ARPG gear). Paths are under `src/`.
Flow director (`core/director.ts`) is live; `core/waves.ts` remains only as keyframe rows and the Test Kitchen `waves` mode.

| Mechanism | Source repo | Status | Evidence / file | Fit | Effort |
|---|---|---|---|---|---|
| **1. Damage, stats, status, RNG** | | | | | |
| Staged damage pipeline, tenths, per-stage trace | pokeemerald | PARTIAL | `core/sim/hit.ts` hitEnemy is one monolith; `core/stats.ts` rollHit covers base x mods x crit x takenMul only, floats, no trace, no roll variance | H | M |
| Stat-stage table -6..+6 | pokeemerald | NOT DONE | no stage table in `core/status.ts` or `core/stats.ts`; burn/chill/tender are flat per-hit numbers | M | S |
| Crit tiers (1-in-N), crit ignores debuffs | pokeemerald | PARTIAL | `core/stats.ts` rollHit: additive critChance; `core/soak.ts` rotiCrisp adds crisp tag; no tier table | M | S |
| Held items as {trigger, param} rows | pokeemerald | PARTIAL | `content/dips.ts` level rows + `core/status.ts` applyHitEffect switch; `core/dipLinks.ts` linked combos; no trigger enum | H | S |
| Armour: flat DT then %DR; derived stats | fallout2-re | PARTIAL | only `dmgTakenPct` (`core/statRegistry.ts:48`) and dodge (`core/sim/ctx.ts:61`); no flat DT, no derived stats | M | S |
| Named RNG streams, fixed draws per action | pokeemerald | PARTIAL | one `rngState` threaded in `core/sim.ts` (l.59, 148): replay-from-seed works; `core/rng.ts` is a single stream | M | M |
| **2. Loot, affixes, items** | | | | | |
| Fixed affix slots by quality | devilution | DONE | `meta/gear.ts` RARITY_INFO.affixes (0/0/1/2/3/4) | - | - |
| Affix eligibility window ilvl/2..ilvl | devilution | NOT DONE | `meta/gear.ts` AFFIX_POOLS have no minLvl; rollItem ignores level | H | M |
| Magic chance blended with ilvl | devilution | PARTIAL | flat rarity weights (`meta/gear.ts` RARITY_INFO.weight), no level shift | M | S |
| Curse gate (opt-in hard pool) | devilution | NOT DONE | no cursed flag in `meta/types.ts` or `meta/gear.ts` | L | M |
| Value bands (roll to range, named tiers) | devilution | PARTIAL | named rarities and colours; each affix value is fixed in AFFIX_POOLS, no roll bands | H | M |
| Uniques: once-per-run rule hook | devilution | NOT DONE | no UniqueDef; "unique" only in `ext/types.ts` | H | M |
| Seed per item, regenerable {seed, ilvl, v} | devilution | PARTIAL | GearItem stores random uid + affixes, not seed; save has `v` (`meta/types.ts`) | H | S |
| Per-kill drop table | devilution | PARTIAL | `meta/chests.ts` rollChest pity; kill coin 15% in `core/sim/hit.ts` killEnemy; no per-kill table | M | S |
| Cursed-until-cleared sticky items | pmd-red | NOT DONE | none | L | M |
| **3. Swarms, spawning, projectiles** | | | | | |
| Spawn points with per-point cooldown | pikmin2 | OBSOLETE | wave budget in `core/waves.ts`; flow director `core/director.ts` replaces it for live play | L | - |
| Attack tokens (team budget) | prime | PARTIAL | `core/director.ts` CREDIT_CAP / LIVE_CAP cap total threat; no melee or shooter attacker slots | H | M |
| Perception: lastSeen, out-of-sight count | REDRIVER2 | NOT DONE | enemies walk fixed lanes to reachY (`core/sim/enemies.ts` walk); no target memory | L | M |
| Damage queue, shield first, once per tick | pikmin2 | PARTIAL | shield-before-HP in `core/sim/hit.ts`; damage applied inline per hit; player contact batched (`enemies.ts` contactAcc); no shield regen | H | M |
| Projectile segment sweep | prime | DONE | `core/sim/shots.ts` contactAt (l.28, 191), continuous sweep | - | - |
| Per-projectile hit set | pikmin2 / prime | DONE | `core/sim/throw.ts` base() `hit: []`; `shots.ts` straightHit pushes s.hit | - | - |
| Homing: arm time, turn limit, min distance | prime | PARTIAL | `core/sim/shots.ts` steer(): turn-rate limit (HOMING_TURN) only | M | S |
| Shockwave: accelerating radius, hit-once | prime | PARTIAL | wave bar sweep in `shots.ts` (l.237); no accelerating radius | L | S |
| Packs follow leader position trail | pikmin2 | NOT DONE | no position history on enemies | M | M |
| **4. Game feel and actor states** | | | | | |
| Enemy idle window, lunge-only hitbox, recovery | mm | PARTIAL | `core/sim/enemies.ts`: walk, attack at reachY, escape; no idle window or recovery | M | S |
| Hitbox off after being hit (free i-frames) | mm | NOT DONE | no hit-disable on enemy contact | M | S |
| Glide-back knockback with decel | mm / papermario | DONE | `core/knockback.ts` remainingKnockback; applied `core/sim/enemies.ts` l.197-201 | - | - |
| Hurt-counter knockback tiers, delayed invuln | sm64 | PARTIAL | knock = bread stat x knockbackTaken (`hit.ts`); CC_IMMUNITY 3 s (`status.ts`); no damage-tiered knockback | M | S |
| Per-attacker i-frames with severity | sotn | PARTIAL | orbit bite timer per enemy (`shots.ts` orbit s.hit); no element frames or severity | L | S |
| Star-burst damage popup | papermario | PARTIAL | `game/phaser/fx.ts` pop scale (l.316, 357); no burst or ring | M | S |
| Clean Flip timed-input window | papermario | NOT DONE | dodge is a rolled chance (`core/sim/ctx.ts:61`); no timed input | M | M |
| **5. Bosses and patterns** | | | | | |
| Phase gating with timeout (harsher phase) | th06 | PARTIAL | `core/sim/boss.ts` bossPhase on hp only; `content/bosses.ts` phases [0.5]; no maxSec | H | S |
| HP-scaled params, enrage | th06 | PARTIAL | `boss.ts` l.91 cooldown x (1 - phaseHaste x phase); no continuous lerp, no enrage | M | S |
| Generic Emitter, data-driven attacks | th06 | PARTIAL | `core/types.ts` l.224-230 five fixed kinds (volley, charge, summon, rain, sweep); no ring, fan, spiral | H | M |
| Difficulty multiplier table | th06 | NOT DONE | no easy/normal/hard; only chapter hpPerWave | L | S |
| ~1.7 s telegraph, boss i-frames on hit | ReC98 | PARTIAL | tells 0.8-1.2 s (`content/bosses.ts`), `core/sim/danger.ts`; no boss hit i-frames | M | S |
| Phase change clears bullets, drops items | ReC98 | NOT DONE | bossPhase emits an event only (`boss.ts` l.44-49) | M | S |
| Arena intro/outro as a step list | sotn | NOT DONE | intro flags in `core/sim.ts` only | L | M |

## Top 6 to build next (by fit to Direction 2.0, then effort)
1. **Dip trigger rows (S, H).** Add `trigger` enum + `param` to dip level rows in `content/dips.ts`; `status.ts` applyHitEffect and `hit.ts` killEnemy switch on trigger. Gives socket and link rules a data path.
2. **Gear seed + ilvl window + value bands (M, H).** GearItem gets {seed, ilvl, v}; rollItem draws affixes whose minLvl sits in ilvl/2..ilvl; each affix rolls a band. Feeds enhance/forge without level gates on drops.
3. **Uniques as once-per-run rule hooks (M, H).** UniqueDef {baseId, minLvl, ruleHook, oncePerRun}; seeded uniform pick (fixes the original last-entry bug); hook consumed in `sim/hit.ts`.
4. **Boss Emitter + timeout phases (M, H).** One Emitter {shape: ring/fan/spiral/aimed, count, step, speed} replaces the five kinds in `types.ts` l.224-230; phase {endHp, maxSec}, timeout = harsher phase; lerp attack params on hp fraction.
5. **Attack tokens on the flow street (M, H).** `director.ts` caps simultaneous melee and shooter attackers; enemy holds a token to lunge or fire, released on death, id tie-break.
6. **Staged hit pipeline + named RNG streams + crit tiers (M, H).** Split `hitEnemy` into pure stage functions with a trace; split `core/rng.ts` into combat/crit/loot/cosmetic streams; crit tier table in `stats.ts`. Foundation for 1-5, so it can go first if balance needs trace data.

Notes: Not in the decomp list but NOT DONE against direction: spec tree (`ui/stall/StallHub.tsx` l.84 "tree coming soon"; specPoints accrue in `meta/kannan.ts`) and dip sockets (no link-slot system, per the comment at `meta/kannan.ts` PERKS).
DONE items outside the list that fit direction: forge/merge3 and upgradeItem (`meta/gear.ts`), recipes (`meta/recipes.ts`), Test Kitchen (`core/kitchen.ts`), soak/crisp (`core/soak.ts`).
