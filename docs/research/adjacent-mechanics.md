# Adjacent-game mechanics (Brotato, Halls of Torment, Death Must Die, Path of Building) — 14 Oct 2026

Owner-supplied synthesis from a separate research session. Numbers are leads (secondary sources); the structure is the usable part. Nothing copied.

## Sources and quality
| Reference | Primary source? | Data quality |
|---|---|---|
| Brotato | No (fan wiki brotato.wiki.spellsandguns.com, Steam) | Numeric but conflicting, patch drift |
| Halls of Torment | No (Prima Games blessings guide, CommonsenseGamer, Steam) | Mostly player-reported; blessing count conflicts (6/16/25) |
| Death Must Die | No (Prima Games, Prodigy builds guide, Steam) | Structure only; no synergy/stacking/cap rules found |
| Path of Building (PoE calc) | Yes (PoB repo docs incl. modSyntax, PoE wiki mirror) | Best for structure; not PoE values |

## Patterns to use
1. Damage order: base → conversion → additive "increased" → separate "more" multipliers → crit (PoB, measured).
2. Conversion before scaling; converted damage keeps original modifiers (PoE wiki, measured).
3. Conversion output capped per source type — cap the output, not the input (PoE wiki, measured).
4. Per-stack bonuses with caps, e.g. +1% per kill up to 50% (Halls of Torment, secondary) — template for chain/timing bonuses.
5. Uncapped damage % with per-hit floor and falloff; pierce loses 50% per hop, compounding (Brotato wiki, secondary).
6. Archetype-locked blessings, e.g. projectile-only (Death Must Die, secondary) — template for lane-locked fusion nodes.
7. Late offers gated behind prerequisites (DMD, secondary) — template for fusion unlocks.
8. Per-level growth with caps (DMD patch notes, secondary).
9. Armour as reduction curve: dmg × 1/(1 + A/15) (Brotato wiki, secondary) — candidate, verify.
10. Hard on-screen enemy cap, overflow removed silently (Brotato wiki, secondary).

## Corrections to earlier design (treat as untested)
- Attack-speed curve Cap·(1−2^(−raw/k)) is asserted, not referenced: use a simple soft cap until tested.
- "Enemy HP tracks player DPS band": no reference; untested.
- Brotato attack-speed cap conflicts (12/s vs none): don't use.
- Crit multiplier stacking: treat as additive until PoB CalcOffence is read.

## Gaps
- Death Must Die: no published pair/set synergy, stacking type, stack caps or weapon merges — must be designed.
- PoB CalcOffence order of operations not read; 95% crit cap is PoE2 third-party.
- Not checked: public decompiles of Halls of Torment / Death Must Die.

## How it maps to Prata Raja today (lead read, 14 Oct)
- Our `rollHit` (src/core/stats.ts) = base × (1 + additive dmg%) × crit × taken. Matches pattern 1 minus conversion and a separate "more" layer: add a `more` multiplier list (dips/uniques/keystones) and a conversion step (e.g. curry converts part of hit damage to Heat) before scaling.
- Pattern 5: Appam already has `hopFalloff` (15%/hop); pierce has none — falloff is the right limiter.
- Pattern 10: director LIVE_CAP (8) throttles spawns but does not remove overflow; a hard cap is cheap insurance for phones.
- Pattern 6/7 → spec tree keystones and dip fusion unlocks (lane-locked nodes, prerequisite-gated offers).
- Crit is already additive (critMult + critMultAdd).
