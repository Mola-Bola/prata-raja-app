# Prata Raja — handoff

## Now (15 Oct 2026, end of round 8)
- **Live: 0.4.51** (this repo). Free-movement runs only (counter mode deleted), top-down street, tiffin gifts with a paused 3-card choice, crowd + hit feel, walkable hub with signs and onboarding, UI system, spec tree, Kopi meal, sockets, workbench. This game keeps running untouched.
- **Direction changed:** the owner wants a fresh start. The new game is **~/prata-legend** (GitHub Mola-Bola/prata-legend, private). Read its DESIGN.md + docs/plans/build-plan.md. Picks: woodcut-print material (carved teak for relics/menus), Kannan the night stallholder.
- **Backend:** same Supabase project. `legend_saves` migration is written in prata-legend but NOT applied: the ship-guard hook requires the reviewed migration flow. Apply before the new game's first cloud save.
- **Next:** in a fresh session in ~/prata-legend, Phase 1 (look lock: kit gallery + 10 s feel reel), then Phase 2 vertical slice.
- **Concept pages:** v2 https://claude.ai/artifact/JmFK6yTCFBrvhMipNhvoGW · v3 https://claude.ai/artifact/7A3XgoGCCeBFNWX6dsj8sG · v4 https://claude.ai/artifact/FfNPGcT2M28z7QCWCqtc3K · picks https://claude.ai/artifact/TQxb6w8SFwrxs6mKLF5ayM. Art: ~/prata-raja-assets/{v2,v3,v4}.
- **Open in this repo:** 21 stale e2e specs (old screens); not worth fixing, the UI is being replaced.

## Now (14 Oct 2026)
- Live: 0.4.14. Steering is DIRECTION.md "Direction 2.0" (the Codex fleet is retired). Working rules: AGENTS.md "How we work now".
- Ship each slice with `bash scripts/ship-fast.sh` from clean main; CI runs the full suite after.
- PLAN-2 progress: slices 1, 2, 3, 5, 6 done. Next: 7, 8, 9 (docs/PLAN-2.md).
- QA debt: no real-phone pass yet (notch, haptics, FPS). Economy pacing needs playtest evidence; gear-look art is not wired.
- Saves: legacy zero-run saves may see the skippable prologue once (accepted).
- Owner-only: copy `~/Backups/prata-raja-secrets-2026-10-12/` off the Mac.
- Older handoff notes and fleet history are in git history, not here.
