# Open-world feasibility (14 Oct 2026, design researcher)

Question: can Prata Raja become an open-world-ish RPG on Phaser 4 in a phone browser, built by Claude + Haiku/Sonnet workers? **Answer: yes at A, yes with care at B, not worth it at C.** No code changed by this study.

## What we start from (reuse)
- `src/core` is a deterministic, headless sim: `step(world, dt, input)`, enemies, shots, zones, statuses (`burn`, `chill`, `freeze`, `stun`, `tender`), cards, stats. Rendering is separate (`src/game/phaser/RunScene.ts`), so the world can change shape without touching combat rules.
- The playfield is 1-D: `FIELD.kannanMaxX`, Kannan slides left/right, enemies spawn at x in [-230, 230] and walk toward the counter (`waves.ts` `SPAWN_X`). No y movement, no map, no camera.
- Meta already has: materials (`flour ghee egg onion spice sugar milk`), gear slots, chapters (5 hand-drawn places), prologue story flags, save v2 + migrate, chests, training.
- Content is data rows (`src/content`), so new places, NPC lines, enemies are cheap.

## Three ambitions
| | **A. Scrolling journey** | **B. Hub map + free-roam districts** | **C. Seamless open world** |
|---|---|---|---|
| Idea | The stall travels one continuous street/route; background scrolls; branches at junctions pick the next district | Hub map of districts; enter one as a small top-down ARPG (Diablo-lite) with free 2-D movement, aim, loot, NPCs | One streamed world, no loading, free travel anywhere |
| Reuse | Sim 90% (enemies come from ahead/sides instead of far end), cards, statuses, gear, bosses, chapters-as-route-segments, art backdrops | Statuses, damage pipeline, gear, content tables, boss scripts; **sim needs a 2-D position/collision rewrite** (x only today) | Same as B plus everything below |
| New | Spawn director on a distance/story clock (replaces waves), parallax scroll layer, route graph + junction UI, story-beat triggers, "stall moves" camera, save of route position | Tilemaps + Tiled import, 2-D movement/aim controls on touch (virtual stick), camera follow, collision, enemy pathing, NPC dialogue + quest state, minimap, per-district save | Chunk streaming, world-space spawn/despawn, persistent world state, navmesh, art volume x20, memory budgets |
| Effort (agent-days) | **~8-12** (slices in PLAN-2) | **~30-45** after A; art/tiles dominate | **90+**, unrealistic for one agent team |
| Phone-browser perf risk | Low: one scrolling strip, pooled sprites, <=60 live enemies | Medium: tilemap draw calls, 2-D pathing, many 2-D shots; need pooling + culling + atlas discipline (Phaser 4 helps with batching) | High: streaming hitches, texture memory on iOS Safari (~1-2 GB tab cap), GC spikes |
| Determinism / PvP later | Keeps 1-D sim: cheap to replay, cheap to sync | 2-D sim still deterministic if fixed-step + integer-ish math, but replays heavier | Authoritative server needed, out of scope |

## Fit with the owner's wants
| Want | A | B | C |
|---|---|---|---|
| Moving stall | native (it is the point) | stall is a vehicle/hub; moves between districts, parked inside | native |
| Story unlocks | route beats gate branches and items: natural | quests + NPCs: natural, more content | same, more content |
| Continuous flow (no waves) | native | native inside district | native |
| Crafting | materials drop from kills + stops along the route; craft at the stall (stall is always present) | same, plus gathering nodes in districts | same |
| PvP stall-vs-stall | two stalls on parallel lanes of the same strip: easy fit | arena district: fit | hard |
| Phone-first one-thumb | good (drag to dodge, auto-fire kept) | needs virtual stick; harder for one thumb | harder |
| Art cost (hand-drawn, AI-made) | 1 long panoramic per place + parallax layers (we have per-chapter backdrops) | tilesets + props per district: large | huge |

## Risks across all paths
- Art is the real cost ceiling, not code: every new place needs backdrops, enemies, props.
- Dilution: the owner likes the throw/dip/roti feel. Keep 1-D combat as the core so the "weapon" fantasy survives.
- Phaser 4 is new; keep to sprites + containers + simple tilemaps, avoid custom shaders until needed.
- Save grows (route position, quest flags). Use the existing versioned save + `migrate.ts` pattern.

## Recommendation
**Do A now, design it so B is an upgrade, skip C.** A turns the current game into the owner's Direction 2.0 (moving stall, continuous flow, story gates) in about ten agent-days and keeps risk low. B can later be a "district" scene type reachable from a route junction (a boss arena or market you walk around), reusing A's story/save/director. Only start B if A's feel is loved and art throughput is proven.

## First 3 shippable steps
1. **Continuous director + scrolling street (2-3 days).** Replace wave gating with a time/distance spawn director in the deterministic core; scroll the backdrop so the stall visibly travels; enemies enter from ahead and sides. Owner sees: no wave banners, the street moves, pressure rises smoothly. (Slices 1-3 in `PLAN-2.md`.)
2. **Route and story beats (2-3 days).** A linear route of the 5 existing places with 1-2 branch junctions, a beat track (dialogue panel, boss, junction choice) and beat-driven unlocks replacing level gates. Owner sees: "Pasar Malam ahead" arrival, a new roti unlocked by a scene. (Slices 4-5.)
3. **One persistent Kannan level + materials-on-the-road (2 days).** One level that survives runs, material drops, craft bench in the stall. Owner sees: single level bar, ghee/spice pickups, an enhanced tawa. (Slices 6-8.)

Spike for B (optional, 1 day, after step 2): a throwaway "market square" scene with a virtual stick and 20 enemies on a tilemap on the owner's phone, to measure frame time before committing.
