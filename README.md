# Prata Raja

Expo SDK 57 + Supabase app started from the Cell starter kit (`akit new-app`). Brand preset: oleh.

```bash
npm ci                         # clean install (a fresh app may symlink node_modules from ~/oleh for its first check)
npx tsc --noEmit && npx vitest run
bash scripts/check.sh          # everything, one line per check (SKIP_DB=1 without the local Supabase)
npx expo start                 # run it
```

- `src/brand.ts` the words file: the app name, tagline and every feature word people see · `src/app/` screens (Expo Router) · `src/ui/` the design system (`src/ui/brand.ts` is the look) · `src/data/` Supabase hooks · `src/features/` feedback (its button says `words.tell`), links, settings · `supabase/` migrations, seed, tests, the `updates` function.
- Where each kind of change lives: `docs/CONTRACTS.md`. How the feedback loop works: `docs/FEEDBACK.md`. Hosting extensions: `docs/EXTENSIONS.md`. Shipping: `docs/UPDATES.md`. Steering: `DIRECTION.md`. Agent rules: `AGENTS.md`.

## Renaming the app

Every name people see comes from `src/brand.ts` (`brandWords`). Ids never change: the slug/scheme, the package id
(`app.json` `android.package`, `ios.bundleIdentifier`), table names, the repo name, the Supabase ref and `APP_ID` in
`src/ui/labels.ts`. A rename touches none of them.

1. **Words file.** In `src/brand.ts` change `appName`, `shortName` (12 characters or fewer), `description`, and the
   words that carry the name (`words.tell`, `words.team`, `permissions.microphone`, `permissions.speechRecognition`). Rename feature words the same way (`words.seeds`, an
   extension in `extensions`, a word in `lintWords`).
2. **Check.** `node scripts/brand-lint.mjs` (also in `bash scripts/check.sh`) must say "brand words clean": it fails
   on any guarded word written as a literal in `src/` or `supabase/functions/`. Then search the old name once by hand
   for prose the lint can't know about (`grep -rn "Old name" src supabase docs`): comments, docs, store text.
3. **Server text.** Add a migration (never edit the old one):
   `update public.private_config set value = 'New name' where key = 'app_name';`. Edge functions pick it up within a minute, no
   redeploy (`supabase/functions/_shared/app-name.ts` keeps it for 60 s per warm function).
4. **Ship.** An OTA carries the new words to every screen (`akit ship -- node scripts/ship-cloud.mjs --notes "New name"`).
   The web build takes the page title, manifest name and preview card from the words file
   (`scripts/web-pwa.mjs`), so publish the web app again.
5. **Needs a new APK** (native, not OTA): the name under the icon on Android and the microphone prompt
   (`app.config.js` reads them from the words file at build time). Bump `versionCode` and build as usual.
   New icon or splash art: `node scripts/render-icons.mjs`, also in that APK.
6. **Outside the app.** Store text, the privacy page wording, the Google sign-in consent screen's app name, email
   templates in the Supabase dashboard, and `name` in `akit.json` (what the tools print).

The app's folder, the web address and the package id stay as they are: see `~/cell/docs/NAMING-AND-GROWTH.md` for the
names that are expensive to change and when to decide them.
