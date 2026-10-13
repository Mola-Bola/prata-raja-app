# Feedback direction UI

The existing pause, results and stall entry points open the same sheet. It now offers Direction / Bug / Feel / Idea, a separate My notes tab with server status, release, plan and reply threads, and optional server-confirmed owner pairing. Only opening My notes loads private data. Compose drafts survive tab switches; send and reply retries retain their original IDs. Note references help the lead identify an owner note.

Device IDs remain stable. A new private credential uses two cryptographically random UUIDs and persists with device state. Private actions remain disabled until the bridge confirms saving it, with an explicit storage explanation. Credentials never enter telemetry event properties. Owner confirmation requires the server's boolean; generic or malformed successes are rejected. Old server actions show an unavailable message, while ordinary note sending remains possible.

The lead-owned capture helper supplies a best-effort game-only image asynchronously after the sheet opens. Missing images are omitted, the context line only claims an attached image when present, and the first send freezes its payload for retries. Capture helpers/GameRoot are outside this worker's commit.

Verification: 63 focused feedback/device/telemetry tests pass. Quick check passed typecheck, lint and brand; its only unit failure was the old server chip equality contract (806 passing), expected until the coordinated server branch lands. Final typecheck is rerun before commit. Added browser tests for 320px thread/status layout, compose draft preservation, reply retry identity, server-confirmed pairing, and old-server fallback; lead runs these against the integrated web build. No cloud or real-phone calls were made.

Known limits: this device sees notes secured with its new credential, not older anonymous notes. Browser storage removal loses the local credential. Owner pairing depends on server provisioning; a missing owner code configuration is not presented as confirmation.
