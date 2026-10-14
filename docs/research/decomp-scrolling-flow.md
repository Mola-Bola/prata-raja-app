# Scrolling, spawn, boss-lock, speed and road decomps (14 Oct 2026)

Scope: repos NOT in decomp-mechanisms.md. Read at source unless marked (summary). Study and re-implement only; nothing is copied. Paths are repo-relative.

## 1. Camera follow with dead zone and capped step
- **Repo**: sonicretro/s1disasm `_inc/ScrollHoriz & ScrollVertical.asm` (MoveScreenHoriz). Licence: none declared (study only).
- **How**: camera holds still while Sonic is 144-160 px from the left edge. Outside that band it closes the gap at up to 16 px/frame, clamped to a right-limit variable. The step is stored as 8.8 fixed point for parallax.
- **Prata**: `src/game/phaser/street.ts` camera: no move inside a centre band around the stall, else lerp with a 16 px/frame cap. Right limit = chapter end. Store the step so parallax reads it.

## 2. Parallax as fixed per-layer ratios
- **Repo**: sonicretro/s1disasm `_inc/DeformLayers (REV01).asm` (Deform_GHZ). Licence: none declared.
- **How**: each background layer adds `scrollStep * k` with k fixed per layer: distant hills x 0x60 (96), mid hills x 0x80 (128). The step is computed once per frame, before the layer loop.
- **Prata**: one integer table `bandParallax = [96, 128, ...]` applied to the frame's stall step. No per-band tuning code.

## 3. Spawn window driven by camera position (sorted layout, two cursors)
- **Repo**: sonicretro/s2disasm `s2.asm` ObjectsManager (~line 32923, ObjectsManager_Init and _Main). Also s1disasm `_inc/ObjPosLoad.asm` (OPL_Main, OPL_Next). Licence: none declared.
- **How**: placement list is sorted by X in 6-byte records (x word, y word, id/flags). Two cursors (left, right) walk forward and back as the camera crosses 128 px chunks. A record is created when the right cursor reaches it and destroyed when the left cursor passes it. If the object pool is full the cursor waits and retries next frame. Records flagged "remember" get a respawn index so a killed object stays dead while the window is away.
- **Prata**: `src/core/director.ts` spawn table, sorted by `dist`: `{dist, lane, kind, remember}`, two cursors over the stall's distance in 128-unit chunks. Pool-full retries next tick. "remember" fits the one case where a passed enemy must not reappear (e.g. on a loop-back).

## 4. Proximity spawner with slots and cooldown (ambush from ahead/sides)
- **Repo**: sozud/mmx4 `src/main/effects/effect_12_enemy_spawner.c` (enemy_spawner_init, func_800B8114). Licence: AGPL-3.0, so re-implement only.
- **How**: spawner arms when the player is within 0x80 px on X. It fills up to N child slots (N packed in a nibble of `unk2`). One spawn per 0x20-frame cooldown. A slot is reused when its child dies (`child->active == 0`). The spawner ends after N spawns. Child type/subtype come from small per-spawner tables.
- **Prata**: a "spawn gate" row in the director: `{armDist: 128, slots, cooldownTicks: 32, kind, side}`. Pressure rank sets `slots`. Side gates use the same shape with a lane offset. Ahead gates arm earlier than side gates.

## 5. Boss lock: a short state machine, not a flag
- **Repos**: sonicretro/s2disasm `s2.asm` LevEvents_EHZ2_Routine2-4 (~lines 20430-20475). sozud/mmx4 `src/main/items/item_08_boss_door.c` (boss_door_* states). Licences: none / AGPL-3.0.
- **How (S2)**: when camera X reaches $28F0, Camera_Min/Max_X are set to a fixed arena ($28F0-$2940) and the music switches. A counter waits $5A = 90 frames, then spawns the boss. Routine 4 releases the clamp when `Boss_defeated_flag` is set.
- **How (MMX4)**: door states are wait-for-player (blocks a terrain box), open (30-step scripted anim: duration, frame, command), walk-through, close, locked. Unlock comes from the boss-death flag (exact condition unverified).
- **Prata**: at `bossAt` (director.ts, `bossAtOf`) the director enters `lock`: stop the spawn cursor, clamp the stall's x to the arena, wait 90 ticks, spawn the boss, release on death. Lock states as an enum, not a boolean. Note: director.ts currently stops the stall at bossAt; keep that, add the lock states.

## 6. Speed boost with energy gate and explicit restore
- **Repo**: inspectredc/fzerox `src/game/racer.c`: sInitialBoostTimer (line ~386), boost trigger ~3598-3603, decrement ~4035-4068, boost stat table D_800CF174 (~444, used at ~1538). Licence: CC0 on the decomp's own code; the game is Nintendo's, so re-implement.
- **How**: boost starts only if `boostTimer == 0` and energy is non-zero; it lasts 100 frames and drains energy. A per-machine stat indexes a float table that sets boost strength (name-level inference, unverified).
- **Repo**: sonicretro/s2disasm `s2.asm` Obj01_ChkShoes (~36308) and speed shoes give (~25929). Timer is 20*60 = 1200 frames. On expiry it restores top speed $600, accel $C, decel $80 (super: $A00/$30/$100). Licence: none declared.
- **Prata**: `speedCurve(rank) = min(cap, base + k*rank)` as data. A boost pickup sets `boostTicks = 100` gated on energy and zero timer. Expiry restores the curve value, not a hardcoded default.

## 7. Perspective road: precomputed scanline table and eased horizon
- **Repo**: djyt/cannonball `src/main/engine/oroad.cpp`: get_road_y (line ~67, `223 - (road_y >> 4)`), tick (~44, horizon eased +/-16 per tick), setup_x_data (~339, per-segment direction normalised to 14-bit fixed point via isqrt), setup_road_y (~627). Roadside sprites: `olevelobjs.cpp` setup_sprite (~152), with z from segment. Licence: SPDX not reported by GitHub; check LICENSE before any reuse, treat as study only.
- **How**: road Y for each scanline is a precomputed table indexed by distance, not computed per frame. Horizon moves toward a target at a fixed step per tick. Curvature is integrated per segment from direction vectors. Roadside objects are placed by segment index and z.
- **Prata**: `src/game/phaser/street.ts` mode-7 bands: build one scanline-to-z table at load. Horizon eases at +/-N px per tick toward a chapter target (boss lock raises it). Curve = per-band x offset integrated from segment direction. Roadside props sorted by z, as in item 3.

## Not found or not verified
- No public Gradius, R-Type, Batsugun, DoDonPachi or Contra-style rank code found in this pass. vs-sr-dev/pc-dodonpachi is a WIP recompilation with no source read.
- No Super Mario Kart, SNES F-Zero, or Kirby Mode-7 decomp found. mksc (Mario Kart Super Circuit, GBA) is listed but not read.
- Contra (vermiceli/nes-contra-us, no licence): per-screen enemy tables with X/Y offsets and a repeat count, and a boss auto-scroll stop screen. Read from docs/ only; `src/bank2.asm` not read.
- Unread leads: gameblabla/CSE2 (Cave Story, boss arenas), Rubberduckycooly/Sonic-Mania-Decompilation (licence NOASSERTION), TheBlad768/Sonic-Clean-Engine-S.C.E. (cleaned S3K), N0zoM1z0/th09 (sibling of th06).

## Licences in one line each
- s1disasm, s2disasm: no licence declared; Sega IP. Study only.
- cannonball: no SPDX reported; confirm before any reuse. Study only.
- nes-contra-us: no licence, all rights reserved. Study only.
- fzerox: CC0 on the decomp code; game is Nintendo's. Re-implement.
- mmx4: AGPL-3.0. Re-implement only; copying would pull AGPL into Prata.

## Top 5 ideas, ranked
1. **Spawn cursor and pool cap** (item 3): replaces wave timing. One sorted table, two cursors, retry when full. Easiest win; foundation for the rest.
2. **Proximity spawn gates with slots and cooldown** (item 4): pressure rank sets slot count; ahead and side gates differ only by arm distance and lane. Directly gives "enemies flow in from ahead and sides".
3. **Boss lock as a state machine** (item 5): lock, 90-tick delay, spawn, release on death. Clear, testable steps; matches bossAt.
4. **Precomputed scanline/z table + horizon ease + layered parallax ratios** (items 2, 7): fixes the mode-7 cost on phones and gives boss lock a visual lever.
5. **Speed curve as data with timed boost** (item 6): base + k*rank with a 100-tick gated boost and restore-on-expiry. Lowest effort; tune last.
