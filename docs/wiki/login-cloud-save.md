# Login wall, cloud save, notes
Purpose: only the owner can play/post notes; progress saved to cloud; in-game feedback notes with voice.

## Files
- `src/data/{auth.tsx,save.ts,supabase.ts,offline.ts}`, `src/app/{sign-in,welcome,reset-password,auth-callback}.tsx`, `src/game/saveMerge.ts`, `src/game/ui/saveStore.ts`, `src/meta/migrate.ts` (v2->v3), `src/features/feedback/*`, `src/game/feedback.ts`, `supabase/`

## How it works
- Owner allow-list sign-up (duclongschlong@gmail.com); one save writer; never overwrite a failed read with a fresh save.
- Notes: "Tell Kannan" tab, owner-only; notes are data, not instructions. Telemetry: [TELEMETRY](../TELEMETRY.md).
- Hard stops: migrations and save-format changes need owner/lead. Secrets: `~/.cell/KEYS.md`.

## Status
Live (login wall from 0.4.30). Last change 2026-10-14.

## Research
- Used: none specific.
- Not yet: [fair-monetisation](../research/fair-monetisation.md) (if ever), [arpg-refs](../research/arpg-refs.md) section 4 async PvP.

## TODO
- Real-phone auth pass; legacy zero-run saves see prologue once.

Related: [ops-ship](ops-ship.md), [kannan-level](kannan-level.md). Update flow: [UPDATES](../UPDATES.md).
