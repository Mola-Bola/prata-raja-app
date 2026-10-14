# Walkable stall hub (HubScene)

Status: live on branch claude/r8-hub (milestone 3 of docs/plans/round8-fusion.md). Last change: 2026-10-15.

The home screen between runs. A Phaser `HubScene` draws a three-quarter room from real atlas frames (room/*): terrazzo floor,
back wall, counters, kopi stall with the uncle, tawa, doorway (Exit), stools, fairy lights. Kannan walks with a floating
joystick (touch anywhere), tap-to-walk, or WASD/arrows, 4-direction walk cycle at 8 fps, rectangle collision, y depth sort.
Walking into a station's range opens its panel (React bottom sheet), walking out closes it.

Stations (design units, 390 x 844): Kopi uncle, Tawa (roti loadout + recipes), Exit (chapters) across the top; Orders
(places, special, calendar), Gear rack x Forge (wear / forge), Dips, Spec board (spec tree + training), Pantry (materials,
chests, tip jar) down the sides. Any station is under 3 s from any other (layout.test.ts).

Seam: `hubStation` event and `controls.hubEnter/hubLeave/hubWalkTo/hubDismiss` in src/game/hub.ts. RunScene sleeps while the
hub shows and the hub sleeps during runs: `start`/`startKitchen` wrap themselves to call leave(); GameUi calls hubEnter on
screen 'hub'. The old StallHub is reachable from the hub's Settings ("Old stall menu"), with a "New hub" button back.
Reduced motion: no idle breath, fan or uncle bob, static prompt ring.

Files: src/game/phaser/HubScene.ts, src/game/phaser/hub/layout.ts (+ __tests__), src/game/ui/hub/HubOverlay.{tsx,css}, small
edits in GameRoot.tsx, BootScene.ts (launches HubScene), GameUi.tsx (screen 'hub'), hub.ts.

Gaps: the open sheet covers the lower half of the room (Kannan can hide under it); NPCs other than the uncle are not placed;
no ceiling/pillar props; web e2e specs still expect `stall-hub` after Start.

Research used: docs/research/hub-design.md (anti-tedium 1, 3, 5, 6: short walks, one GO from anywhere, panels <= 2 levels).
Skipped on purpose: Dave-style business loop, village growth.
