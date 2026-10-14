# Ship pipeline timing (measured 2026-10-14)

Measured on HEAD f9725ba, 8-core Mac. No publish, no push. Export written to the scratchpad, not the repo.

| Step | Measured | Proposal | Est. saving |
|---|---|---|---|
| `tsc --noEmit` | 5.3–6.6 s (2 runs) | Keep (esbuild does not typecheck). Run it in parallel with vitest and export. | ~6 s wall if parallel |
| `vitest --changed HEAD~3` | 89 s, 77 files / 1010 tests | Scope to directly changed test files in ship-fast; CI runs the full suite. | 50–75 s |
| `vitest --changed HEAD~1` (diff = app.json + package.json only) | 76–81 s, still 77 files | A version-only diff should never run the suite. Exclude those files from the base. | ~75 s on release-commit bases |
| `vitest --changed HEAD` (clean tree) | 1.1 s, 0 files | None needed. | — |
| `expo export -p web --clear` (cold, as publish-web runs it) | 34 s, 200 files, 17 MB | See persistent cache below. | — |
| `expo export` warm (no `--clear`, reused TMPDIR) | 3.6 s | Per-checkout Metro cache: TMPDIR keyed by repo-root hash, drop `--clear`, wipe when lockfile changes. | ~30 s per ship |
| `addPwaTags` + `retainWebChunks` | 0.10 s + 0.05 s | Nothing worth doing. | 0 |
| `ship-cloud.mjs --next-label` | 0.26 s (Supabase query) | None. | 0 |
| Version bump + `git commit` | not timed, under 1 s est. | None. | 0 |
| `git push` (source and Pages repo) | not measured (push not allowed here) | Unverified. Pages repo is ~200 files per push. | unknown |
| GitHub Pages build (last run) | 61 s (created 07:53:02, built 07:54:03) | Poll `gh api repos/Mola-Bola/prata-raja/pages/builds/latest` until `built`, then curl the new bundle. No fixed sleep. Actions-based deploy might shorten the build; unverified. | 0–30 s perceived |

Sequential ship-fast total excluding push and Pages: about 6 + 80 + 34 + 2 = ~122 s on a typical diff. Pages adds ~60 s after that.

## Ranked proposals (by seconds saved)

1. **Scope vitest in ship-fast** to directly changed test files, and skip the run when only `app.json` / `package.json` changed. ~50–75 s. Risk: a regression in an untouched module reaches users until CI runs. The owner accepts fix-forward, so this matches the stated policy.
2. **Run vitest, tsc and export concurrently** after the version bump. None of them feeds another. Order: bump, then (tsc | vitest | export) in parallel, then commit and publish. ~25–30 s; CPU contention on 8 cores likely trims this to ~20 s.
3. **Persistent per-checkout Metro cache** for publish-web and ship-cloud exports. ~30 s per ship after the first. The comment in publish-web.mjs says a shared cache leaked another checkout's routes; keying the cache by repo-root hash avoids that. Wipe it when `package-lock.json` changes. Measured warm number (3.6 s) reused the cache, so treat it as an upper bound on the gain.
4. **Incremental tsc** (`incremental: true` with `tsBuildInfoFile` under the scratchpad or TMPDIR). ~3 s on repeat runs. Lowest value; skip unless item 2 is done and the extra config is cheap.
5. **Pages verification**: poll `builds/latest`, then curl the new `_expo` bundle name. This removes human wait, not the ~61 s build.
6. **Not worth changing**: PWA tags, chunk retention, icon steps (not in publish-web), next-label lookup.

## Caveats

- Single runs except tsc (2) and vitest (3). Cold tsc was 9.9 s on the first call; later calls were ~6 s.
- The vitest base is `.fleet/last-web-ship`, which currently equals HEAD. The next ship-fast will test whatever was committed since that ship, so its cost depends on the diff, not on these numbers.
- Push and Pages propagation were not timed beyond the last Pages build record.
- The 4 untracked `docs/reviews/pipeline-*.md` files were already present from other work. This review did not touch them, and no other file was edited.
