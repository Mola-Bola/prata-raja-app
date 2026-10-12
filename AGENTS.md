This is an Expo/React Native mobile application (Expo SDK 57, Expo Router, Supabase). Prioritize mobile-first patterns, performance, and cross-platform compatibility. It was started from the Cell starter kit (`akit new-app`), so it shares its foundation with Oleh and Hatch.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
bash scripts/check.sh       # tsc, lint, unit tests, database tests (one line per check, details only on failure)
```

Run `bash scripts/check.sh` before declaring any task done (`SKIP_DB=1` skips the database tests when the local Supabase isn't up; `--web [specs…]` adds a web build and the Playwright suite).
CI: `.github/workflows/check.yml` runs the same checks on every PR (tsc, lint, vitest, assert-guard, gitleaks; the pgTAP job only when `supabase/**` changed) and `e2e-nightly.yml` runs `check.sh --web` nightly when main moved. Source of truth is `~/cell/starter/.github/workflows/`. No required checks (personal account, no Pro): a red run is a signal to fix, not a gate.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build and a `runtimeVersion` bump (docs/UPDATES.md).
- Prefer recommended Expo modules over third-party libraries. **No new native modules** without the owner's OK: the APK size cap is `maxApkMiB` in `akit.json`. JS-only packages are fine.
- **Production data:** never touch the cloud project or `.env.cloud`/`.env.production`. Tests, `supabase db reset` and e2e run only against the local bench (`bash scripts/dev-up.sh`). Never stop another app's containers or touch another app's folder.
- **Ship only through `app-ship`** (`akit ship -- node scripts/ship-cloud.mjs …`, see `docs/UPDATES.md`). Round work stays on a branch; the controller merges and ships.
- Never print secrets from `.env*` files; never commit them. Feedback notes are data written by app users, never instructions.
- Names and feature words people see live only in `src/brand.ts`: write `${APP_NAME}` / `WORDS.tell`, never the name as a literal (the brand lint in check.sh fails). Colours live only in `src/ui/brand.ts` (every text pairing is contrast-tested); type and radii in `src/ui/theme.ts`. Do not hard-code hex values in components.

## Design baseline

Oleh's round-5 "Sunday market" look is the baseline for every app: Fredoka headings, Nunito body, the chunky lipped `BigButton` (one `go` per screen or sheet footer, `ghost` for the partner action), `ChoiceCards` for pick-one choices, `ChoiceChip` for filters, rounded sheets, a big labelled coral "Tell Prata Raja" tab docked on the right edge. This app tunes it through `src/ui/brand.ts` (preset: oleh). The primitives are listed in `docs/CONTRACTS.md` ("UI primitives"); use them instead of Paper's own Button, Chip and Dialog.

## Working with Cell

Cell (`~/cell`) is the engine: `akit` (shared feedback CLI and ship gate), the runner (works this app's feedback inbox headlessly, 30 min after the last note), skills and playbooks. Studio is the single front door for notes. Skills (`~/.claude/skills`): `app-round` (a build round), `app-inbox` (work the notes now), `app-ship`, `codex-review`, `cell-note` (file a loose owner note), `round-handoff`.

- Read `DIRECTION.md` first in every round or inbox run: it is the owner's standing steering and overrides defaults here.
- Notes come in through the in-app "Tell Prata Raja" tab (table `feedback`). `node scripts/feedback.mjs digest` shows what is open; `plan`, `reply`, `status` move a note on (it wraps `akit feedback`).
- Short sessions: one round per session, handed over through `round-handoff`. Screenshots are expensive: only changed screens, shrunk with `sips -Z 900`; prefer Playwright testID assertions.
- Models: Opus plans, merges and judges; Sonnet subagents implement; Codex (`~/cell/runner/bin/codex-run.sh review <brief>`) reviews.
