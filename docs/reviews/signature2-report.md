# Signature 2 — 0.4.1 / sol/signature2

- Stall → Signature: choose Roti Bomb, Appam or Murtabak; reload, then start a run.
- Every known base bread has a one-line identity; the existing signatureBread save field persists it.
- Roti Bomb implements DEPTH's heat route: signature hits ×1.7; every fourth successful serving
  charges one bomb, hits another ×4, widens its blast ×1.25 and leaves a ≥3 s hot patch
  at ≥2× base damage/sec. Inferno Bomb retains this route after evolution.
- Appam implements DEPTH's bounce-chain route: signature hits ×1.4; every fourth serving
  charges one bowl, hits another ×3, reaches 400 units and gets up to six hops with no falloff.
- Both reuse enlarged bread sprites, a short alpha tween and capped sprite trails;
  Roti Bomb also reuses explosion/smoke sprites. No Graphics art or new assets/dependencies.
- Failed throws do not charge; Extra Dough never creates a second charged payload.
- Fish Curry, Condensed Milk and Mint Chutney can auto-link; first two picks get links.
- A third eligible dip remains global. Upgrades preserve whichever ownership it received.
- Milk gets ×1.25 Sticky/crash duration; linked stacks apply at most once per target per 0.2 s.
- Mint gets ×1.25 chill/freeze duration; boss slow substitution and CC immunity stay intact.
- Fish retains ×1.25 burn DPS/duration. Runs without signatures retain global dips.
- Links follow base-bread identity through evolution and work when picked before or after it.
- Cards use “Linked to X” with base-bread names, all ≤25 chars; accessible copy names the effect.
- Package, lockfile root and app version set to 0.4.1; runtime/native modules unchanged.

## Checks
- Typecheck, Expo lint src, brand lint, Vitest: 749 tests / 55 files pass.
- Vitest requires --configLoader runner here: default loader cannot write through shared node_modules.
- SKIP_DB=1 bash scripts/check.sh: tsc/lint/brand pass; default Vitest hits that sandbox restriction.
- 300 seeds (1–300), ch1 four/two/solo: 57% / 44% / 23%; target bands pass.
- Signature solos: Murtabak 44/300 (14.7%), Roti Bomb 63/300 (21.0%), Appam 50/300 (16.7%).
- Ch2 four/two/solo: 62.3% / 32.0% / 10.3%; existing target assertions pass.
- E2E sheet specs cover each identity, selected state, reload persistence and L1 run start.
- Lead runs Playwright; not run here. Database tests skipped; phone feel remains unverified.
- Needed art: none for this slice; dedicated hot-patch/rebound sprites would improve readability later.
- No commit, merge or ship; lead owns those. Temporary check/balance logs deleted.
