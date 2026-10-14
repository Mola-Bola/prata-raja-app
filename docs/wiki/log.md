# Wiki log
Append-only, newest on top, one line per ingest/change/lint.

- 2026-10-15: Free-movement run HUD (round 8 m2): `src/game/ui/run/FreeRunHud.tsx`, grouped top bar, meal chip, dip readouts, Dodge with 1.2 s cooldown; HudState gains `free` and `meal`. Branch claude/r8-hud.
- 2026-10-15: Hub polish (claude/r8-hubpolish): terrazzo as 4 screen-wide tiles, warmed and faded; one back wall across the top; Kannan starts mid-floor; room pans up so Kannan clears the open station sheet (250 ms, instant in reduced motion); two NPCs (student by the steel table, auntie by the drain) with a gentle bob.
- 2026-10-15: Walkable stall hub (HubScene + HubOverlay): joystick/tap/WASD, 8 stations with panels, GO pill, old stall via Settings. Branch claude/r8-hub.
- 2026-10-14: Teh tarik haste pour (caramel ribbon cup to hand, droplets, caramel trail, froth puff; reduced motion tint only); Kannan hurt zone 34 -> 30 u (balance in band at 300 seeds; 26 u broke the bands) with a floor ellipse that flashes on hit. Branch claude/tarik-hitbox.
- 2026-10-14: Wiki created (index, 20 pages, research/INDEX.md, stale-code, archive of DEPTH/ROADMAP/SPEC/OWNER-SUMMARY-DEPTH/FEEDBACK/reviews). Lint: none yet.
- 2026-10-14: Research added: knowledge-practices; more decomps (TTYD, D2 sockets, SoM mastery, FFTA jobs); culture sensitivities became standing rules (music: thavil, no urumi).
- 2026-10-14: UI pass (readability, one type scale); floor polish; hawker props off; welcome door uses title art; snap-tour works without login wall.
- 2026-10-14: Gear v2 (seeded items, ilvl window, bands, uniques, kill-drop materials, enhance); procedural BGM; stat registry; training shows unlocked rows only.
- 2026-10-14: Crit feel (gold number, crunch, per-kind AoE sounds); scrolling perspective floor; owner-only sign-up; build sheet; snap tour URL switches.
- 2026-10-14: Flow balance retune; tune panel (`?tune=1`); milestone visitors at Kannan levels 5/10/15/20/25.
- 2026-10-14: One Kannan level with spec points and milestone perks; Crisp & Soak axes; ARPG direction recorded; web always revalidates with update bar.
- 2026-10-14: Research: malleable dev flow, story milestones, ARPG refs, decomp status audit, decomp RPG systems, decomp scrolling flow.
- 2026-10-15: Forge bench at the stall (enhance UI, single-affix reroll, Codex masala/chilli/curry-leaves icons); see gear-v2.
- 2026-10-14: Balance tune after street finds (BALANCE_SEEDS=300): Appam base cooldown 1.0 to 1.25 (solo signature 42% to 12%); Roti Bomb cooldown 1.4 to 1.3 (solo signature 9% to 18%); ch2 untouched (solo 23%).
- 2026-10-14: Balance tune after street finds (BALANCE_SEEDS=300): Appam base cooldown 1.0 to 1.25 (solo signature 42% to 12%); Roti Bomb cooldown 1.4 to 1.3 (solo signature 9% to 18%); ch2 untouched (solo 23%).
- 2026-10-15: Audio (r8-audio): light SFX cues step, stationOpen, stationClose, enhance, fuse, socket, dash, cook (WebAudio); hub BGM track via startMusic('hub') (Mohanam, 96 BPM, sparse drums).
- 2026-10-15: Round 8 meta: dip sockets (sockets.ts), spec tree (specTree.ts + SpecTree.tsx), pre-run meals (meals.ts + KopiMeal.tsx); save fields sockets/spec/meal via migrateMeta (no version bump).
- 2026-10-15: Damage pipeline (r8-dmg): damage.ts (base, conversion, increased, more, crit, pierce falloff), ENEMY_HARD_CAP 40, unique hooks (crit splash, first-hit freeze, clogs) wired via loadout.hooks.
- 2026-10-15: Free-movement runs behind `controlMode` (Tune knob `mode.free`, `?move=free`): joystick, auto-throw at nearest, dash i-frames, pests chase Kannan, boss arena lock, kiting bot, balance variant; see sim-core.
- 2026-10-15: Workbench (r8-bench): pointer drag-and-drop + undo toast in the hub panels; gear to tawa enhances, dips to katori, curry-pot fusion (fusion.ts, `fusions` save field), tiffin (`tiffin` field) via migrateMeta; no version bump.
- 2026-10-15: Hub polish 2 (r8-polish2): back wall one full-width decal behind the top stalls (20% off the top, top row darker); station labels on glass pills; station panel 55% tall with the scroll end clear of GO; ghost miss snaps home instantly under reduced motion, hub reads the setting again on enter.
