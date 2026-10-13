# Signature slice — sol/signature

- Signature unlocks at stall L9 (the next free UNLOCK_TABLE level).
- Stall → Signature chooses a known base bread; saveStore persists the pure meta update.
- Legacy/missing/invalid choices default to Kosong; gear, training and recipes remain intact.
- Runs start that bread at L1. Seeded offers weight its bread/synergies ×1.6 and retain surprises.
- One link per run: picked Fish Curry automatically links to the signature.
- Its burn DPS and duration rise ×1.25, applying only to that bread and its filling.
- Cards name the link; upgrades retain it and evolution moves it to the evolved bread.
- Other dips and runs without a signature retain existing rules.
- Loaded Murtabak: every fourth successful serving enlarges one shot ×1.65,
  hits ×8 and bursts into six egg-sprite chunks (×1.5 base damage, 0.9 s life).
- Extra Dough adds no extra loaded payload; children never split recursively.
- Reuses bread/egg/explosion/smoke sprites, trails, sound and shake; no new art required.
- Publishing retains current + two previous `_expo/static/**` releases, pruning older chunks.
- Chunk failures reload once per browser session; blocked storage never causes a reload loop.

## Verification
- 300 seeds (1–300), chapter 1: four breads 57%, two 44%, solo Kosong 23%; all bands pass.
- Murtabak signature solo, no gear/training: 39/300 (13.0%), median wave 9; target 12–25%.
- Chapter 2: four breads 62.3%, two 32.0%, solo 10.3%; existing target assertions pass.
- `SKIP_DB=1 bash scripts/check.sh`: typecheck, Expo lint, brand lint, 736 tests pass.
- Web export passes. Signature-persistence/run-start and chunk-reload Playwright specs added.
- Browser tests blocked before launch: sandbox denies Chromium Mach bootstrap and server listen.
- Lead must rerun `SKIP_DB=1 bash scripts/check.sh --web signature.spec.ts` outside this sandbox.
- Database tests skipped; local bench unavailable. Phone feel/performance still needs owner review.
- No commits, pushes or shipping; all edits remain for the lead to commit.
