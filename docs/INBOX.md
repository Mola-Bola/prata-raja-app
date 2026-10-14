# Inbox (monitor output)

last run: 2026-10-15 00:50 AEDT (window: since 2026-10-15 00:48 AEDT)

## 2026-10-15 00:50 AEDT (window 00:48 to 00:50, quiet)

Counts: 0 sessions with run/level events, 0 run_start, 0 run_end, 0 $exception, 0 app_error. 1 event in window: release_shipped at 00:49:28 AEDT, with no app_version property (same gap as the 00:31 ship).

New notes: none. The digest's 9 open notes (6e457239, e038168e, 9dbbbd1d, 97cf030f, 6cf4f726, f4281f5c, 1a5f2b2b, 934d904d, 6bc229d2) are all already in INBOX. Status changes: none.

Errors: none. No crash, no save loss, no cannot-start signal.

Pacing signals: no runs in window.

Replay links: none (no sessions in window).

Suggested slices:
- release_shipped still has no app_version (2 of 2 ships in this run window): add app_version to the release emitter so ships can be matched to builds.

Note: the window is 2 minutes, so this pass is almost empty by design. Earlier-day events were checked only to confirm the cutoff; the explicit-UTC query returned just the release event.

## 2026-10-15 00:48 AEDT (window 23:50 to 00:48, quiet)

Counts: 0 sessions with run/level events, 0 run_start, 0 run_end, 0 $exception, 0 app_error. 1 event in window: release_shipped at 00:31 AEDT (version not in its properties, so it cannot be matched to a build).

New notes: none. The digest's 9 open notes are all already in INBOX. Status changes: none.

Errors: none. No crash, no save loss, no cannot-start signal.

Pacing signals: no runs in window, so nothing to read.

Replay links: none (no sessions in window).

Suggested slices:
- release_shipped at 00:31 has no version property: check the release emitter adds app_version so future ships can be matched to builds.
- 6bc229d2 spawns after boss death: boss-finish slice (still the top bug, unchanged).

Note: PostHog events are stored in AEDT per the timestamp offset (+11:00). The query window used 12:50 UTC, which matches 23:50 AEDT.

## 2026-10-14 23:50 AEDT (window 22:05 to 23:50, version 0.4.41)

Counts: 1 session, 1 run_start, 1 run_end (1 win, wave 10, 428s), 12 level_up, 12 card_pick, 1 boss_spawn, 1 app_open, 3 release_shipped. 0 $exception, 0 app_error.

New notes: none. All 9 open digest notes already in INBOX. Status changes:
- 9dbbbd1d moved to "Being built": 0.4.41 shrank Kannan hurt zone 12% and added a floor ring on hit.

Errors: none. No crash, no save loss, no cannot-start signal.

Pacing signals: one completed run, 428s to wave 10, no abandons under 30s, no early deaths. Sample too small to read pacing. Kill events not in taxonomy, so kill gaps are unmeasured.

Replay links:
- 01a13a2f-4b08-7a77-ae23-742fea795921 (0.4.41, won wave 10 at 428s, boss spawned; check 6bc229d2 spawns after boss death)

Suggested slices:
- 6bc229d2 spawns after boss death: boss-finish slice (still the top bug). Replay above covers the boss fight.
- 934d904d pacing: still needs more runs before balance work.

Note: the window starts at the last run, not 00:00. The digest header says 12:49 and events are in AEDT, so the clocks may differ; check if the window looks wrong.

## 2026-10-14 22:05 AEDT (first pass, versions 0.2.2 to 0.4.39)

Counts: 26 run_start, 16 run_end (12 wins, 4 losses), 32 app_open (49 sessions with app_open per first query), 0 $exception, 0 app_error. Only 0.4.39 (live) has 1 session so far, no runs yet.

New notes (9 from digest, none were in INBOX before):
- 6e457239 idea (hub): splinter/cluster effect on damage, pratas flaking and disintegrating
- 97cf030f change (wave 2): teh tarik effect visuals
- 6cf4f726 change (wave 2): thosai animation does not roll
- f4281f5c bug (wave 9): crazy haptics when fighting ice enemies
- 9dbbbd1d idea (hub): burger baron icon shows cockroach; hitboxes too big; ice animation distracting; fire is just a small icon; effects not tied to dips
- 1a5f2b2b idea (wave 7): stats page, power-up lookup, DPS counter
- 934d904d change (wave 7): game too staggered, waits between waves, want faster pacing
- 6bc229d2 bug (wave 10): mobs keep spawning after Cockroach King dies
- e038168e question (Home, Uzzy): how to start a run (answered in chat; ask if still stuck)

Errors: none. No $exception events in window, no crash, no save loss, no cannot-start signal.

Pacing signals:
- Abandoned runs (run_start with no run_end): about 10 sessions. Under 30s: 3 (0.4.25 13s, 0.4.12 23s, 0.4.2 19s). Longer: 0.4.6 about 3 min at 13 events, 0.4.13 about 94s.
- Early deaths: 0.4.9 run ended at wave 1 after 4s; 0.4.12 run ended at wave 0 after 1s.
- Completed runs run 243 to 431s (wave 8 to 10). Shorter runs cluster on 0.4.11 to 0.4.13. Longer runs on 0.4.35 and 0.4.36. No kill events in the taxonomy, so kill gaps cannot be measured.

Replay links (session ids, watch these first):
- 01a137c4-d669-7cae-893c-622f548e6542 (0.4.9, died wave 1 at 4s)
- 01a13977-670e-7cc2-b468-ea5073745b97 (0.4.12, 1s run, quit at wave 0)
- 01a13786-4789-7638-8488-ee874598e68c (0.4.6, 13 events, abandoned about 3 min)
- 01a13980-ad97-72c0-bc8d-687db7a7b753 (0.4.13, abandoned at about 94s)
- 01a13846-5e33-7159-b04a-f318b3302228 (0.4.11, 72 events, 3 runs, longest session)

Suggested slices:
- 6bc229d2 spawns after boss death: boss-finish slice (bug, fix first)
- f4281f5c ice haptics at wave 9: contact-attack slice
- 934d904d pacing: balance-tested pacing slice (abandon data above supports it)
- 9dbbbd1d hitbox and ice/fire visuals: visuals polish slice
- 1a5f2b2b stats/DPS: later round
- 6e457239, 97cf030f, 6cf4f726: visuals polish slice
