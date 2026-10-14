# Pipeline review: owner note to fix live to status in game

Read-only review. Digest run 2026-10-14 07:54: 8 items, all owner notes, all already replied "Noted in the backlog".

## Loop today
1. Owner taps Send: `game-feedback` (handler.ts) inserts `public.feedback`, status `approved` (owner = auto-approved).
2. Runner (~/cell/runner, playbook: 30 quiet minutes, max 3 per run) sets `in_progress`, builds, commits with ids.
3. Cloud ship: `scripts/ship-cloud.mjs:170` calls `feedback.mjs record-release --ids` → status `shipped`, `shipped_in` set.
4. Web ship: `scripts/ship-fast.sh` does NOT call record-release. Notes stay `in_progress` ("Building") after a web ship.
5. Owner sees it only when My notes is refreshed (`listNotes` in src/game/feedback.ts). No push, no toast.

## Gaps, smallest first
1. **Web ship closes nothing.** Add to `scripts/ship-fast.sh` after `publish-web.mjs`:
   `ids=$(git log -1 --format=%B | sed -n 's/^Feedback: //p'); [ -n "$ids" ] && node scripts/feedback.mjs record-release --label "$label" --kind ota --runtime 1 --notes "$(git log -1 --format=%s)" --ids "$ids"`
   Convention: commit trailer `Feedback: 6e457239,97cf030f`. Verify `record-release` on web (its monitoring emit is cloud-only; the status update is not).
2. **Parked ideas stay "approved" forever.** Backlog-parked notes keep showing in digest "Build these". Add a status the digest skips (e.g. `proposed` + plan "In backlog: <section>"), or have digest skip approved notes whose last message is "Noted in the backlog".
3. **In-game toast.** Client already has `noteStatus()` ("shipped in X"). Add a one-shot banner, modeled on `src/features/feedback/UpdateBanner.tsx`: on app start, call `listNotes` once, keep `{id: status}` in localStorage (`prata-raja-feedback-seen`, try/catch), and show "Shipped in vX: <first 40 chars>" for any note whose status newly became `shipped`. Edge function unchanged (list already returns status and shipped_in).
4. **Monitor split.** `docs/MONITOR.md`: keep the 2h PostHog pass; add a notes-only step every 15 min (`feedback.mjs digest`, no PostHog, no INBOX write unless a new note id appears). Cost is one cheap read. The runner, not the monitor, acts on notes; the monitor only reports.
5. **Owner-note fast path.** Runner waits 30 quiet minutes. Owner notes (`params.owner=true`) should start the runner at once. Change lives in ~/cell/runner, not this repo.

## Not proposed
- Auto-`in_progress` on slice start: the runner already sets it; a hook adds moving parts for no gain.
- Edge function changes: none needed for 1-4.

## Notes
- Playbook text says status `planned`, which is not in the kit's STATUSES list (kit aliases: `planned` is the app label). Confirm before relying on it.
- Commit-trailer ids use the full UUID or the 8-char short id; `record-release --ids` resolves short ids (kit `full`), so confirm before relying on short ids.
