# ARPG references (14 Oct 2026)

Cheap pass. Skips what `teardown-*.md`, `data/SOURCES.md` and `decomp-mechanisms.md` already cover (RePoE, PoE wiki/poedb, Maxroll, MapleStory wiki, Phaser/rot.js/rbush/bitECS, VS clones, Brogue/Crawl). Licence column = what we may do. **Study** = read for ideas, rebuild our own; never copy code or data. Stars/push dates from `gh` on 14 Oct 2026. Items marked *unverified* came from search snippets, not a read of the page.

## 1. Spec tree (passive/skill tree)
| Ref | Licence | What to borrow | Fit |
|---|---|---|---|
| grindinggear/skilltree-export (216 stars, pushed 2026-07-31) | **none detected (no LICENSE); GGG game data. Study only.** | Shape only: groups, orbits, per-node orbit index, sprite-sheet background keys. Changelog notes orbit node counts change by patch (orbit 2/3: 12 to 16 nodes; angles 0/30/45/60/90/120/135). Store orbit tables as our own data, not theirs. | Good for a radial tree schema. Do not vendor the JSON. |
| PathOfBuildingCommunity/PathOfBuilding (5.5k stars, pushed 2026-10-09) | Code: MIT (David Gowor). **`src/TreeData/`, `src/Data/` and art are GGG data: study only.** | `src/Modules/ModParser.lua`: turns mod text into structured stat records. Idea for us: parse-free affix definitions (`{stat, value band}`) rather than free text. Calc pipeline (`CalcOffence` / `CalcDefence`) separates base, conversion, then "more" multipliers. Use for our hit-trace stages. | Strong. Port the *pattern* to TS; do not port Lua line by line. |
| PoE2 counterpart `PathOfBuildingCommunity/PathOfBuilding-PoE2` (1.9k stars, pushed 2026-10-09) | Same as above (Other / GGG data). | Same patterns, newer tree. | As above. |
| EmmittJ/SkillTree_TypeScript (25 stars, MIT, pushed 2024-10) | **MIT** code. Data it renders is GGG's. | A small TS renderer of the PoE tree (canvas nodes, connectors). Read for render structure only. | Small, dated, but close to our stack. |
| davidfig/pixi-viewport (1.2k stars, MIT) | MIT | Pan/zoom/clamp camera for a large canvas. | Only if we go Pixi. Phaser has its own camera; copy the *clamp and inertia* ideas instead. |
| d3/d3-hierarchy (ISC) | ISC | Tidy/radial tree layout maths (`cluster`, `tree` with `radial` mapping) for placing nodes ring by ring. | Good for generating node positions in the build step. Pure JS, no DOM. |
| cytoscape/cytoscape.js (11k stars, MIT) | MIT | Graph model with `dependencies` and `edges`, if we later need path-to-node queries (allocation connectivity). | Heavy for our one-tree case. Only if BFS over our own graph gets messy. |
| andrico1234/beautiful-skill-tree (390 stars) | **GPL-3.0. Study only.** | Visual pattern of a web skill tree (SVG layout, unlock lines). | Look only. |

**Borrow for Prata Raja (spec tree, "Crisp / Soak / Heat"):**
- Data: nodes `{id, branch, tier, cost, prereqs[], stat deltas}`; branch as the first-class key.
- Allocation: connected-to-start rule, computed by BFS over our data, not by drawing.
- Keystone-style nodes change rules (a hook id), not just numbers.

## 2. Crafting, forging, enhancement
| Ref | Licence | What to borrow | Fit |
|---|---|---|---|
| hewkow/yasf (Rust/WASM StarForce sim, Monte Carlo cost, Transfer Hammer chain) (0 stars, MIT, pushed 2026-07-31) | **MIT** | Monte Carlo cost estimate for a success/fail/destroy chain. Show expected cost per tier to the player. | Good. Rebuild the maths in TS; keep the seeded sim deterministic. |
| khrave/PoECraftingSim, OliverOrton/poecraft2, Kamil-School/poe-crafting-sim | **no licence. Study only.** | Currency-step search: find a sequence that hits a target affix set. | Useful idea (a "craft planner" for our forge); do not copy. |
| Last Epoch forging (community sources, *unverified* against patch) | Wiki and guide text: no reuse. | Mechanics: forging potential as a per-item crafting budget; cost is random and rises with tier; Order-style glyph locks an affix; Chaos-style glyph rerolls one. Community cost ranges 1-10 / 1-15 / 1-20 per slot (single forum post, not official). | Matches our "craft budget per item" idea. Use the budget idea, not their numbers. |
| Diablo 4 masterworking (WebSearch snippets: primagames, windowscentral, wowhead; *unverified*) | Articles: no reuse. | 12 ranks, milestone every 4 ranks boosts one random affix; a fixed bump on all affixes per rank. Sources disagree on %; S11 changes simplified it. | Good shape for a "stall upgrade" track: guaranteed small steps plus milestone spike. |
| MapleStory Star Force (wiki; see `data/SOURCES.md`) | Wiki CC BY-NC-SA. Study. | Escalating-risk ladder with a visible cost table. | Already covered. Use with a risk-free floor for a "safe" tier. |

**Borrow:** a per-item forge budget `{fp, cost}`; locks (keep affix) and rerolls (chaos); a visible expected-cost table from a Monte Carlo run in tests. No item destruction (already a rule in our notes).

## 3. Gems, dips and supports (PoE-inspired)
| Ref | Licence | What to borrow | Fit |
|---|---|---|---|
| PoE support gem data (already in `data/poe/support-gems.json`, from wiki) | Wiki CC BY-NC-SA; mechanics only. | Support tags and "more / less / added" split. | Covered. |
| Path of Building `ModParser.lua` (above) | MIT code | Support = a mod that edits an active's stat pipeline; tag matching decides which supports apply. | Core pattern for dips as data rows `{trigger, tags[], stat}`. |
| Brotato weapon/passive model (`teardown-vs-brotato-oss.md`) | per repo | Already analysed. | Covered. |

**Borrow:** each dip is a row `{id, tags[], stage, op, value}`; a pipeline stage applies the op only if tags match. Same design as `hit.ts` stages in `decomp-mechanisms.md`.

## 4. PvP and async (deterministic, stall vs stall)
| Ref | Licence | What to borrow | Fit |
|---|---|---|---|
| pond3r/ggpo (3.6k stars, MIT, pushed 2024-06) | **MIT** (C++ SDK) | Rollback protocol: input delay, state checksum per frame, desync detection. Read the `ggpo` design docs for the checksum loop. | Concepts only; we are not rolling back a fight. |
| boardgameio/boardgame.io (12k stars, MIT, pushed 2026-09) | **MIT** | Turn-based state in a pure reducer, `moves` as inputs, deterministic replays, multiplayer via a server. | Best fit for async stall battles: store input log, replay to verify. |
| colyseus/colyseus (7.4k stars, MIT, pushed 2026-10-13) | **MIT** | Authoritative room server; state patch sync. | Later, if live PvP. Async PvP needs no room. |
| dubzzz/pure-rand (118 stars, MIT, pushed 2026-10-13) | **MIT** | Splittable seeded PRNG in TS: `xoroshiro`/`mersenne`, `split()`. | Fits "named RNG streams" from `decomp-mechanisms.md`. Better than rolling our own. |
| davidbau/seedrandom (2.1k stars) | **GitHub detects no LICENSE. Check before use.** | Seeded `Math.random` replacement. | Prefer pure-rand. |
| Factorio "Friday Facts" on lockstep and CRC desync checks (#47, #55, #76, #188; *snippets only*, blog pages not read) | Blog text: no reuse. | Per-tick CRC of world state; replay a saved game and compare at first divergent tick; "heuristic" cheap CRC for long tests. | Strong for our deterministic sim test: CRC each N ticks in tests. |
| developerrutu/neon-fist (rollback 2D fighter, MIT, 0 stars, pushed 2026-08) | MIT | Small, readable deterministic physics loop. | Reference only; check code quality first. |

**Borrow:** an input log per battle `{seed, inputs[{tick, action}]}`; verify by re-running the pure sim and comparing a state hash per N ticks. Stall snapshot = the stall's data row, never a live object.

## 5. Top-down ARPG code (Phaser / TS / Godot)
| Ref | Licence | What to borrow | Fit |
|---|---|---|---|
| flareteam/flare-engine (1.3k stars, pushed 2026-10-05) | **GPL-3.0 engine. Study only.** Art and data in flare-game: CC-BY-SA 3.0 (copyleft, do not copy art). | Stat/affix/item data layout in `mods/` for a top-down ARPG with loot. Read the data format, not the C++. | Reference for data design. |
| veloren/veloren (GPL-3.0, pushed 2026-10-13) | **GPL-3.0. Study only.** | Large-world ARPG systems (loot, skills) as design reference. | Reference only. |
| arianna-arpg/arpg-game-world (TS, Canvas 2D, "every system is open, modular data", 1 star, pushed 2026-10-14) | **"Other" (no SPDX). Ask first.** | Modular data-driven loot idea; overlaps our plan. | Watch; do not copy. |
| Maxime-Garcia/grievy-towns-dilemma, Goodmorningqwq/emberfall, MajklCan/starfall (Phaser 3/4 + TS ARPGs, no licence) | **no licence. Study only.** | Phaser ARPG scene and input structure. starfall uses Phaser 4 + bitECS, same stack. | Study the Phaser 4 wiring only. |
| Haeuptling-Silberlocke/rpg-prototype (Vite + TS + Phaser 3, pushed 2026-06) | no licence. Study only. | Prototype layout. | Low value. |

## What to do next (Haiku-cheap)
1. Confirm `seedrandom` licence on its repo; prefer `pure-rand` (MIT) either way.
2. Pull `grindinggear/skilltree-export` README only (already read); decide our own orbit table from our design, not theirs.
3. Read `pond3r/ggpo` README checksum section; skip the C++.
4. Add `pure-rand`, `d3-hierarchy`, `boardgame.io` as candidate deps; ask the owner before any install.
5. Mark GGG-data repos and GPL-3 repos "study only" in `data/SOURCES.md` if the owner agrees.

No code was cloned or copied. No files other than this one were edited.
