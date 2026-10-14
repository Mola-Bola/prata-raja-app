# Status effects + VFX
Purpose: chill/freeze, spicy DoT, sneeze, tender etc., drawn on the enemy itself (no corner icons, no ice block).

## Files
- `src/core/status.ts` (applyHitEffect, CC immunity 3 s), `src/game/phaser/fx.ts`, `actors.ts`, `combatFeedback.ts`, `telegraph.ts`
- Teh tarik pour: `tehPour.ts` (ribbon, droplets, froth puff), `tehCue.ts` (cup pop), `stall.ts` (`pouring`, `cupMouth()`); Kannan's hurt zone: `hurtZone.ts`

## How it works
- Sim holds status values; Phaser tints, particles and postures enemies.
- Mint chutney chills then freezes; curry = spicy DoT; masala sneeze cloud planned.
- Damage popups scale-pop; crit shows gold number with "!" and crunch. Combat haptics gated by wall-clock (`FeedbackGate`).
- Duplicate freeze/stun bursts suppressed.
- Teh tarik haste (5th hit, 3 s): while it runs in a wave, a thin caramel ribbon is pulled from the cup on the counter up to Kannan's throwing hand, foam droplets fall off it, thrown breads leave a faint caramel trail, and when haste ends a small froth puff rises from the cup. Pooled (fx pool, one Graphics). Reduced motion: tint only (warm cup glow, breads in flight tinted caramel, no ribbon, droplets or puff).
- Kannan's hurt zone: a faint ellipse on the floor under him, as wide as the sim's hurt zone (`FIELD.kannanHitHalfWidth`), flashing red while `hurtAnim` runs. The telegraph reticle for volleys uses the same width.

## Status
Live; freeze look kept as is until owner judges. Last change 2026-10-14 (teh tarik pour, hurt-zone ellipse).

## Research
- Used: [game-feel](../research/game-feel.md), [decomp-status](../research/decomp-status.md).
- Not yet: [decomp-status](../research/decomp-status.md) stat-stage table (-6..+6), star-burst popup ring; flake/crumble mechanic (PLAN-2 #14), sneeze cloud (#13); [malleable-dev-flow](../research/malleable-dev-flow.md) P4 flags.

## TODO
- Statuses are flat per-hit numbers; no stage table.

Related: [sim-core](sim-core.md), [dips-simmer](dips-simmer.md), [audio-sfx](audio-sfx.md).
