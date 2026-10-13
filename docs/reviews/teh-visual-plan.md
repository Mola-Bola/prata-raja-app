# Teh counter haste cue — ledger 37

Bounded renderer polish consistent with DIRECTION.md's small playable improvements. In-game note `97cf030f` is an ambiguous visual-effect observation around Kosong + Teh in wave 2, not authenticated owner direction. No mechanics change: level-1 Teh remains every 5 hits, 3 seconds of +20% throw speed.

## Behavior

- Only the existing owned Teh cup receives the cue, and only during the `wave` phase with actual `haste.time > 0`.
- Activation or a timer refresh gives a 0.24-second scale pop (up to roughly 15% above normal including the pulse). Active duration uses a small 0–4% scale pulse and the existing warm `ELITE_TINT` palette color.
- The existing add/upgrade dip pop keeps its scale priority; the haste tint is still present. Expiration restores normal scale/tint immediately after any independent add/upgrade pop.
- Elapsed cue time follows decreases in the actual buff timer, rather than render time. Pausing freezes the scene already; a frozen timer also freezes the cue. Outside combat the cue becomes neutral while retaining timer history, so returning to combat does not invent an activation.
- Reduced motion uses a steady warm tint with no haste scale motion.
- Empty-player rendering, missing Teh ownership, cup replacement and reset clear the cue. Pool recycling retains its existing cleanup.

## Verification and limits

Focused helper and renderer tests cover activation, ongoing size budget, refresh, expiration, frozen timer, outside-combat resume, reduced motion, upgrade pop, replacement, empty player and reset. Existing bread readiness tests also run unchanged. Focused suite: 10 passed. `SKIP_DB=1 bash scripts/check.sh`: typecheck, lint, brand and all 890 unit tests passed; database checks intentionally skipped.

No assets, particle system, HUD text, UI, dependencies or deterministic core edits. Tint multiplies the existing art; this is a restrained cup cue, not an emissive glow. A refresh is recognized when the observed timer increases; multiple activations within one simulation/render interval cannot each receive a distinct pop. No web export or live visual inspection in this worker because the slice explicitly excludes disk-heavy export; lead should visually verify the existing cup in Test Kitchen before publishing.
