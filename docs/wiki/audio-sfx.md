# Audio SFX
Purpose: procedural sound for hits; roti hits sound like bread slapping on a tawa, different breads differ.

## Files
- `src/game/audio/sfx.ts` (+ `__tests__/sfx.test.ts`), `src/game/bridge*.ts` (haptics)

## How it works
- Synthesised, no sample files; per-bread slap voices, crit crunch, per-kind AoE sound voices.
- Calm repeated cues via rate gate in `combatFeedback.ts`.

## Status
Live. Last change 2026-10-14 (crit crunch, AoE voices).

## Research
- Used: [game-feel](../research/game-feel.md), [owner-refs-2026-10-13](../research/owner-refs-2026-10-13.md).
- Not yet: [hawker-culture](../research/hawker-culture.md) ambient street sounds per place.

## TODO
- No real-phone audio pass.

Related: [music](music.md), [status-vfx](status-vfx.md), [prata-flight](prata-flight.md).
