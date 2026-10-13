# Feedback and web-label assertion contract review

Reviewed main `40fbeb3` against `86d2946`, plus `sol/feedback-ui`'s intended UI contract. This is review evidence, not an assert-guard exception or owner approval record. The guard and its approved-change files were not modified. Running `node scripts/assert-guard.mjs 86d2946` reports three changed assertions on current main; it remains red.

## Web release labels

Two exact expected outputs changed: source `0.5.0` with cloud `0.4.10` now chooses `0.5.1`; source `0.4.1` with no cloud labels now chooses `0.4.2`. Web publishing does not write an OTA release row. Reusing the source version therefore repeats a published label. The authorized web-only workflow requires a version greater than both source and recorded cloud versions. Existing numeric-ordering and minor-bump assertions remain; added cases cover source patch versions ahead of stale cloud data. These are changed functional expectations, not a relaxed bound or removed check.

## Feedback categories and compatibility

Standing fleet direction calls for Direction / Bug / Feel / Idea. The new UI replaces Balance / Art, while the server intentionally keeps those two legacy chips for already-installed clients. Requiring server keys to equal UI keys is now wrong: the server must accept the exact union of current UI and legacy IDs.

The server already has an exact six-key assertion plus UI-subset checks. This review adds an exact union assertion as well, preserving both existing assertions and limits. That closes a small gap: a UI accidentally missing Direction or Feel could satisfy the old subset assertion. The union equality will fail until the new UI is integrated; this is the intended compatibility contract, not grounds to loosen it.

Frontend exact label changes and browser locator/payload changes from Balance→Feel and Art→Direction exercise the newly authorized controls. Server tests still verify the legacy mappings and database enum compatibility. Retry identity/body, name persistence and analytics-toggle checks remain.

## Durable device secret

Device-state exact-object expectations retain every pre-existing field/value and add `secret: expect.any(String)`, because a newly generated secret cannot have one fixed expected value. New tests separately check its two-UUID shape, stable reload, invalid-secret replacement without device-ID change, delayed persistence, and failed persistence. The server boundary independently validates UUID components and denies legacy/wrong-capability reads. These changes increase coverage without weakening original device state expectations.

The send mock now returns the real `{ok:true,id}` acknowledgement instead of `{}`. New tests reject `{}` and mismatched IDs, so this updates an unrealistic success fixture while strengthening response validation.

## One genuine UI test weakness reported

The sent-state immutability assertion changed its attempted chip from `art` to `idea`. The initial state already has chip `idea`, so this no longer attempts a different chip. Use `direction` or `feel` with the same `.toBe(sent)` assertion to preserve the old behavioral challenge. This file is owned by the UI worker; reported to the lead for correction, not edited here.

No guard bypass, fabricated approval, removed assertion or raised timeout was introduced. Added browser tests have their own time budgets; existing test deadlines were not increased in the reviewed changes. Full integration and guard disposition remain the lead's release responsibilities.
