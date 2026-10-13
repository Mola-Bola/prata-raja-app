# Feedback server capability protocol

Branch `sol/feedback-server`. No schema change, deployment, secret provisioning or environment-file reads. Existing `feedback`, `feedback_messages`, `private_config` and private `feedback` storage bucket are sufficient.

## Requests

All operations use POST JSON (text/plain accepted), with existing CORS headers. Body reading stops at 200 KiB before JSON parsing, including streaming requests without Content-Length.

- Existing note shape still works. Optional `device_secret` is two UUIDs joined with `.`. New clients must generate this with secure randomness. Optional `screenshot` is a JPEG data URL limited to 180 KiB total characters, with base64 and JPEG start/end markers checked. Chips: direction, bug, feel, idea, plus legacy balance/art. `context.screen` also accepts kitchen.
- `{action:'list',device_id,device_secret}` → `{ok:true,owner,notes:[{id,body,chip,status,plan,shipped_in,created_at,messages:[{id,body,author_label,created_at}]}]}`. Newest 50 notes and newest 500 associated messages, displayed chronologically within each thread.
- `{action:'reply',device_id,device_secret,id,message_id,body}` → `{ok:true,id,message_id}`. **id is the note ID; message_id is the reply ID.** Body is 1–1000 characters. Same ID/body/author/thread retry succeeds; conflicting ID returns 409.
- `{action:'owner',device_id,device_secret,code}` → `{ok:true,owner:true}`. Server configuration `GAME_FEEDBACK_OWNER_CODE` must be 32–256 characters. Provision a high-entropy one-time code, then owner enters it once. Missing/invalid server configuration returns 503; wrong code 403; reuse by another capability 409. Nothing has been provisioned in this slice.

## Authorization and persistence

Capability is SHA-256 of normalized device UUID, `:`, normalized secret. Notes store only `params.device_hash`. List and reply require the exact device/hash pair and `src=game`. Legacy notes without a hash remain inaccessible through list/reply. Caller-supplied owner/status/params never authorize anything. Note retry validates ownership and body both before insert and after a uniqueness race.

Owner pairing performs one transactional bulk insert into private_config: `game_feedback_owner:<capability hash>` = device UUID and `game_feedback_redeemed:<code hash>` = capability hash. Existing primary-key uniqueness makes code redemption atomic, including simultaneous pairing attempts. Same-capability retry succeeds. Only this server registration permits new notes to be `approved` with `params.owner=true`; the system author stays non-admin. Pairing does not retroactively approve old notes. Revoking an owner means deleting their owner-registration row through an authorized administration path; retain redemption rows to prevent code reuse.

Screenshots follow the existing private bucket convention `feedback/<system-author>/<note-id>.jpg`. Storage runs after owned-note insertion and can be repaired by a retry. List returns neither screenshot paths nor metadata. No secret, hash, raw exception or private profile fields is returned or logged.

Notes retain 6/device/hour and 120/global/hour guards. Replies permit 12/note/hour and 120/global/hour from the game system author; retries do not consume extra count. These guards use existing count queries and can overshoot under concurrent writes; a strict transactional quota would need a separate schema/function slice. UUID device IDs are not an anti-abuse identity. Owner code should be random, not a memorable password.

## Validation

Focused mocked handler/logic tests cover cross-device and wrong-secret denial, legacy isolation, ownership retries and uniqueness races, owner spoofing, atomic code reuse, projection without secrets, per-note/global reply and note limits, request size, JPEG validation, storage paths and safe backend errors. They mock the PostgREST boundary, including bulk-insert atomicity; no live database or provider call was made.

`deno check --node-modules-dir=none supabase/functions/game-feedback/index.ts` passed. Plain `deno check` initially encountered the shared node_modules version mismatch; disabling node_modules resolution uses Deno's own dependency cache without changing repository dependencies.

Supabase changelog reviewed on 13 October 2026: upcoming CBC TLS deprecation does not change this modern Deno handler API. Reviewed current insert and Edge Function authorization docs. Security checklist: service-role remains server-only; no user metadata authorization; no RLS, view, SECURITY DEFINER or policy change; capability predicates protect each service-role operation; storage uses existing private bucket. Production access, real storage upload and deployment remain for the lead's approved ship path.
