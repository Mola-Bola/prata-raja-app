# Updates without reinstalling

Prata Raja ships JavaScript changes to phones over the air (OTA) from its **cloud** Supabase project, and hands out new APKs from the same place.

## Where things stand (12 Oct 2026)

- **Supabase** project `prata-raja`, ref `nzxgskzmofddxyjocduq` (ap-southeast-2, Pro org). The five starter migrations are applied (`supabase db push`), the `updates` function is deployed (`--no-verify-jwt`), the storage upload limit is 150 MiB (like Hatch and Kampong), auth site URL and redirects are set (`https://mola-bola.github.io/prata-raja`, `prata-raja://**`). Not done yet: `private_config.admin_emails` (needs the owner's address; nobody signs in yet) and Google sign-in.
- **EAS** project `@uzzzy/prata-raja` (`extra.eas.projectId` and `owner` in app.json). `eas.json` profile `apk` carries the three public `EXPO_PUBLIC_*` values (the publishable key is public by design). The release key is held by EAS (uploaded with `~/cell/scripts/eas-keystore.cjs`); `certSha256` is in akit.json.
- **Release key** `~/.prata-raja-secrets/prata-raja-release.jks` (JKS, alias `prata-raja`, `signing.properties` beside it), backup `~/Backups/prata-raja-secrets-2026-10-12/`. **The owner should copy that backup off the Mac: lose the key and no phone can ever take an APK update.**
- **Firebase** Android app `app.prataraja` is registered in `family-kampong`; `ship-cloud --apk` sends each APK to App Distribution group `family`.
- **GitHub**: source `Mola-Bola/prata-raja-app` (private), web build `Mola-Bola/prata-raja` (public, GitHub Pages, built files only: `scripts/publish-web.mjs`).
- Not in the Cell runner yet (`~/cell/runner/apps.json`): the lead decides when.

First APK (runtime `1`, versionCode 1; commit everything first, `akit ship` wants a clean tree and a review marker for `app.json`/migrations):

```bash
~/cell/akit/akit check
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --apk --cloud --notes "First Prata Raja build"
```

After that, every JS change:

```bash
~/cell/akit/akit check
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --notes "What changed, in plain words"
```

(`--no-web` skips the GitHub Pages publish.)

## First-time setup (once the owner has created the Supabase project)

1. `node scripts/set-project.mjs <project-ref>`: writes `projectRef` into `akit.json` and the updates URL into `app.json` (and turns updates on).
2. Put the cloud keys where the scripts read them (never in git, never in a chat): `.env.cloud` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, chmod 600) and `.env.production` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL`: baked into shipped bundles).
3. Apply the migrations in `supabase/migrations/` to the cloud: `supabase link --project-ref <ref>` then `supabase db push --linked` with `SUPABASE_ACCESS_TOKEN` (from `~/.cell/supabase-token`) and `SUPABASE_DB_PASSWORD` (`PRATA_DB_PASSWORD` in `~/.cell/prata-raja-db.env`) in the environment, never printed. (The Mac's ship-guard hook stops a hand-run `db push` unless the command ends with a `# desk-ok: <reason>` comment; the CLI can also hang after finishing, so check `supabase_migrations.schema_migrations`.) Or use the Supabase MCP `apply_migration`. Then compare `scripts/db-fingerprint.sql` on both sides; every row must match.
4. Deploy the manifest function: `TMPDIR=$HOME/.supabase-tmp/ supabase functions deploy updates --project-ref <ref> --no-verify-jwt`.
5. Auth settings for the cloud project (site URL and redirect URLs `prata-raja://**`, email confirmation on, anonymous sign-ins off) are set in the Supabase dashboard or with the Management API (`PATCH https://api.supabase.com/v1/projects/<ref>/config/auth` with `site_url` and `uri_allow_list`, bearer `~/.cell/supabase-token`; done 12 Oct). **Never push `supabase/config.toml`: it is the local test bench's.**
6. Put the owner's admin address in `private_config.admin_emails` (cloud), so their account becomes an admin (it sees every note).
7. Add the app to `~/cell/runner/apps.json` and write `~/cell/runner/playbooks/prata-raja.md` (copy another app's) so the runner works its inbox.
8. Android release key (first APK only): create it outside the repo in `~/.prata-raja-secrets/` (`prata-raja-release.jks` + `signing.properties` with `storeFile`, `storePassword`, `keyAlias`, `keyPassword`; override the folder with `PRATA_RAJA_SIGNING_DIR`). `plugins/with-release-signing.js` wires it into `prebuild` and fails if it is missing. **Never lose or change it: a phone only installs an APK update signed with the same key.**

## Ship a JS change

```bash
akit ship -- node scripts/ship-cloud.mjs --notes "What changed, in plain words" --ids 3f2a…,9bc1…
```

`akit ship` runs the release gate first (clean tree, `akit check` stamp, review markers for `reviewPaths`). `ship-cloud.mjs` exports the Android update with the production env, **refuses to ship a bundle that lacks the cloud publishable key or contains the Mac's test server address**, uploads it to the public `updates` bucket (`<runtime>/<UTC timestamp>/`), writes the manifest row in `ota_updates`, and records the release (`feedback.mjs record-release`, which marks the linked notes shipped). Phones pick it up on the next launch. The label defaults to the next patch after the newest cloud release.

## Ship a native change (new APK)

A change needs a new APK when it adds or updates a package with native code, changes a config plugin or permission in `app.json`, changes the icon or splash, or upgrades the Expo SDK. Bump `runtimeVersion` in `app.json` (`"1"` → `"2"`; the very first APK stays `"1"`), then build **on EAS** (the default; nothing builds on the Mac, 15 Android builds a month across all apps):

```bash
~/cell/akit/akit ship -- node scripts/ship-cloud.mjs --apk --cloud --notes "…" [--ids …]   # --eas-build <id> resumes an interrupted build
```

The APK is downloaded, gated (size under `maxApkMiB`, cert = `certSha256`, runtime and versionCode = app.json), published to the bucket, and sent to Firebase App Distribution (group `family`). Local Gradle is the fallback: build from a shell with the Java/Android env:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home; export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=~/Library/Android/sdk
akit ship --apk <path to the built apk> -- node scripts/ship-cloud.mjs --apk --notes "…" [--ids …]
```

It raises `android.versionCode`, runs `expo prebuild -p android --clean` and `./gradlew assembleRelease` (arm64 only), checks the APK's embedded bundle the same way, uploads it to the bucket (`apk/prata-raja-<label>.apk`), points `native_latest` at the public URL and publishes the matching OTA bundle. Old phones then see "New Prata Raja version → Download". A copy of the APK also goes to `apkDir` (akit.json) or `APK_DIR` when set. `--reuse-apk` re-publishes an APK that was built but failed to upload. **Size limit:** the free Supabase plan refuses uploads over 50 MiB (`maxApkMiB` in akit.json). Free disk first (`df -h /`, keep 8 GB+ free) and delete `android/app/build` afterwards.

## Local test bench

`bash scripts/dev-up.sh` starts the Mac's Supabase (project `prata-raja`, ports 595xx), serves the web build on :9490 and runs `scripts/updates-server.mjs` (an Expo Updates server for rehearsals) on :9492. Tests, `supabase db reset` and e2e only ever touch this bench. Plain `http` works because `expo-build-properties` sets `usesCleartextTraffic: true`. To test auth mails from a phone on the same Wi-Fi, put the Mac's address in `.env` (`EXPO_PUBLIC_WEB_URL`) and add `http://<mac-ip>:9490/**` to `additional_redirect_urls` in `supabase/config.toml` (it only has loopback addresses), then restart Supabase.

## Checking that the cloud serves updates

```bash
U=https://<ref>.supabase.co/functions/v1/updates
curl -si -H 'expo-protocol-version: 1' -H 'expo-platform: android' -H 'expo-runtime-version: 1' -H 'accept: multipart/mixed' $U | head -5   # 200 multipart, or 204 when nothing is shipped
curl -s $U/native-latest                                                                                                           # { runtimeVersion, version, apkUrl, … }
```

## Troubleshooting
- **Always 204.** The phone's runtime (Me → version) doesn't match any shipped runtime. **Always bump the runtime for native changes**, or an OTA bundle can call native code the installed APK doesn't have and crash on launch.
- **The update downloaded but nothing changed.** Updates apply on the next cold start; with `fallbackToCacheTimeout: 0` the first launch runs the cached bundle while the new one downloads, so it can take two launches.
- **Rolling back.** Check out the good commit and ship again; deleting an update doesn't downgrade phones that already have it.
- **A failed asset download or hash mismatch.** Never edit files inside a published update; ship a new one.
