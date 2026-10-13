# 0.3.1 prologue + street pests

- Six rendered portrait panels, gentle pan/zoom, captions ≤12 words, tap-through and always-visible Skip.
- First Start shows the story before run 1; Skip/finish commits `prologueSeen` through saveStore.
- Returning v1/v2 players bypass it, including old saves without a story flag; settings cog → Story replays and returns to stall.
- Reduced-motion preference disables pan/zoom; keyboard advance, Escape and contained focus supported.
- Mynah Thief (wave 3+) swoops at 170 u/s, steals up to 3 run coins once, then flies away without biting.
- Killing a fleeing mynah refunds its stolen coins once; escape pays no XP/gold. Empty jars never go negative.
- Drain Rat (wave 4+) emerges at y520–560, in three-rat packs near one drain; 6 base HP, 110 u/s.
- Rendered cutouts use existing clock-based flap/step tweens, drain emergence and a lifted escape turn.
- Locked recipe book now explains cooking evolved breads at stall level 6.
- Sliced story, mynah, rat, Grade Inspector, and three world-tier scenes; manifest and atlases repacked (3 pages).
- Story/world-tier scenes stay outside GPU atlases and the Phaser loader. Grade Inspector is art only.
- Version metadata set to 0.3.1; no native changes, commits, pushes or shipping.

## Balance — 300 seeds (1–300), chapter 1

| Bot | Wins | Target | Mean boss fight |
|---|---:|---:|---:|
| Four breads | 57% | 55–75% | 36 s |
| Two breads | 44% | 40–60% | 38 s |
| Solo Kosong | 23% | 10–25% | 36 s |

Chapter 2 unchanged: 62.3% / 32.0% / 10.3% (four / two / solo).

## Verification / open issues

- Requested tsc, vitest (724 tests), Expo lint, brand lint: passed; `SKIP_DB=1 bash scripts/check.sh`: passed.
- Web export passed; four browser specs discover 33 tests, including four prologue scenarios.
- Browser execution blocked before assertions: Chromium MachPortRendezvous denied, local :9493 listen EPERM.
- Lead rerun: `SKIP_DB=1 bash scripts/check.sh --web prologue.spec.ts play.spec.ts stall.spec.ts feedback.spec.ts`.
- Database tests skipped; Android/phone motion and timing need lead validation.
- Gear looks deferred: full painted scenes, unsuitable as transparent worn-gear layers. World tiers sliced but not wired.
- Slicer reuses supplied `~/cell/.design/prata-raja-2026-10-12/s1/slice_s1.py`; output assets are checked in by the lead.
