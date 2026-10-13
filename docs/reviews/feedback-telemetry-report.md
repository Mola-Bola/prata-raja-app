# Tell Kannan in the game + PostHog analytics, replay and error tracking: build report

Branch `s2/feedback` (worktree `~/prata-raja-fb`, from main `9653b84`). Built and verified; **not merged, pushed or shipped**. The lead's job from here: merge (recipe in section 5), add two lines to `.env.production`, ship an OTA (JS only: no native change, no runtime bump).

## 1. What it does
- **Tell Kannan** button on the pause sheet and on the results screen (and `openFeedback()` for the stall hub) opens a sheet: multi-line note box with a clear x, chips Bug / Idea / Balance / Art, an optional "From" name (remembered), Send with sending / sent / failed states (a failed send keeps the text and offers Retry; a retry is the same note id, so it can never file twice). It attaches app version, OTA update id, platform, device model, screen (title / hub / run / results), wave, level, run seed and the build (breads and dips with levels).
- The note lands in the existing `public.feedback` table, so `node scripts/feedback.mjs digest` and the Cell runner see it. Verified live (section 6).
- **Analytics, session replay and error tracking** (posthog-js inside the DOM component, so web and the APK's WebView behave the same, no native module): events `app_open`, `run_start`, `run_end`, `level_up`, `card_pick`, `boss_spawn`, `feedback_sent`, plus `$exception`; replay with the canvas at 2 fps and inputs masked; an **Analytics** switch in the pause sheet (default on, remembered). Full details: `docs/TELEMETRY.md`.

## 2. Feedback path chosen: (b) the `game-feedback` edge function, and why
The game has no account, and the WebView has no localStorage. (a) anonymous sign-in would have meant: switching on anonymous sign-ins for the whole project (it was switched off on purpose, `docs/UPDATES.md`), supabase-js and a bridge-backed session store inside the game bundle, one profile row per device, and no server-side check on what an anonymous user inserts (any size, any module, no rate limit, plus storage-upload rights). (b) needs no auth change and no supabase-js in the game: the game POSTs one `text/plain` JSON body (no CORS preflight) and the function:
- checks shape and size (body at most 1000 chars, request at most 8 KB, uuids, enum chip, context values dropped when odd), strips control characters;
- allows 6 notes per device and 120 in all per hour (429 beyond), counts rows by `params->>device_id` and `params->>src`;
- files the row with the service role under ONE system profile "In-game" (an auth user `in-game-notes@system.invalid`: a reserved domain, no password, so nobody can sign in as it; its id is `private_config.game_feedback_author`, created on the first note);
- row: `kind` bug / idea / change (Balance and Art are `change`, kept as tags `balance` / `art`, every game note also has `in-game`), `screen` "Game: run, wave 7", `route /play`, `platform`, `app_version`, `update_id`, `device`, and `params` {src, chip, device_id, from, seed, wave, level, build, screen, runtime}; status `new`, module `prata-raja` (table defaults);
- is idempotent on the note id (the game makes it once and keeps it across Retry) and never logs a note.
Deployed with `--no-verify-jwt`, like `updates` (command in `docs/FEEDBACK.md`). Anonymous sign-ins stay **off**.

## 3. Analytics decisions worth knowing
- **One source per event.** The four events RunScene already reports through `bridge.track` (`run_start`, `run_end`, `level_up`, `card_pick`) are derived from the hub instead (richer: seed, chapter, level, card id) and the renderer's copies are dropped in `trackFromRenderer`, so nothing is sent twice. RunScene is untouched (the other engineer owns it); its four `track` calls can simply be deleted later. `level_up` counts a level once (a reroll re-opens the same offer); `card_pick` comes from `GameUi.pickCard` because the hub does not say which card.
- **The relay's CORS quirk.** posthog-js needs the project's remote config for replay, and fam-relay serves `/array/<key>/config(.js)` without an `Access-Control-Allow-Origin` header, so browsers refuse it and replay never starts (events still work). `telemetry.ts` loads `config.js` with a plain script tag first; the SDK then uses the config already on the page. Fixing the worker (one header on asset responses, `~/cell/proxy/src/worker.mjs`, then wrangler deploy) would make that step unnecessary; I did not touch it.
- **Bot filter.** posthog-js drops events from webdriver/HeadlessChrome browsers. Playwright checks therefore spoof the user agent; a real Android WebView is not filtered.
- **Test tagging.** `?bot=1` or `?test=1` registers `test: true` on every event (filter `test != true` in charts). A `?bot=1` run never touches the screen, and posthog-js uploads no replay until the first touch.
- **Device state lives in its own bridge key** `prata-raja/device` ({id, from, analytics}), not in `SaveV1`: no conflict with S2's save store, and a progress reset leaves the device id alone. The "analytics save setting" is that key's `analytics` field.
- **Off means off:** events, replay and `$exception` all stop (verified); on again resumes replay with a fresh full snapshot.
- Env: `EXPO_PUBLIC_POSTHOG_HOST` / `EXPO_PUBLIC_POSTHOG_KEY` (public values, the fam-relay URL and project key); on only when both are set. Added to `eas.json` (APK builds). **`.env.production` (OTA and web) needs the same two lines**; I may not touch that file. Verified in the Android OTA export that the DOM bundle carries both values, the function URL and the recorder, and the Hermes bundle carries none of it.

## 4. Files
New: `src/game/{feedback,deviceState,appInfo,telemetry,telemetryCore}.ts` · `src/game/ui/FeedbackSheet.{tsx,css}` · `supabase/functions/game-feedback/{index,logic}.ts` · tests `supabase/functions/game-feedback/__tests__/logic.test.ts`, `src/game/__tests__/{feedback,deviceState,telemetry}.test.ts` (+80 tests; one reads the foundation migration and checks every chip maps to an existing `feedback_kind`) · `e2e/web/feedback.spec.ts` (4 specs) · `docs/TELEMETRY.md` · `docs/reviews/feedback-telemetry-check/` (build and check scripts, section 6).
Changed (small, marked `[feedback hook]` / `[analytics hook]`): `src/game/ui/GameUi.tsx` (+11) · `src/game/GameRoot.tsx` (+13) · `src/app/play.tsx` (+4) · `eas.json` · `.env.example` · `.gitleaks.toml` (the PostHog project key is allowlisted like the Supabase key; the sibling apps' form) · `docs/FEEDBACK.md`, `docs/UPDATES.md` · `package.json`, `package-lock.json` (`posthog-js ^1.438.7`, JS only; the self-contained "no-external" build, +741 KB min / 216 KB gzip in the game bundle).

## 5. Hook points, and the merge recipe for S2's GameUi / GameRoot
S2 rewrote `GameUi.tsx` (save store, stall hub, new Results) and touched `GameRoot.tsx`; expect conflicts in those two only. Re-apply:

`src/game/ui/GameUi.tsx`
1. imports: `import { trackCardPick } from '../telemetry';` and `import { AnalyticsSwitch, FeedbackLayer, TellButton } from './FeedbackSheet';`
2. in `pickCard(i)`, first line: `trackCardPick(offer?.cards[i]);`
3. last child inside `<div className="gu-root">`: `<FeedbackLayer hub={hub} screen={screen} />` (it maps S2's `'stall'` to "hub" itself)
4. Pause sheet: `<TellButton />` after the Quit / End run button, and `<AnalyticsSwitch />` as the last child of `.gu-switches` (it spans both columns; it does not depend on where `Switch` lives)
5. Results: `<TellButton />` as the last button (in S2's layout, inside `.sh-result-actions` or as a small link)

`src/game/GameRoot.tsx`
1. imports: `import type { AppInfo } from './appInfo';` and `import { startTelemetry, trackFromRenderer } from './telemetry';`
2. `Props`: `info?: AppInfo;` and destructure `info`
3. facade: `track: (event, props) => (trackFromRenderer(event, props) ? Promise.resolve() : latest.current.track(event, props)),`
4. after `const hub = useMemo(...)`: `const infoRef = useRef(info); useEffect(() => startTelemetry({ hub, bridge, info: infoRef.current ?? null }), [hub, bridge]);`

`src/app/play.tsx`: `const info = useMemo(() => appInfo(), []);` and `info={info}` on `<GameRoot>`.
Stall hub, later: `import { openFeedback } from '../FeedbackSheet'` and call it from a button.

## 6. Verification
Checks: `npx tsc --noEmit` clean · `npx vitest run` 40 files / 586 tests pass (was 36 / 506) · `npx expo lint src` clean · `node scripts/brand-lint.mjs` clean · `node scripts/assert-guard.mjs main` ok · gitleaks clean · `deno check` of the function ok · full web e2e 14/14 (existing 10 + `feedback.spec.ts`) on a CI-like build (no PostHog keys, so analytics are off there and the dev-log fallback is exercised).

**Cloud inbox (real).** Function deployed to `nzxgskzmofddxyjocduq`. Real insert by curl: row **`9c1ddeff-8744-4e94-9d8a-74f9b2398ccb`**; through the real game UI (live Playwright session): row **`66d49ba6-f0b0-49d1-a68f-893492a60105`**. Both showed in `node scripts/feedback.mjs digest` under "Family notes: triage" ("change on Game: run, wave 7 by In-game: ...", `show` prints the params and tags), then were closed with `status wont_do`. A retry with the same id answered ok without a second row; the 7th note from one device got 429 "slow down"; a second device was not limited. In all 8 test rows were filed (`wont_do`: 9c1ddeff, 8d0e95c4, 43a5035b, 98a9ed87, fac22154, bcc5e1c4, c7087d6e, 66d49ba6); the digest says "Nothing open".

**PostHog (EU project 290542, queried with the personal key).** Events seen for the UI session, device `915bd33e-41fe-473b-8477-404392ac5677`: `app_open`, `run_start` {chapter kopitiam-street, seed}, `level_up`, `card_pick` {kind dip, id masala}, `feedback_sent` {kind balance}, `$exception` x2, `run_end` {wave, won, kills, secs, level}; all with `app prata-raja`, `app_version`, `test true`, `$process_person_profile false`. A bot session (`?bot=1&seed=3&speed=8`, device `6f4d2b1a-8c3e-4a57-9d21-0b7c5e9a1f34`) added `boss_spawn` {name "King Cockroach"} and a natural `run_end` {wave 10, won true, level 12, kills 247}. **Replays exist:** `01a12f89-0e6c-7591-a288-047787fef02b` (29 s, 139 rrweb events, 455 KB, canvas frames included) and `01a12f90-2bc4-76d5-9812-6f28fb855f75` (116 s, 512 events, 2.3 MB), at `https://eu.posthog.com/project/290542/replay/<id>`. Decoded locally: canvas frames are real game pictures (final setting: 130x281 webp, about 6 KB each, 2 per second; the first replay above was recorded with an earlier 156 px setting).
Privacy and switch (capture mode, nothing left the machine): the typed note and name reach PostHog only as asterisks (the words appear in no body); with Analytics off nothing was sent for 7 s (events, replay, an uncaught error) and on again replay resumed with a new full snapshot. Console: no errors except the deliberate test exceptions.
Cost: replay uploads about 18 KB/s of payload while playing (roughly 1 MB a minute before gzip; very roughly 8 to 10 MB for a 10-minute run).

**Frame rate** (`?bot=1&seed=3`, 390x844 at 2x density, Chromium on the Apple M3 GPU; Analytics off against on with replay uploading; alternating runs):
- 60 Hz: 60.00 against 59.95 fps (4 runs each); 95th-percentile frame 16.7 ms both; frames over 25 ms 0% against 0.06%.
- frame limit off (CPU-bound): 545.9 against 544.7 fps (5 runs each, -0.2%); main-thread cost per frame 1.64 against 1.65 ms (capped runs 0.85 against 0.99 ms).
- Software GL at 1x density gave 14-55 fps in both modes because the Mac was at load average 30-100 (other sessions), so it says nothing. Impact is well under 10% on desktop; **no phone was measured**.

Reproduce (`docs/reviews/feedback-telemetry-check/`): `bash .../build-web.sh` then `node scripts/serve-web.mjs 9591 &`, `node .../ui-session.mjs --mode capture` (add `--mode live` for the real thing: it files one note, close it), `node .../fps.mjs --mode off|capture --uncap 1`, `node .../phq.mjs "<HogQL>"`.

## 7. Changes outside the repo made during the build
- Supabase `nzxgskzmofddxyjocduq`: edge function `game-feedback` deployed (live now; harmless until a build calls it); auth user `in-game-notes@system.invalid` + `private_config.game_feedback_author`; the 8 closed test rows. No auth or other project settings changed.
- PostHog 290542: no settings changed. Test traffic: 3 live sessions tagged `test: true` (two above, plus an earlier debug run, device `11111111-2222-4333-8444-555555555555`, 2 events tagged `bot: true` from before the tag was renamed) and the two replays above (delete them in PostHog if unwanted).
- `~/prata-raja-fb/node_modules` is now a real install (npm replaced the symlink); main's `node_modules` is untouched, so run `npm install` in main after merging (new dependency).

## 8. Needs the owner or the lead
1. **`.env.production`**: add `EXPO_PUBLIC_POSTHOG_HOST` and `EXPO_PUBLIC_POSTHOG_KEY` (same values as `eas.json`) before the next ship, or OTA and web builds go out with analytics silently off. (`ship-cloud.mjs` only asserts the Supabase key; adding a PostHog assertion there is worth a line.)
2. **Decisions:** replay default-on and its data use (about 1 MB a minute on mobile data while playing; tune `CANVAS` in `telemetry.ts`, or default Analytics off for the kids' phones); whether game notes should be treated as the owner's (build without asking) instead of "Family notes: triage" (the function could file `approved`, or a secret in-game code could pick the owner's profile); wording about analytics and replay wherever the app's privacy text lives (there is no privacy page in this repo).
3. **fam-relay** (optional): CORS header on `/array/*` asset responses; then the config.js preload in `telemetry.ts` can go.
4. **Check on a real Android phone** (WebView): the soft keyboard with the sheet, replay and canvas capture working, frame rate. Everything here was verified on desktop Chromium plus the Android OTA export (bundle contents only).

## 9. Known limits
- Self-playing runs (`?bot=1`) pick cards without the UI, so they report no `level_up` or `card_pick`; real play does.
- The rate limit counts rows by scanning `params` (add an expression index if the table grows); the global cap of 120 an hour also means a flood could use it up. A new install (or cleared app data) is a new device id.
- Abandoned runs (Restart) report `run_start` twice and one `run_end`.
- `docs/SPEC.md` still lists the old telemetry line; I left it alone because S2 edits that file.

## 10. Merge and ship
```
cd ~/prata-raja                  # or the S2 integration worktree
git merge s2/feedback            # resolve GameUi.tsx / GameRoot.tsx with section 5 if S2 landed first
npm install                      # posthog-js
# .env.production: append the two PostHog lines (section 8.1)
bash scripts/check.sh --web      # tsc, lint, brand, vitest, build, e2e (feedback.spec.ts included)
bash docs/reviews/feedback-telemetry-check/build-web.sh && node scripts/serve-web.mjs 9591 &   # then ui-session.mjs --mode capture on the merged build
SKIP_DB=1 ~/cell/akit/akit check && ~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --notes "..."   # OTA only
```
No migration, no `app.json` change, no runtime bump (posthog-js is JS; `expo-device`, `expo-constants`, `expo-updates` are already in runtime 1).
