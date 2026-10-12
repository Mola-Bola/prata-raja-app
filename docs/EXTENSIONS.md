# Extensions (apps that host other apps)

A host app (Kampong is the first) keeps each feature set as an **extension**: a self-contained folder that registers a card on Home, a few routes and its own tables. This page is the contract. `akit new-ext <Name>` writes all of it.

## Turn hosting on
Add `"extensions": true` to `akit.json`. `akit new-ext` refuses without it, so an ordinary app never grows extension files by accident.

## What an extension is
- `src/ext/<id>/manifest.ts` exports `manifest: ExtensionManifest` (type in `src/ext/types.ts`): `id`, `name`, `version`, `minShell` (x.y.z), `capabilities` (`{ name, why }[]`), `accent`, `icon` (a picture or MaterialCommunityIcons name), optional `art` and `tile` (`wide` | `half`), `audience` (`owner` | `circle` | `people`), `minRole` (`kid` | `adult` | `owner`), `privacy` (`normal` | `health`), `HomeCard` and `href` (`/<id>`).
- `src/ext/<id>/HomeCard.tsx`: the card shown on Home. Make it a live summary and keep it light.
- Routes: `<id>/_layout.tsx` and `<id>/index.tsx` under the signed-in routes folder (`src/app/(app)/` in a starter app, `app/` otherwise), mounted at `/<id>`.
- Tables: in `public`, named `<id>_…` (hyphens in the id become underscores), each with row level security. Migration `supabase/migrations/<UTC timestamp>_<id>.sql` and pgTAP `supabase/tests/<id>.test.sql`. Both templates are fully commented: edit and uncomment them together before testing locally.
- `src/brand.ts` (the words file) holds each extension's display name under `extensions`, one `'<id>': '<Name>',` line above `// akit:ext-words`, written by `akit new-ext`; the manifest, card and routes read `brandWords.extensions['<id>']`, so the brand lint guards the name and a rename is one edit.
- `src/ext/registry.ts` is managed by `akit new-ext`: one import line per extension between `// akit:ext-imports` and `// akit:ext-list`, and one `  <id>,` line inside `extensions`. Do not reformat it.

## Feedback follows the extension
`feedback.module` (default: the app's id) says which module a note is about. The Tell pill files a note under the extension whose route you are in (`src/features/feedback/module.ts`), or under the app itself elsewhere. `akit.json` may carry `"module": "<id>"`: then `akit feedback` and the Cell runner treat that module as its own inbox (reads and writes are limited to it). Without the key the whole app is one inbox, as before.

## Ids
A slug of the name: 2 to 24 lowercase letters, digits and hyphens, starting with a letter. Reserved: `auth`, `settings`, `me`, `index`, `ext`, `types`, `registry`, `manifest`, `extensions`, plus any route the app already has.

## Not done by `new-ext`
Applying the migration (local first, then `app-ship`), the audience/role gate on Home (reading `audience` and `minRole` from the manifest is the host's job), and graduating an extension to its own app.

## Manifest v1
The starter carries Kampong's v1 types, `validate.ts` and `compat.ts`, with manifest tests under `src/ext/__tests__/`.
Run `npx tsc --noEmit` and `npx vitest run src/ext` after scaffolding.

`akit new-ext` detects v1 from `minShell` in the host's types; older hosts still get the v0 manifest.
- `--version x.y.z`: the extension's version (default `0.1.0`).
- `--min-shell x.y.z`: the oldest compatible host app (default `app.json` `expo.version`, or `0.1.0` when absent).
- `--capabilities "camera:Add a photo,push:Tell you when it is ready"`: known names are `camera`, `microphone`, `push`, `location`, `network`, `money`. Reasons must be 5 to 60 characters; names cannot repeat. Default `[]`. Money requires `adult` or `owner`; health extensions cannot declare money or location.
- `--tile wide|half`: Home tile size (default `half`).
- `--art assets/village/house.webp`: an existing file under this host's `assets/`, written as a relative `require`. Omitted by default.

The starter validates the manifest contract; audience gates, shell update prompts and Home tile consumers belong to the host app.
