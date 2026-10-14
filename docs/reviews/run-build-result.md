# Builder 79 — current run build and DPS

Base: `1b253ef` (0.4.11). Branch: `sol/run-build`. No merge or release performed.

Pause → **Current build & stats** opens a scrollable inspection sheet with fixed Back and Resume controls. It lists every owned roti, dip and passive at the current run level; empty sections are explicit. Roti intervals use `effectiveCooldown`, and current player modifiers use `buffMods`. Permanent player stats and active temporary buffs are separate. The sheet reads an independent renderer snapshot taken when pausing; inspection does not write saves or alter the build. Back returns to pause, where restart, end run, feedback and settings remain reachable.

Linked dip numbers reuse `linkedDipEffect`, extracted from the existing hit path without changing hit filtering. Both combat and the sheet apply `matchingDipLink` and `simmerEffect`, including evolved targets. Burn/Sugar/zone damage read the player's current DoT modifier. Base roti damage is explicitly labelled before player bonuses, signature throws and foe defence; the sheet does not pretend it predicts DPS. Existing signature descriptions remain content sourced.

HUD **DPS** is the sum of hit and DoT event damage within the last 300 fixed simulation steps, divided by five seconds (or elapsed run time before five seconds). It includes overkill, ignores non-damage events, freezes while simulation time freezes, becomes zero after five seconds without damage, and resets for a new run. A fixed 301-bucket ring aggregates bursts rather than retaining individual events. HUD publication remains at the existing cadence; React only takes a build snapshot when pausing.

Boss HUD portraits use the actual boss content sprite through typed `HudState`, covering King Cockroach and Burger Baron. The 0.4.11 feedback correction is preserved.

Verification so far:

- Focused Vitest: 59 tests passed across damage rate, renderer hub, dip link parity and feedback fixtures.
- TypeScript passed after updating the mandatory feedback HUD fixture.
- Targeted ESLint passed after copying the held HUD ref into pause state outside render.
- `git diff --check` passed.
- Real-browser spec authored for 320×480 and 390×844: visible owned levels/effects, current buffs, pause clock, unchanged save, real core card upgrade, resume/restart/end transitions, scroll bounds, and both loaded boss portrait images.

Full `scripts/check.sh`, web export, browser execution, screenshots and branch CI are pending the coordinator's host-resource go-ahead. No approval is claimed for those pending checks.
