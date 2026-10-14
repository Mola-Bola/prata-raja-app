# Music
Purpose: procedural Tamil-flavoured chiptune BGM with a Music switch.

## Files
- `src/game/audio/music.ts` (+ `__tests__/music.test.ts`)

## How it works
- Generated phrases over rhythms and roots, boss BPM variant, mulberry32 seeded.
- Hub track: `startMusic('hub')` plays a calmer Mohanam loop at 96 BPM (`genHubSection`): lead thinned to every other note, soft kick and bass on steps 0 and 8 only, no snare, hats, fills or counter-melody; the tanpura drone runs under it. `startMusic()` with no argument is the run track, as before. Mute and enabled settings apply to both.
- Instrument/percussion naming follows sensitivities: thavil/nadaswaram flavour; no urumi (funeral-linked).

## Status
Live. Last change 2026-10-15 (hub track, `startMusic(track)`; not yet called by game code).

## Research
- Used: [hawker-culture](../research/hawker-culture.md) section 4 and Sensitivities.
- Not yet: per-place motifs, Ramadan/festive background tracks.

Related: [audio-sfx](audio-sfx.md), [DIRECTION.md](../../DIRECTION.md) (cultural rules).
