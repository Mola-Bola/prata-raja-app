# RPG systems from new decompilations (14 Oct 2026)

Scope: dips in rotis, perks/badges, crafting/forging, spec tree, weapon mastery, shops. Repos already in `decomp-mechanisms.md` and `arpg-refs.md` are skipped. Source read via `gh api` at file level. Items marked *unverified* come from search snippets or are design guesses.

Licence rule for all below: none of these is a licensed port. We study the data shapes and maths, then re-implement in our own TS. Nothing copied. ACreTeam/ac-decomp is CC0-1.0, but we still treat it as study-only.

Coverage gaps (honest):
- Paper Mario TTYD, Golden Sun, EarthBound, Mario & Luigi, Dragon Quest, Kingdom Hearts: no public decomp found. WebSearch returned none, and the 120-repo `decomp`/topic list had none. Not verified as nonexistent.
- Kirby 64 (Kirby64Ret/kirby64): tree has no copy-ability or shard-mix code. Skipped.
- Badge BP budget and forging chance tables: no source evidence in this set. Stays design-only (*unverified*).

## 1. Kinstone fusion (shape-matched pairs) — zeldaret/tmc
- Files: `src/menu/kinstoneMenu.c` (`KinstoneMenu_Type3_Overlay1`, `KinstoneMenu_Type5_Overlay0`), `src/kinstone.c` (`sub_08018710`, `sub_08018738`), `include/kinstone.h` (`FuseInfo`, `FusionState`, `KinstoneWorldEvent`, `KinstoneId` enum).
- Data: each kinstone row in `gKinstoneWorldEvents` has a `shape` field. Table file not located in the tree (*unverified* location; field use confirmed).
- Algorithm: fuse allowed only if the partner's `shape` equals the held kinstone's `shape`; otherwise a rejection sound and back to menu. On success, set one bit in `gSave.kinstones.fusedKinstones` and bump `fusedCount`; past 99 sets `didAllFusions`.
- World state is re-derived from the bitset per area/room (`sub_08018738` checks `CheckKinstoneFused`), so saves stay small.
- Status: unlicensed; no LICENSE file in repo.
- Prata Raja: dips carry a `shape` (flavour family). Two same-family dips fuse into a rarer dip. Store fusion discovery as a bitset; completion count drives a stall reward. Keep `shape` in data, not code.

## 2. Cooking and crit rolls — zeldaret/botw
- Files: `src/Game/Cooking/cookManager.cpp` (`cookCalcCritBoost` l.128, `cookHandleCrit` l.222, `cookFail` l.87, `cookCalcRecipeBoost` l.1015, `init` l.606), `src/Game/Cooking/cookManager.h`, `src/KingSystem/Resource/Actor/resResourceRecipe.h`.
- Crit threshold: max of per-ingredient `cookSpiceBoostSuccessRate` + `mIngredientNumSuccessRates[n-1]` (default `5*n`), then one 0-99 roll.
- Crit target: the stat that is least maxed gets the bonus (life, vitality, or time). If one is maxed, roll between the other two. Monster Extract bypasses the roll.
- Effect table: each effect has `min`, `max`, `ssa` (per-ingredient step), read from config (l.719).
- Failure is still an item: "dubious food" gets a recovery floor; "rock-hard" gets a fixed low recovery and a lower sell price.
- Status: unlicensed; Nintendo-owned game data in the repo's asset-free build.
- Prata Raja: roti/dip craft = base + per-ingredient step (masala, ghee, flour each add a step). Crit adds to the least-maxed of {damage, durability, time}. Failed fry = weak floor item, never zero. Ties directly into forge/enhance without a new RNG stream.

## 3. Bonds and weapon ranks — FireEmblemUniverse/fireemblem8u
- Files: `src/bmreliance.c` (`UnitGainSupportExp` l.88, `GetUnitSupportLevel`), `include/bmreliance.h`, `src/bmreliance-data.c`, `src/data_supports.c` (per-character tables), `src/bmunit.c` (`UnitAutolevelWExp` l.745), `src/bmitem.c` (`GetWeaponLevelFromExp` l.627), `include/constants/items.h` (`WPN_EXP_*`).
- Support: per pair, `supportExpBase[i]` and `supportExpGrowth[i]`. Each event adds growth, capped at the next threshold. Levels: >80 C, >160 B, >240 A. Affinity bonus rows (`gAffinityBonuses`) add flat stats by affinity and level. Max 5 active supports, bonus only within distance 3.
- Weapon rank: `unit->ranks[wType]` per weapon kind. Thresholds E=1, D=31, C=71, B=121, A=181, S=251. Some items need weapon rank before use (`IA_REQUIRES_WEXP`).
- Forging: none in FE8 (no crafting). Not verified in later FE titles.
- Status: unlicensed; Nintendo IP.
- Prata Raja: (a) a per-regular or per-companion bond = base + growth, capped per tier, unlocking flat bonus rows. (b) mastery per roti kind on E..S thresholds (1/31/71/121/181/251 is a good curve to start from, retune ours). (c) gate tier-3 rotis behind A/S rank.

## 4. Stall tiers and goods bands — ACreTeam/ac-decomp
- Files: `src/game/m_shop.c` (`mSP_PlusSales` l.1265, `mSP_GetRealShopLevel` l.1312, `mSP_GetGoodsPercent` l.1324, `mSP_DecideUniqueCommonList` l.1497, `mSP_ItemNo2ItemPrice` l.649), `include/m_shop.h` (thresholds, list enums).
- Tiers: one sales counter. Unlocks at 3000 / 8000 / 12000 (item gates), shop upgrades at 25000 / 90000 / 240000. `mSP_PlusSales` clamps the stored sum to the current tier's ceiling, so you cannot bank past the next upgrade.
- Goods bands: signed `goods_power` shifts the split. Rare = power+5, uncommon = rare+35, common = remainder. Negative power is mirrored.
- Variety: each category takes one random ABC priority order from 6 fixed candidates, once per period, instead of re-rolling every item.
- Price: per-item table with a year-dependent branch at the top of the function.
- Status: CC0-1.0 per repo (study-only by our rule).
- Prata Raja: stall upgrade on one clamped sales counter; goods bands weighted by reputation (the goods_power analogue); a 6-permutation order gives weekly variety with no extra RNG.

## Not used (checked)
- zeldaret/botw cooking is the closest thing to crafting in this set. No forging or enhancement chance table found there.
- Spec tree: no node-graph allocation code in TMC, FE8 or AC. Stay with `arpg-refs.md` (PoB, d3-hierarchy).
- Mastery and drop rates in TMC: not checked.

## Top 5 ideas (ranked)
1. **Shape-matched dip fusion, bitset discovery** (TMC). Cheap, collectible, data-only. Good first slice.
2. **Crit to least-maxed stat** (BotW). Makes roti/dip crafting feel smart without extra stats. Pairs with masala/ghee/flour steps.
3. **Weapon-kind mastery on E..S thresholds** (FE8). Gives weapon mastery a visible ladder with gated tiers.
4. **Single clamped sales counter for stall tiers, goods-power band split** (AC). Simple, testable upgrade path for the shop.
5. **Base + growth bonds with capped step and affinity rows** (FE8). Companion or regular bonds; reuses the same threshold code as idea 3.
