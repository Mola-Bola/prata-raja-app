# Mechanisms from game decompilations (13 Oct 2026)

Five Haiku readers went through public decompilation repos (GitHub topic `decompilation`) at source level. We rebuild the ideas our own way; nothing is copied. "Unverified" marks values taken from summaries rather than read line by line. Frame rates are assumed where noted.

## Ranked rebuild slices (feed ROADMAP)
1. **Damage core**: one pure staged `hit.ts` pipeline (integer/tenths math, per-stage trace), named RNG streams, one -6..+6 stage table for buffs/debuffs, dips/drinks as data rows (trigger enum + param). Foundation for 2-5.
2. **Boss scripts as data**: one generic Emitter (ring/fan/spiral/aimed), phases end on HP *or* timer (timeout = harsher phase), HP-lerped attack params, per-difficulty multiplier table, ~1.7 s telegraph before first shot.
3. **Fair crowds**: attack tokens (cap simultaneous melee/shooters), projectile segment sweep + per-projectile hit set (no tunnelling, no double hits), damage events queued and applied once per tick with shield before HP, trail-following packs.
4. **Feel**: glide-back knockback with decel, recovery i-frames by disabling the enemy hitbox, lunge-only enemy hitbox after a random idle window, Clean Flip timed-input window, star-burst damage popups.
5. **Gear**: affix eligibility window ilvl/2..ilvl, fixed affix slots by quality, items stored as {seed, baseId, ilvl, version}, uniques as once-per-run rule hooks, curses only in an opt-in hard pool.

## 1. Damage, stats, status, RNG (pret/pokeemerald, alexbatalov/fallout2-re)
- **Damage pipeline** (`pokemon.c` CalculateBaseDamage; `battle_script_commands.c` Cmd_damagecalc, Cmd_adjustnormaldamage, ModulateDmgByType): base from level/power/A/D → situational halvings (burn, screens, spread), floor 1 → x crit x move multipliers → random roll 85-100% → type multiplier in tenths (0/5/10/20) → survive-at-1 item check. Rebuild: `src/core/sim/hit.ts` as one pure function with named stages, tenths fixed-point, low-variance roll, trace for balance debugging.
- **Stat stages** (`gStatStageRatios`): -6..+6, +n = (10+5n)/10, -n inverse. Rebuild: one 13-entry table for burn/chill/tender and dip/drink buffs; symmetric, integer-exact.
- **Crit** (`Cmd_critcalc`, `sCriticalHitChance` {16,8,4,3,2}): additive crit tiers into a 1-in-N table; on crit ignore attacker's own debuff and defender's own buff. Rebuild: dips/drinks add crit tiers, no per-item formulas.
- **Held items**: read hold-effect enum + param once per action; flat multipliers or a chance check. Rebuild: dips/drinks are data rows {trigger, param}; a signature bread + dip combo = two rows sharing a trigger.
- **Fallout 2 armour** (`combat.c` compute_damage): flat threshold DT first, then % DR; derived stats one line each (`stat.c` stat_recalc_derived); to-hit capped 95. Rebuild: optional defence model for stall gear; derived stats keep the job tree legible.
- **RNG**: pokeemerald 32-bit LCG with u16 seed (manipulable: one global stream, cheap enumeration); Fallout ran1 + shuffle table. Rebuild: split World RNG into named streams (combat, crit, loot, AI, cosmetic) seeded by hash(runSeed, name); fixed draw counts per action so cosmetic changes never desync replays.
- Status durations (sleep/paralysis/freeze) not verified.

## 2. Loot, affixes, items (diasurgical/devilution, pret/pmd-red)
- **Affix window** (`items.cpp` GetItemPower, GetItemBonus): eligible when ilvl/2 <= affix.minLvl <= ilvl; weighted pick, some entries double-weighted. Rebuild: "level L rolls affixes from L/2 to L"; fixed slots (Fine = 1, Prized = 2).
- **Magic chance** (SetupAllItems): ~10% + ilvl% blend. Rebuild: flat per-tier table shifted by stall level.
- **Curse gate**: 2/3 of rolls only draw "good" affixes. Rebuild: curses opt-in (hard runs / cursed stall).
- **Value bands** (RndPL, PLVal; PL_Prefix/PL_Suffix tables): roll band → linear map to value range; higher ilvl unlocks higher bands. Rebuild: named tiers (Fine/Good/Great) shown as a bar.
- **Uniques** (CheckUnique, UniqueItemList): chance gate, filter by base + min level, skip already-dropped; the original pick loop always returns the last eligible entry (bug) — use a seeded uniform pick. Rebuild: unique = base item + rule-change hook, once per run.
- **Seed per item** (SetRndSeed(iseed)): (baseId, ilvl, seed) regenerates the item. Rebuild: store {seed, ilvl, baseId, version} in saves; tiny saves and shareable codes.
- **Drops** (RndItem): 60% nothing, ~30% gold, ~10% item, level-gated weighted pick. Rebuild: readable per-kill table.
- pmd-red `dungeon_items.c` CreateFloorItems / CreateItemWithStickyChance: weighted per-floor tables, per-floor sticky chance; item_data.json keys category, spawnAmountRange, aiFlags. Rebuild idea: "cursed until the stall is cleared".
- Schema sketch:
```ts
type Quality = 'fine' | 'prized' | 'legend';
interface AffixDef { id: string; name: string; slot: 'prefix' | 'suffix'; stat: string; minItemLvl: number; weight: number;
  bands: { roll: [number, number]; value: [number, number] }[]; cursed?: boolean }
interface UniqueDef { id: string; baseId: string; minLvl: number; ruleHook: string; oncePerRun: true }
interface GearInstance { seed: number; baseId: string; ilvl: number; quality: Quality; affixIds: string[]; unique?: string; v: number }
```

## 3. Swarms, spawning, projectiles (projectPiki/pikmin2, PrimeDecomp/prime, OpenDriver2/REDRIVER2)
- **Spawn points** (pikmin2 `gameGenerator.cpp` Generator::generate, informDeath): one live creature per point, respawn after a cooldown. Rebuild: waves.ts spawn points {type, remaining, cooldownWaves, liveRef} at lane entrances.
- **Team budget** (prime `CTeamAiMgr.hpp`: max melee/projectile attackers, per-type intervals, SpacingSort; header only): Rebuild: attack tokens — an enemy must hold a melee/shooter token to lunge/fire; release on death; tie-break by id.
- **Perception** (prime `CAi.hpp` predicates; REDRIVER2 `cop_ai.c` lastKnownPosition, OutOfSightCount): Rebuild: nearest seen target; on loss walk to lastSeen and give up after a count; predicates as data.
- **Damage queue** (pikmin2 `enemyBase.cpp` addDamage, `enemyInteractBattle.cpp` InteractAttack::actEnemy): damage accumulated and applied in update; one swing hits once; per-state damage coefficient. Rebuild: queue {amount, type, sourceId, projectileId}, dedupe, apply once per tick: shield absorbs first, overflow to HP, shield-break event, regen after a no-hit delay.
- **Projectiles** (prime `CGameProjectile.hpp`, `CBeamInfo.hpp`, `CShockWave.cpp`): previous-position segment sweep; homing with arm time, turn limit and min distance; touched set prevents repeat hits; shockwave radius with accelerating expansion, hit-once flag. Rebuild schema for sim/throw.ts: {speed, accel, homingTurnRate, homingArm, homingMinDist, pierce, bouncesLeft, lifeT, radius, ownerId, dmg, prevPos, hitSet}.
- **Packs** (pikmin2 `aiTeki.cpp` footprint trail): followers chase a ring buffer of the leader's recent positions; slot rings sorted by id; neighbour checks only within a lane-width grid bucket.
- halo-re/halo has no AI/projectile code in the public tree.

## 4. Game feel and actor states (zeldaret/mm, pmret/papermario, n64decomp/sm64, Xeeynamo/sotn-decomp)
- **Enemy states** (mm `ovl_En_Tite/z_en_tite.c`): random idle 0.75-1.5 s → hop attack with hitbox only while airborne → land-recover; hitbox off after being hit until landing (free i-frames); red hurt filter 0.4 s; freeze 2 s (MM ~20 fps assumed). Rebuild: pests' contact damage only during a telegraphed lunge; hit disables their hit-test during knockback.
- **Knockback** (mm func_80894B2C: speed -6, eased decel; papermario `action_knockback.c`: 18-frame glide back + polynomial arc). Rebuild: glide-back with decel owned by the sim, shown by the renderer.
- **Damage as accumulator** (sm64 `interaction.c` take_damage_from_interact_object, determine_knockback_action): hurt counter, knockback tier by damage, delayed invincibility flag. Rebuild: tiers pick knockback strength; enemies that must not chain-hit get a short invincibility.
- **Per-attacker i-frames** (sotn `st0_hit_detection.h`, summary, unverified): per-attacker counters, element-specific frames, severity bits by HP vs damage. Rebuild: a throw cannot re-hit the same pest; severity drives flash strength.
- **Damage popup** (papermario `effects/damage_indicator.c`): star burst, count = min(damage, 20) + 1, ring placement, shrinking offsets, scale table peaking ~2.4x, ~100-frame life. Rebuild: renderer-only burst triggered by a sim event.
- **Timed input** (papermario `battle/action_cmd/jump.c`, `action_cmd.c` check_block_input): prompt 2 frames before a short window, early press fails, mashing in the prior 10 inputs blocks success. Rebuild: Clean Flip window before a hit lands; deterministic in the sim, prompt in the renderer.
- Hit-stop and shake magnitudes: not verified here (sm64 shake tiers exist in camera.c).

## 5. Bosses and patterns (GensokyoClub/th06, nmlgc/ReC98, Xeeynamo/sotn-decomp)
- **Phase gating** (th06 `EnemyManager.cpp` HandleLifeCallback, phase timer block): a phase ends at an HP threshold or when its timer runs out; timeout flagged separately. Rebuild: Phase {endHp, maxSec}; timeout gives a harsher phase, not a free win.
- **HP-scaled params** (th06 `EnemyEclInstr.cpp` Flandre final): speed, interval and aim width interpolate on remaining HP; a long phase forces the most aggressive setting. Rebuild: lerp(hpFrac, calm, aggressive) per attack + enrageAfterSec.
- **Emitters** (th06 `BulletManager.cpp` SpawnSingleBullet, SpawnBulletPattern): ring angle = i*2pi/count + wave*step + offset (spiral when step != 0); offset ring adds half a step; fan alternates around a centre; aimed variants add the angle to the player; speed ramps linearly across waves. Rebuild: one Emitter type drives every boss attack.
- **Difficulty** (th06 difficulty checks): counts/colours vary by difficulty. Rebuild: {countMul, speedMul, telegraphMul} table per chapter/difficulty.
- **Phase FSM and telegraph** (ReC98 th04 boss.cpp, th01 boss.hpp; summaries, unverified): spin-up ~100 frames before firing, phase change clears bullets and drops items, ~40 hit-invincibility frames. Rebuild: ~1.7 s telegraph; short boss i-frames.
- **Arena steps** (sotn `st/rnz1/bossfight.c`, summary): intro/outro as a step list on flags. Rebuild: keep cutscene steps out of the combat FSM.
- Schema sketch:
```ts
type Emitter = { shape: 'ring' | 'fan' | 'spiral' | 'aimedFan' | 'random'; count: number; waves?: number; waveEvery?: number;
  step?: number; offset?: number; speed: [number, number] };
type Attack = { id: string; telegraph: { sec: number; visual: 'lane' | 'ring' | 'flash' }; emit: Emitter[]; recoverSec: number };
type Phase = { endHp: number; maxSec?: number; attacks: string[]; enrage?: { speedMul: number } };
type BossScript = { holdY: number; phases: Phase[]; attacks: Record<string, Attack>;
  diff: Record<'easy' | 'normal' | 'hard', { countMul: number; speedMul: number; telegraphMul: number }> };
```

## Sources (repos)
pret/pokeemerald · alexbatalov/fallout2-re · diasurgical/devilution (reconstruction, Sustainable Use licence: reference only) · pret/pmd-red · projectPiki/pikmin2 · PrimeDecomp/prime · OpenDriver2/REDRIVER2 · zeldaret/mm · pmret/papermario · n64decomp/sm64 · Xeeynamo/sotn-decomp · GensokyoClub/th06 · nmlgc/ReC98. Index: https://github.com/topics/decompilation
