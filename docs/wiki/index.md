# Prata Raja wiki

Map of what is built. Steering lives in [DIRECTION.md](../../DIRECTION.md) (wins on conflict); research in [../research/INDEX.md](../research/INDEX.md); history in [log.md](log.md). Code is authoritative for numbers. Status: live / experimental / stale / retired. Pages are short on purpose; update them when you change a component.

## Run & sim
- [Director / flow](director-flow.md) - live. Distance-driven spawns, story beats, no waves.
- [Sim core + hit pipeline](sim-core.md) - live. Deterministic tick, `hitEnemy`, boss, shots.
- [Crisp / Soak](crisp-soak.md) - live. Crit vs splash build axes.
- [Stat registry](stat-registry.md) - live. One source for stats.
- [Status effects + VFX](status-vfx.md) - live. Chill, freeze, spicy, read on the enemy.
- [Prata flight](prata-flight.md) - live. Throw arcs, pierce, bounce, orbit, bombs.

## Street & visuals
- [Street floor + props](street-floor.md) - live floor, props off.

## Combat feel & audio
- [SFX](audio-sfx.md) - live. Procedural bread slaps, crit crunch.
- [Music](music.md) - live. Procedural Tamil-flavoured chiptune.

## Progression & meta
- [Kannan level, perks, milestones](kannan-level.md) - live. One level, spec points; tree not built.
- [Story beats](story-beats.md) - live. Beats unlock rotis, dips, chapters.
- [Gear v2, uniques, materials, enhance](gear-v2.md) - live.
- [Dips + simmer](dips-simmer.md) - live; sockets logic built.
- [Spec tree](spec-tree.md) - built, hub mount pending.
- [Pre-run meals](meals.md) - built, hub mount pending.
- [Training](training.md) - live, generated from registry.
- [Cards -> street finds](cards-street-finds.md) - experimental bridge.

## UI
- [Overlay, build sheet, tune panel](ui-overlay.md) - live.
- [Walkable stall hub](hub-scene.md) - branch claude/r8-hub.
- [Workbench](workbench.md) - drag gear to tawa, dips to katori / curry pot (fusion), tiffin; branch claude/r8-bench.
- [Test Kitchen](test-kitchen.md) - live sandbox (also experiments).

## Backend & ops
- [Login wall, cloud save, notes](login-cloud-save.md) - live.
- [Ship-fast, CI, snap tour, monitor](ops-ship.md) - live.
- [Stale-code report](stale-code.md) - knip output with recommendations.

## Retired
- Waves as the play model (kept only for Test Kitchen `waves` mode, `src/core/waves.ts`).
- Roguelite power-in-run / level-up cards as main power ([archive](../archive/README.md)).
- Codex fleet, akit stamp web-ship, 300-seed gates ([DIRECTION.md](../../DIRECTION.md) Retired).
- Stall level as separate from Kannan level; level-gated unlocks (now story beats).
- Street hawker props (stools looked like stickers; switched off 14 Oct, code remains).
- Stale design docs: [docs/archive/](../archive/README.md).

## Lint checklist (run now and then; log result in log.md)
- Orphans: every page in `docs/wiki/` is linked from this index.
- Stale status: any page whose "Last change" is >14 days older than `git log -1 --format=%cs -- <its files>`.
- Research with no "used in": rows in research/INDEX.md with empty "used in".
- Dead links: internal paths in wiki pages resolve.
- Contradiction with DIRECTION.md Active.
