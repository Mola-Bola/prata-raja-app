# Walkable stall hub (HubScene)

Status: live on branch claude/r8-hub (milestone 3 of docs/plans/round8-fusion.md). Last change: 2026-10-15 (readability redesign: U layout, permanent signs, near glow/lift, first-visit tips, uncle bark, GO docked in panel footer).

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

Camera: when a station opens, the room slides up (250 ms tween, 0.38 of the height is Kannan's line) so he stays above the sheet;
it slides back on close. Taps map through the camera scroll; the joystick is screen-fixed.
NPCs: the uncle (breathing) plus room/npc-student and room/npc-auntie-siew-lan as PROPS (collision), all bob unless reduced motion.
Gaps: the wall's slanted left end leaves a small floor gap at the top-left corner; no ceiling/pillar props; the fairy-light string and
fan shadow were already placed; web e2e specs still expect `stall-hub` after Start.

Research used: docs/research/hub-design.md (anti-tedium 1, 3, 5, 6: short walks, one GO from anywhere, panels <= 2 levels).
Skipped on purpose: Dave-style business loop, village growth.

Readability (r8-hubread): stations form a U (kopi, tawa, door along the back wall; gear, pantry, table cluster down the left; orders, dips, spec down the right), ~100 wide, 155 apart. Every station has a permanent sign (icon + 1-2 word name, `Station.label/icon` in layout.ts) hung on its art; within NEAR (RANGE+14) the sign lights warm, the art gets a gold silhouette outline and grows 4% (not with reduced motion), a verb tag appears (`Station.verb`) and the floor ring shows: one at a time. Pantry and Gear signs carry a coral badge with the unopened-chest count (hub event `hubBadges`). Soft ellipse shadows under props. Kannan's first walk near the uncle shows "Kopi before you go?" for 2 s. First time a station panel opens: a one-line tip (src/game/ui/hub/tips.ts, bridge key prata-raja/hub-tips, not the save). GO docks in the open panel's footer; the meal chip sits under the top bar; Gear panel has "Open chests (N)". Removed the two floating NPCs (student, auntie).
