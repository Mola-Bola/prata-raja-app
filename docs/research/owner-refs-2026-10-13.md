# Owner reference clips, 13 Oct 2026 (Archero 2 run + menus)

Source: `My Drive/Claude/Prata Raja refs/screen-20261013-*.mp4` (5 clips). All are other games (Archero 2 lobby/meta, an Archero-style 50-wave portrait run, one intro cinematic). No Prata Raja footage, so no playtest bugs. Sampled at 0.5-1 s, so sub-0.5 s timings are not measured.

## Feel pass takeaways (applicable to Prata Raja)
1. Level-up cards reveal one by one (~0.3 s apart, an empty slot first), over a dimmed, paused arena; rarity tag + stat line + one Refresh button with a count.
2. Damage numbers: big hits large red, chip damage smaller yellow, clustered just above the target.
3. Aura/area skills: translucent ring around the hero at the true hit radius. Chain hits: thin cyan arcs held ~0.5 s.
4. Boss arrival: red "DANGER!!" band across the arena (fits our existing danger cue).
5. Optional stage goal card before wave 1 (3 stars: time, hits taken, no revive), useful later for chapter replay value.
6. Mid-run events (blessing / devil deal "lose max HP for X": Reject / Sign) share one card-choice pattern; candidates for S3+ (hawker "deal" stalls).
7. Layout: arena ~60% of height, controls bottom, wave bar top, gold top-right, pause top-left (we already match).
8. Not covered by this footage: throw motion, mob attack animations, far-end spawns, perspective, tawa steam, counter props. Our own play clips are needed for those.

## Clips
- 110542 (8.7 s): Archero 2 update splash.
- 110625 (11.1 s): unidentified intro cinematic, close tilted camera (not our perspective).
- 110729 (36.9 s): Archero 2 lobby: stacked unlock banners (12-14 s), 7-day login, shop popup, results ribbon.
- 110901 (78 s): goal card (10 s), talent pick with 3 rare cards + Refresh (16-21 s), combat layout (22 s), staggered level-up reveal (35-40 s), blessing (40-55 s).
- 111655 (368 s): full 50-wave clear in 3:58: damage numbers (50-55 s), devil deals (70, 150 s), DANGER band (190 s), end card (230 s), menus after.
Grids (temporary): `/private/tmp/claude-501/owner-refs-2026-10-13/` (c4_dense16s, c5_dense48s, c5_grid01/02, c4_grid01, c3_grid01).

# Owner playtest of 0.2.0 (clip 114127, 4:47, won wave 10, then hub)
Read from frame grids (`/private/tmp/claude-501/owner-refs-2026-10-13/pr/`); small text unverified at full res.
- **Bugs:** chest sheet header "Rare or better: 4 chests · Epic or better: 19 chests" (pity copy/counters look inverted; counts unchanged after an open) · Start button ghosts through the sheet fade-in · breads land and sit mid-street with no enemy (dead ammo? pickups?) · boss bar crowds the wave/Lv strip · card offers repeat a lot (Roti Bomb in 4 of 6 offers; Extra Dough 3).
- **Feel:** pests and damage numbers tiny at range; ~15 s near-empty gaps in waves 8-9; boss idles ~10 s at the top, fight ~50 s; boss lane telegraph thin/low contrast (lands 2-3 s later); thrown bread reads as a small orange cube; HP pill small.
- **Hesitation:** Lv9 card held 6-8 s; gear opened 3 times around the first chest (comparing the gloves).
- **Fix order for the feel pass:** boss telegraph contrast + counter hit flash · shorter boss approach · bigger pests/numbers at range (scale with perspective) · fix chest copy/counts · card-repeat damping / wider pool · clear landed breads · button ghosting + boss bar placement · fill wave gaps.
