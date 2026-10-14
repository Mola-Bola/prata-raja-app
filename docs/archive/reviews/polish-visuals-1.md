# Counter bread readiness — polish visuals 1

The owned bread stack now shows which breads are cooling down: sprites dim to 62% opacity after firing and brighten to full opacity during the last 300ms of cooldown. A cooldown reset gives the existing sprite a small 180ms compression and recovery, making repeated throws visible on the counter without adding particles or new artwork.

- Reduced motion disables the new compression; the readiness opacity remains readable.
- Continuously orbiting Vadai stays bright and does not compress.
- Pickup and upgrade pops retain their original timing and take priority over throw compression.
- Replacing a bread resets its visual cooldown and throw state.
- All feedback uses the existing four pooled counter images; no per-frame objects, tweens, textures or dependencies were added.
- Gameplay, projection and the rendered artwork are unchanged.

## Ownership

- `src/game/phaser/stall.ts`
- `src/game/phaser/RunScene.ts` (passes the existing reduced-motion preference)
- `src/game/phaser/__tests__/stall.test.ts`

## Verification

- Focused Stall tests: 4 passed. Covers cooldown/ready opacity, throw recovery, reduced motion, Vadai, upgrade pop and replacement.
- Targeted ESLint: passed.
- `npx tsc --noEmit`: passed.
- `SKIP_DB=1 bash scripts/check.sh`: typecheck, lint and brand checks passed; DB skipped. Default Vitest loader could not write bundled config to shared read-only `node_modules/.vite-temp` (EPERM), before tests started.
- Full unit suite with `npx vitest run --configLoader runner`: 56 files, 753 tests passed.
- `git diff --check`: passed.

## Limits

No browser export or phone visual playtest was run, per the disk constraint. The new motion is intentionally small and should be checked on a phone before shipping. The game currently has no low-effects setting; the cue adds no particle allocation and uses the existing reduced-motion preference.
