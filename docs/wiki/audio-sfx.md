# Audio SFX
Purpose: procedural sound for hits; roti hits sound like bread slapping on a tawa, different breads differ.

## Files
- `src/game/audio/sfx.ts` (+ `__tests__/sfx.test.ts`), `src/game/bridge*.ts` (haptics)

## How it works
- Synthesised, no sample files; per-bread slap voices, crit crunch, per-kind AoE sound voices.
- Calm repeated cues via rate gate in `combatFeedback.ts`.
- Light cues (`LIGHT` in sfx.ts, WebAudio, quiet, +-5% pitch per play, no combat voice cap): `step` (soft slipper, gated 90 ms), `stationOpen` / `stationClose` (katori clink), `enhance` (tawa sizzle ~0.4 s), `fuse` (three curry-pot pops), `socket` (katori set down), `dash` (run-dodge whoosh), `cook` (kopi pour).

## Status
Live. Last change 2026-10-15 (light cues for hub and kitchen: step, stationOpen/Close, enhance, fuse, socket, dash, cook; not yet called by game code).

## Research
- Used: [game-feel](../research/game-feel.md), [owner-refs-2026-10-13](../research/owner-refs-2026-10-13.md).
- Not yet: [hawker-culture](../research/hawker-culture.md) ambient street sounds per place.

## TODO
- No real-phone audio pass.

Related: [music](music.md), [status-vfx](status-vfx.md), [prata-flight](prata-flight.md).
