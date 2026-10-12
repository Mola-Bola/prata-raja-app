# Telemetry: analytics, session replay and error tracking (inside the game)

Code: `src/game/telemetry.ts` (posthog-js, started by `GameRoot`), `src/game/telemetryCore.ts` (event names, properties, the
guard; pure, tested), `src/game/deviceState.ts` (the anonymous id and the Analytics switch). It all runs **inside the DOM
component**, so the web build and the Android WebView behave the same and no native module is involved (OTA-safe).

**On/off.** On only when both `EXPO_PUBLIC_POSTHOG_HOST` and `EXPO_PUBLIC_POSTHOG_KEY` are set at build time: `.env.production`
(OTA and web bundles; a local, uncommitted file, so add the two lines before the next ship) and `eas.json` `build.apk.env` (APK
builds; committed, both values are public). The local `.env` has neither, so dev builds, the e2e suite and CI send nothing. The
**Analytics** switch in the pause sheet turns events, replay and error capture off on that device and is remembered.

**Anonymous.** `persistence: 'memory'` (the WebView has no localStorage), `distinct_id` = a random UUID kept by the bridge under
the game save key `prata-raja/device` (its own key, next to the progress save), `person_profiles: 'never'` (no identify, no person
properties, `$process_person_profile: false`). No autocapture, page views, heatmaps, web vitals or surveys. The relay
(`fam-relay`, `~/cell/proxy`) drops cookies and every client-IP header.

**Events** (all carry `app: prata-raja`, `version` and `app_version` (the same value; the Apps and Pilot dashboards group by
`app_version`), `platform`, and `update_id` when the phone runs an OTA):

| event | properties | from |
|---|---|---|
| `app_open` | `version` | once per page load, when analytics start |
| `run_start` | `chapter`, `seed` | hub `runStart` |
| `level_up` | `level` | hub `levelUp` (a reroll of the same offer is not counted again) |
| `card_pick` | `kind`, `id` (heal and gold: their kind) | `GameUi.pickCard` (`trackCardPick`) |
| `boss_spawn` | `name` | hub `boss` |
| `run_end` | `wave`, `won`, `kills`, `secs`, `level` | hub `runEnd` |
| `feedback_sent` | `kind` (bug, idea, balance, art); never the words | the Tell Kannan sheet |
| `$exception` | posthog-js error capture (uncaught errors and promise rejections) | automatic |

Only numbers, booleans and short labels pass (`cleanProps`); anything else is dropped. The renderer's own `bridge.track` calls
(`run_start`, `run_end`, `level_up`, `card_pick`) are **not** sent a second time: the facade in `GameRoot` hands them to
`trackFromRenderer`, which drops the four the hub already covers and passes any other event through (when analytics are not
configured they go to the app's dev log as before).

**Test traffic.** A page opened with `?bot=1` or `?test=1` registers `test: true` on every event, so charts can leave it out
(`test != true`). A `?bot=1` run never touches the screen, so posthog-js (which holds the replay until the first touch) uploads no
replay for it.

**Replay.** On, with `maskAllInputs` (the note box and the name are masked: only asterisks reach PostHog) and the canvas recorded at
2 fps, 130 px wide, quality 0.3 (`CANVAS` in `telemetry.ts`). Measured: about 6 KB a frame, roughly 1 MB a minute of play before
gzip (the HUD and sheets are recorded as page structure). The recorder uploads only after the player's first touch, and stops when
the Analytics switch goes off.

**Remote config, and a relay quirk.** posthog-js reads the project's replay settings from `<host>/array/<key>/config` (CORS fetch) or
`config.js` (script tag with `crossorigin`). The relay's copy of those files carries no `Access-Control-Allow-Origin` header (it
fetches them without the caller's `Origin` and caches the answer), so a browser refuses both and replay never starts. `telemetry.ts`
therefore loads `config.js` itself with a plain script tag (no CORS needed) before `posthog.init`; the SDK then uses the config
already on the page. If the relay's worker ever adds CORS headers to `/array/*` that step can go.

**Where it goes.** PostHog EU project 290542 ("Apps") through `https://fam-relay.nambikkai-inbox.workers.dev`. The project already has
session replay and exception autocapture switched on (project settings); canvas capture is requested by the client.

**Adding an event.** Add its builder to `telemetryCore.ts`, emit it from `telemetry.ts` (hub) or the UI, add a test and a row above.

**Cost, and how to re-check.** Measured on desktop Chromium (Apple M3 GPU, 390x844 at 2x density, `?bot=1&seed=3`), Analytics off against
on with replay uploading: 60.0 against 59.95 fps at the screen's 60 Hz (95th-percentile frame 16.7 ms both), 545.9 against 544.7 fps with
the frame limit off (-0.2%), main thread +0.15 ms a frame. Not measured on a phone: check one before widening the pilot. Repeat the checks
(and see what reached PostHog) with `docs/reviews/feedback-telemetry-check/` (`build-web.sh`, `ui-session.mjs`, `fps.mjs`, `phq.mjs`; usage
in each header and in `docs/reviews/feedback-telemetry-report.md`).

