# More decompilations: loadout, sockets, mastery, job records (14 Oct 2026)

Scope: repos NOT in decomp-mechanisms.md, decomp-rpg-systems.md or decomp-scrolling-flow.md. 33 You.com queries (19 + 14 refinements) plus `gh api` metadata and tree reads. Paths are repo-relative. Study and re-implement only; nothing copied. "Unread" = seen in a search or tree only.

## Repos read

**1. doldecomp/ttyd** · MIT · WIP matching decomp, Paper Mario TTYD (C), pushed 27 Sep 2026
- System: badge loadout under a BP budget.
- Files: `src/mario/mario_pouch.c` (badges[], equippedBadges[] of 200 slots, availableBP/maximumBP; recalc near l.425-435; pouchEquipBadgeID ~l.336); `include/data/item_data.h` (ItemData.bp_cost at 0x1C); `src/battle/battle_item_data.c`; `src/event/evt_badgeshop.c`.
- Borrow: availableBP = maximumBP minus sum of bp_cost over equipped slots, recomputed on every equip change. The loop subtracts every slot, so the null item must cost 0. Max BP starts at 3.
- Fit (perk budget, H): exactly the "perk budget" shape. Prata: `perkBudget = base + tier`, `cost` on each perk row, recalc in one function, empty slot = cost 0.

**2. ThePhrozenKeep/D2MOO** · MIT · reimplementation of Diablo II with mod patching (C++), pushed 13 Oct 2026. Blizzard IP: re-implement only.
- System: sockets rolled at item creation.
- Files: `source/D2Game/src/ITEMS/Items.cpp` (~l.169-220: quality gate, socket cap by item class capped 3/4/6, normal items get `seed % max + 1` sockets, stackables skipped; ~l.886-898 socket flag from drop flags); `source/D2Common/src/Items/Items.cpp` (ITEMS_CheckIfSocketable ~l.2852); `source/D2Common/src/Items/ItemMods.cpp`; `source/D2Common/src/Items/Items.cpp` (socket insertion ~l.6669, gems live as child inventory items).
- Borrow: socket count is a fact of the item's own seed, not a player choice. Gate on quality tier first, then cap by item class.
- Fit (dip sockets, H): Prata sockets as `{seed, ilvl, tier}` -> `sockets = seed % cap + 1` only for Good+ gear. Dips are child rows, not stats. Matches the "items as {seed, ...}" slice in decomp-mechanisms.

**3. jjolmo/som-decomp** · GPL-3.0 · notes plus Python tools for Secret of Mana (SNES), pushed 5 Oct 2026. Re-implement only (copyleft).
- System: weapon mastery and drop tables, both data-first.
- Files: `tools/weapon_level.py` (model of ROM $C0:4358; per-weapon progress; kill gives A6 = 9 - weapon_level, halved if monster is lower level; killer gets A6, the other living heroes get half; cap = orbs[type] + 1; threshold 99, at cap progress = 0); `data/weapon_levels.json`; `data/drops.json` (5-byte drop rows, chance_64, p_chest, kill_class_table); `data/monsters.json` (fixed-width records, id + level + drop_row); `tools/hero_stats.py`, `tools/rng.py`.
- Borrow: mastery = per-weapon progress counter whose cap comes from an upgrade counter the player owns. The killer gets full progress and the rest of the party half. Drops are a compact per-monster row with a 64ths chance and a kill-class table.
- Fit (forge mastery, H): `masteryCap = forgeTier + 1`; progress per kill, split by who landed it. Per-kill drop table: one row per monster, weights out of 64. Mark the ROM quirk (level-up message reuses scratch byte) as a bug to avoid.

**4. charlie-troy/ffta-decomp** · no licence (study only) · Python tools and docs for Final Fantasy Tactics Advance (GBA), pushed 8 Oct 2026. Not the 1997 PSX FFT.
- System: job table with redirect records.
- Files: `docs/job-table.md` (116 records x 0x34 bytes; accessor redirects through record byte +0x05: 0x00 = read self, 0xFF = read fallback job, any other = read that job; field 0x02 is never redirected; cyclic or out-of-range redirects are invalid); `docs/ability-table.md`; `tools/job_getters.py`, `tools/validate_job_fields.py` (checks every formula against all records).
- Borrow: a record can point at another record for a field and fall back to a default. Validation walks every record and rejects cycles.
- Fit (spec tree = FFT jobs, H): a spec node can inherit a stat or ability from another node; `resolveNode(id, field)` with a depth limit; a validator run in tests. Prata: `resolve()` plus a cycle test in `src/core/` tests.
- Unread: FFT-1997 (FFT-RE/FFT-1997-Decomp, no licence). Job code was not found in the tree; only the music folder matched.

**5. Prof9/MegaManBCC-ChipControl** · MIT · ARM asm mod of Mega Man Battle Chip Challenge, free chip choice, pushed Jun 2022.
- System: folder/deck choice versus random draw.
- Files: `asm/battle_deck.asm` (hooks the program-deck draw function and pre-deck handler; disables autoplay during deck pick); `asm/battle_chip.asm`, `asm/battle_reroll.asm`, `asm/battle_hp.asm`; `address_en.asm`.
- Borrow: a deck is a choice screen that replaces a random draw. Reroll is a separate, explicit action.
- Fit (MMBN folder = loadout, M): Prata's stall loadout as the picker, with reroll as a paid action and the random draw as the fallback. Mod-level only; no core logic to copy.

**6. celophi/lom-decomp** · MIT · matching decomp of Legend of Mana (PS1), pushed 14 Oct 2026.
- System: shop overlay.
- Files: `src/overlays/shop/shop_trade.c`, `shop.c`, `shop_render.c`, `shop_text.c`; `tools/data/overlays/shop.py` (extracts SHOP.BIN to YAML); `tools/data/overlays/tests/test_shop_*.py`; `docs/en/technical/reference/shop-resources.md`.
- Borrow: shop data is extracted to a YAML table and tested with a source-of-truth check. No item-synthesis code found by search.
- Fit (shops, M): one `stock: [{id, price, stockMax}]` table per stall, plus a test that the table is well-formed.

## Searched, not read

- **dqix-decomp** (DQIX/dqix-decomp, Unlicense, DS): 551 tree files, none for job, monster, shop or synthesis. Graphics only. Low fit.
- **keatongreve/goldensun-decomp** (no licence, GBA): Djinn set/field code under `asm/battle_anim/djinn_set`, `asm/field/djinni`. Class-change logic not located. Unverified.
- **StraDaMa/mmbn-chip-tables** (no licence): BN1-6 chip tables as armips `.asm` with per-game macros. Record layout not read.
- **JianxinLin28/mhfu-gear-simulator** (MIT, JS, fan tool; repo was found under Kolyn090): `main.js` pipeline is required skills, then valid armours, then discard outclassed armours, then insert decorations, then categorize. Files `src/decoration_inserter.js`, `src/equipment_processor.js` are referenced by `main.js`. Good for the solver idea (below).
- **SiD3W4y/mhfu-re** (PSP, last push 2022): no decoration or slot files in the tree.
- **j13343sh/Rune-Factory-Inheritance-Research**: observation notes on equipment inheritance candidate counts and probability. Not a decomp. Useful as a model for "pick one of N candidates" forge odds.
- **harvestwhisperer/hm64-decomp** (no licence, C, pushed Jul 2026), **Ankouno/KSS-disassembly** (Kirby Super Star), **videogamepreservation/spelunky**, **YaPeL/torchlight-recomp**, **GovanifY/kh2**: found, not read.
- Search noise: Torchlight hits were mods, not decomps. Spelunky, EarthBound, Golden Sun and Kingdom Hearts have several forks; not checked for licences.

## Ideas for the solver (from MHFU sim, own wording)
Prune dominated armours (same slot count, same or worse on every requested stat) before inserting decorations. Then fill sockets greedily per armour. This keeps the search small and the sockets fill deterministic.

## Top 5 for Prata
1. **TTYD BP budget** (ttyd, MIT): perk budget = max minus sum of equipped costs, recalc on change, null = cost 0.
2. **D2 seeded sockets** (D2MOO, MIT): socket count = seed mod tier cap, quality gate first; dips as child rows.
3. **SoM weapon mastery** (som-decomp, GPL-3, re-implement only): per-weapon progress, cap from forge tier, killer full and party half.
4. **FFTA redirect records + cycle validator** (ffta-decomp, study only): spec node fallback chain with depth limit and a test.
5. **Dominance-pruned socket fill** (mhfu-gear-simulator, MIT): prune outclassed gear, then fill sockets greedily.
