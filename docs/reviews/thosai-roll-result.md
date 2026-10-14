# Thosai cylinder roll — ledger 76

The original 256×254 art is a browned cylindrical crepe with its rolled mouth at the left. The renderer levelled its diagonal long axis with a fixed 0.7 rad rotation, then stretched the holder into a wide wave. It translated without any surface rotation.

## Final source candidate

`thosaiTexture.ts` aligns the owned art once and precomputes eight cylinder-surface frames. Actual toasted RGB detail wraps around the short axis through the centre of the food. Every frame keeps the original aligned silhouette/alpha, mouth and end caps; no whole-bar spin, squash, flip, glow or opacity animation is added. Sampling weights RGB by source alpha so hidden colours in transparent atlas pixels cannot bleed into the food.

The frames share one 512×1024 power-of-two canvas texture (2 MiB of RGBA texture pixels). Preparation happens once per Phaser game; every wave picks a cached frame from its interpolated travel and actual width, with no per-frame pixel processing or extra display objects. A width-240 wave at speed 700 advances about 23 frames/sec. Phase 7 returns directly to phase 0 after one width of travel. Travel stopping freezes the surface.

`actors.ts` keeps the original width denominator and holder scales, so visible food position, width and thickness remain fixed at any given perspective. Reduced motion uses the original static asset and creates no cylinder texture. Disc release restores rotation/scale; reuse resolves the next bread's original texture/frame through the existing pool. New runs reuse the one game-owned texture; Phaser's TextureManager owns its disposal when the game is destroyed.

No deterministic core code, geometry, collision width, speed, damage, lifetime, stats, hit history or RNG changed. No paid/generated art, dependencies, native modules, settings or rejected contact61 changes were added.

## Accepted prototype direction — not the final source gate

A prototype used the actual new mapper/preparation functions inside the **previous export**, with the real core creating level-two Thosai. The scene was paused, actual projectile travel supplied eight phases, and framing/perspective stayed fixed. The native Phaser renderer painted each frame. The temporary override was removed from the test source after capture.

At the displayed food size of roughly 100×16 px, toasted marks visibly migrate across the centre while the mouth, silhouette and long axis stay fixed. The lead provisionally accepted this direction for exact-source validation. This does **not** establish final-build browser correctness, release approval or real-phone feel.

Prototype evidence (all labelled prototype-only):

- `/tmp/prata-thosai-cylinder-prototype/prototype-cylinder-roll.gif`: eight phases at approximately real level-two speed, crop 180×84 px including label.
- `/tmp/prata-thosai-cylinder-prototype/prototype-cylinder-eight-phases.png`: eight native-size crops, 720×176 px including labels.
- `/tmp/prata-thosai-cylinder-prototype/thosaiRoll-Thosai-rolls-on-ff34a--axis-at-390-reduced-false-/prototype-cylinder-roll-{360,390,420,450,480,510,540,570}.png`.

## Focused source verification

`npx vitest run --configLoader runner src/game/phaser/__tests__/thosaiRoll.test.ts`: **5 tests passed**. They cover actual toasted-detail movement with unchanged alpha/mouth/end caps and input pixels; transparent RGB sampling; all eight frame indices and exact 7→0 wrap; actual Actors normal/reduced-motion paths; actual DiscPool restoration/reuse as Kosong; and one cached atlas across clear/restart. Canvas/scene objects are mocked in these source tests; the pixel mapper and Actors/pool code execute unchanged.

The final browser fixture is authored for 320/390 px, normal/reduced motion, constant axis/width/thickness, eight distinct surface frames, no simulation mutation, frozen travel, pool texture/frame restoration, restart atlas identity/count, and native CanvasTexture disposal after game destruction. It is **unexecuted against the final rebuilt source** because the lead held exports/check retries while disk was below the safe threshold. Earlier prototype passes are not substituted for that gate.

## Rejected experiments and retained failures

The first experiment used moving gradient bands and ±4.5% thickness. The lead rejected it: at actual size it read as a shimmer. A stronger narrow band/±12% thickness experiment was also rejected because toasted detail stayed static. Its strip/clip remain at `/tmp/prata-thosai-prototype/prototype-eight-phases.png` and `/tmp/prata-thosai-prototype/prototype-roll.gif`. Neither approach remains in the source.

The first full check/export pipeline ran against the rejected gradient candidate: typecheck, lint/brand and export completed; **947 unit tests passed / 7 timed out**, comprising six fleet-ledger 5-second timeouts and one pipeline 60-second timeout under host pressure. An import-order warning was fixed and its focused lint recheck passed. The first browser attempt had one floating-point-bound failure, corrected with a 1e-12 tolerance. A subsequent run passed the gameplay assertions but failed a 320 px reduced-motion context close with **ENOSPC** while Playwright wrote a network trace. These are retained evidence, not a green final-source gate. Logs remain in `/tmp/prata-thosai-roll-check/{tsc,lint,brand,vitest,build,e2e}.log`; old screenshots/traces remain under its `playwright/` and `browser-rerun/` directories.

Full mandatory checks and exact-source web export/browser validation remain for the lead's quieter-window gate. No further full retry or export was performed during the disk hold. Real-phone comfort/readability remains unverified.

Final candidate static checks: `npx tsc --noEmit` and focused ESLint over actors, texture helper, source tests and browser fixture **passed**. The only initial type error was ImageData's ArrayBuffer requirement; the mapper now declares its freshly allocated output buffer precisely. Frozen commit and branch CI status are supplied in the handoff.
