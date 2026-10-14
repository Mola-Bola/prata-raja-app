# Monitor brief (Haiku, every ~2h)

Read-only scout. Never change code, never reply to notes, never send anything outside this machine.

1. `cd /Users/molabola/prata-raja && node scripts/feedback.mjs digest` and list notes not already in `docs/INBOX.md`.
2. PostHog (exec tool, project 290542, events carry `app='prata-raja'`): since the last run timestamp in `docs/INBOX.md`:
   - sessions, runs (`run_end`: wave, won, secs), `$exception` messages grouped with counts, by `app_version`;
   - runs abandoned under 30s, or long gaps with no kills (pacing complaints);
   - list up to 5 replay links (`$session_id`) worth watching: exceptions, quits, very short or very long runs.
3. Append one dated section to `docs/INBOX.md` (newest on top, ≤25 lines): new notes (id, kind, text in one line), errors, pacing signals, replay links, and a 1-line "suggested slice" per actionable item. Update the `last run:` line at the top.
4. Reply to the lead in ≤6 lines: counts + anything urgent (crash, save loss, cannot start).
