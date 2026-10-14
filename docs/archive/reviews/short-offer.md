# Short phone offer scrolling

Fleet task 39; branch `sol/short-offer`; base `0fccd3969d6d5c76aa4863660c3b380d72ca8d38`.

At 320×480, the vertically stacked linked Fish Curry, linked Condensed Milk and global Mint Chutney cards exceeded the level-up overlay's available height. Its parent clips overflow and the offer had no scroll container, leaving the third card/Reroll below the viewport.

The offer section now caps its height to the overlay's available space and allows vertical scrolling, with a zero minimum height and contained overscroll. Dip card text, frame sizing and taller phone layouts are preserved. No TypeScript presentation source, dependencies or gameplay rules changed.

Reproduction used the existing 0.4.6 verifier export read-only on port 9610. The regression test failed at `scrollTop > 0`: an actual wheel scroll left it at zero. Evidence: `/tmp/prata-raja-short-offer-before-actual.log` and `/tmp/prata-raja-short-offer-before-actual/` (screenshot and trace). An initial fixture attempt had the wrong level/pending-level state; the final baseline uses real player level and one pending pick.

The added Playwright case offers this exact build at 320×480, verifies effect/scope text, reaches all three full cards and Reroll with wheel scrolling, clicks Reroll normally, verifies the actual reroll is consumed, then clicks a rerolled card and resumes the wave. No forced clicks or weakened existing assertions. A passing scrolled-bottom screenshot is retained with the test output.

Verification:
- `SKIP_DB=1 LOGS=/tmp/prata-raja-short-offer-check bash scripts/check.sh`: typecheck, lint, brand and all 884 unit tests passed (64 files). Local database checks explicitly skipped.
- Web export on the lead-approved exclusive export slot passed; fixed build served on unique port 9611.
- Focused Playwright: exact short-phone regression plus unchanged dip-card test at 320/390 widths passed, 2/2 in 35.2s. After evidence: `/tmp/prata-raja-short-offer-after.log` and `/tmp/prata-raja-short-offer-after/`; retained passing screenshot `short-offer-bottom.png`.
- `git diff --check` passed. Existing assertions remain unchanged.
- CI is inspected after branch push and reported with the frozen commit to the lead. No pipeline results fabricated.

Balance was not rerun for this CSS-only layout change; the lead's full 0.4.6 verifier already passed 300 seeds. No shipping or evidence cleanup performed.
