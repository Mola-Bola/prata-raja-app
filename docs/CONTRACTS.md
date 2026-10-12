# Prata Raja: how the code fits together (read before changing anything)

The owner directs changes at a high level ("make the cards rounder", "rename Home to Today"). This file is where each kind of change lands. Add a row here whenever you add a feature, so the next session finds it without reading the tree.

| Change | Edit |
|---|---|
| Colours (light and dark), avatar pastels, the typeface names | `src/ui/brand.ts`: plain data. `src/ui/__tests__/palette.test.ts` checks every text colour on its background passes WCAG AA; run `npx vitest run src/ui` after a change. Presets to start from: `oleh`, `hatch`, `calm` (`~/cell/starter/brands/`) |
| Radii, spacing, type sizes, which text variant does which job (`textRole`), larger text | `src/ui/theme.ts` (supporting text is 14–15px; nothing smaller than 14) |
| Words people see: the app name, tagline, tabs, feature words (Tell …, circle, Seeds), status labels, extension names | `src/brand.ts` (`brandWords`, pure data; re-exported as `APP_NAME`, `TAGLINE`, `WORDS`, `TAB_LABELS` by `src/ui/labels.ts`). Never write the app name or a guarded word as a literal elsewhere: `scripts/brand-lint.mjs` (in check.sh) fails; exceptions in `scripts/brand-allow.txt`. Rename runbook: README |
| The logo (text in the heading face; swap for an Image) | `src/ui/Wordmark.tsx`; the start-up screen is `StartupScreen.tsx` |
| App icon, splash, favicon, web icons | `node scripts/render-icons.mjs` draws placeholders in the brand colours; replace `assets/images/*` and `public/icons/*` with real artwork (same names and sizes) |
| The tabs | Routes in `src/app/(app)/(tabs)/`, the native bar in `_layout.tsx`, the web bar in `_layout.web.tsx` (testIDs `tab-<name>`); a tab's name for Back buttons and the browser tab is `TAB_TITLE` in `src/ui/a11y.ts` |
| Screens outside the tabs | A file in `src/app/(app)/` plus a `<Stack.Screen>` line in `src/app/(app)/_layout.tsx` |
| Sign in, sign up, forgot password, Google | `src/app/sign-in.tsx`, `welcome.tsx`, `reset-password.tsx`, `auth-callback.tsx`; the logic is `src/data/auth.tsx` |
| Links that open the app while it starts, password email, return-after-sign-in | `src/features/links/*`; the pure rules are in `src/domain/links.ts` (+ tests) |
| The "Tell Kannan" tab (big coral and labelled until first use, then a 52 × 52 icon; docked on the right edge, draggable; testID `feedback-button`), the note sheet, voice, update banner | `src/features/feedback/*` (mounted once in `src/app/_layout.tsx`) |
| Talking instead of typing | `src/features/feedback/dictation.ts`, `speechText.ts` (pure, + tests), `webSpeech.ts`. Rule for any note box: typing, touching or clearing stops listening first, spoken words go in at the cursor you had when you started, and the text state lives in the same component as the text box |
| What a feedback note's status reads as (Received · Planned · Building · Shipped · Done · Not now) and its plan line | `src/features/feedback/labels.ts` **and** `public.feedback_stage()`; the plan is `feedback.plan`, set by `scripts/feedback.mjs plan` |
| My notes, a note's page, What's new | `src/app/(app)/feedback/index.tsx`, `[id].tsx`, `whats-new.tsx`; the Me tab links to them |
| Who sees the feedback button | `app_config.feedback_audience` (`everyone` / `admins`) |
| Me: profile, larger text, feedback toggle, update check, sign out, the server address (long-press the version) | `src/app/(app)/(tabs)/me.tsx`, `src/features/settings/*` |
| Data hooks | `src/data/<feature>.ts`, exported from `src/data/index.ts`; screens never import `supabase`. Always `useSavedQuery` (never plain `useQuery`) so offline screens show saved data |
| Query keys and invalidation | `src/data/keys.ts` (`qk`), `src/data/invalidate.ts` |
| Offline: saves that wait for a connection and replay in order | `src/data/offline.ts` (`OFFLINE_SCOPE`, `registerOfflineMutations`), `saveOrQueue` + `QUEUED_NOTE` in `src/data/save.ts`; the "N changes will sync" banner is `OfflineBanner` in `src/ui/chrome.tsx` |
| Offline: staying signed in when the session can't be renewed | `src/data/savedSession.ts` (+ tests), used by `auth.tsx` and `supabase.ts` |
| Offline: what the web app saves on the device | `public/sw.js`; the file list is written into the build by `scripts/web-pwa.mjs` |
| Error wording | `src/data/errors.ts` |
| Dates and amounts | `src/domain/format.ts` (`fmtDate`, `daysUntil`, `todayIso`, `addDays`, `parseTypedDate`, `parseAmount`) |
| Who can see/do what | Supabase migrations (RLS). Add a pgTAP test in `supabase/tests/` for every table |
| The foundation tables (profiles, feedback, feedback_messages, releases, app_config, private_config, ota_updates) and their functions | `supabase/migrations/20260101000010_foundation.sql`, `…20_cloud_ota.sql`, `…21_function_grants.sql`. Add your own in new migrations, never by editing these; regenerate `src/data/database.types.ts` with `npm run gen:types` |
| Working the owner's feedback / shipping updates | `docs/FEEDBACK.md`, `scripts/feedback.mjs`, `scripts/ship-cloud.mjs`, `docs/UPDATES.md` |

## UI primitives (src/ui, Oleh's round-5 "Sunday market" system; import from `@/ui`)

| Need | Use |
|---|---|
| The one main action of a screen or sheet footer; the quiet partner beside it | `BigButton` (`tone` `go` leaf, `brand` coral, `ghost`; `large` for a screen's big Next/Sign in). Never a Paper `Button mode="contained"` for a primary |
| Pick one of a few (emoji + title + line, tick when picked) | `ChoiceCards` inside a `RadioGroup`. Many short options (filters) stay `ChoiceChip` (`kind` `tab` / `toggle` / `button`) |
| The + at the corner | `SquareFab` (coral, lipped); clear the feedback tab with `useRightEdgeTab()` |
| Typefaces and weights | `src/ui/fonts.ts` (files, loading, `useAppFonts`), `src/ui/fontFamilies.ts` (pure); names in `brand.ts`. The system font if they fail to load |
| Sheets (rounded, `footer` for the BigButtons), action sheets | `Sheet` in `src/ui/chrome.tsx`, `ActionSheet` |
| Page, header, sections, cards, rows | `Screen`, `AppHeader`, `Section`, `Panel`, `Pill`, `Stat`, `ListRow` + `ListGroup` (one card, hairlines between rows) |
| Text boxes, numbers, dates, pickers, toggles, steppers | `TextField`, `NumberField`, `DateField`, `SelectField`, `ToggleRow`, `Stepper`, `Segmented` (`src/ui/fields.tsx`) |
| Toasts, confirm dialogs, loading, errors, empty states | `useToast`, `useConfirm`, `LoadingView`, `ErrorView`, `EmptyState` (`src/ui/feedback.tsx`) |
| Motion and haptics | `Reveal`, `CrossFade`, `Rise`, `useDepress`, `haptic('tap'\|'select'\|'success'\|'warning')`; a landmark moment is `useCelebration().fire(key, line)` |
| Pastel avatar behind an initial | `PersonAvatar` (`avatarColour`) |

## Layers (imports only go downwards)
```
src/app/**          routes (screens): import from '@/data', '@/domain', '@/ui', and '@/features/<slice>'
src/features/<x>/   screen-specific components/hooks for one slice (not routes)
src/ui/             design system
src/data/           the ONLY place that talks to Supabase (hooks via TanStack Query)
src/domain/         pure TS rules, no React, unit-tested with Vitest
supabase/           schema, RLS, triggers, RPCs, seed, pgTAP
```

## Screen recipe
```tsx
import { Stack } from 'expo-router';
import { useSomething } from '@/data';
import { BigButton, ErrorView, LoadingView, Screen, Section, useToast } from '@/ui';

export default function Thing() {
  const thing = useSomething();
  const toast = useToast();
  if (thing.isLoading) return <LoadingView />;
  if (thing.error || !thing.data) return <ErrorView error={thing.error} onRetry={thing.refetch} />;
  return (
    <Screen onRefresh={thing.refetch} refreshing={thing.isRefetching} footer={<BigButton large>Save</BigButton>}>
      <Stack.Screen options={{ title: 'Thing' }} />
      <Section title="…">…</Section>
    </Screen>
  );
}
```
**Tab screens** (`src/app/(app)/(tabs)/*`) have no native header: `<Screen header={<AppHeader title="Home" />}>`. **Stack screens** set their title with `<Stack.Screen options={{ title }} />`. **Mutations**: `try { await m.mutateAsync(v); toast.show('Saved'); } catch (e) { toast.error(e); }`; `useConfirm()` before anything destructive.

## Routes
| URL | File |
|---|---|
| `/` `/me` | `(app)/(tabs)/index.tsx`, `me.tsx` |
| `/feedback` `/feedback/:id` `/whats-new` | `(app)/feedback/…`, `(app)/whats-new.tsx` |
| `/welcome` `/sign-in` (`?mode=in\|up`) `/reset-password` `/auth-callback` | `welcome.tsx`, `sign-in.tsx`, `reset-password.tsx`, `auth-callback.tsx` |

## testIDs
Every primary button and input carries a testID, used by Playwright (web). Name them `<screen>-<thing>`, e.g. `home-hello` or `me-sign-out`.

## Seed data (local)
Users (password `prata-raja-demo-1`): `demo@prata-raja.test` (admin, so it sees every note) and `friend@prata-raja.test` (ordinary, used by web tests). `supabase db reset` re-applies migrations and seed. The local stack is `scripts/dev-up.sh` (project `prata-raja`, ports 595xx; web 9490, updates 9492, tests 9491).

## Verifying a screen
1. `bash scripts/check.sh` (one line per check; details only for failures; logs in `/tmp/prata-raja-check`; `SKIP_DB=1` without the local Supabase).
2. `bash scripts/check.sh --web [specs…]` builds the web app, serves it on :9491, runs Playwright.
3. One screen: `node e2e/smoke.mjs --as demo --path /me --expect "Me" --shot /tmp/x.png`, shrink it (`sips -Z 900 /tmp/x.png`), then open it.
