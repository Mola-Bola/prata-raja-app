# Fleet Jev helper

`node scripts/jev.mjs` reads one JSON object from stdin and returns a closed-choice advisory. It never writes the fleet ledger or authorizes work. No dependencies; Node's built-in fetch is used.

Input: `{ "task": "classify", "text": "The pause button is broken" }`.
Tasks: `classify` (direction/bug/feel/idea), `model-tier` (cheap/standard; lead requires judgement), `regression` (yes/no), `dedupe` and `overlap` (none or candidate). The last two accept `candidates: [{ "id": "ledger-id", "text": "Intent or recorded decision" }]`. Include relevant decisions from DIRECTION/BACKLOG in overlap candidates. At most 30 candidates; text is bounded. CLI input is capped at 100 KB. Send only material approved for this provider, never credentials.

Import `judge(input)` from `scripts/jev.mjs` to get `{ status: 'advisory', choice, reason: 'ok', candidateId? }`. Every failure or abstention returns `{ status: 'lead_required', choice: null, reason }`. CLI exits 0 for an advisory, 2 when lead judgement is needed. Timeout, malformed data and missing credentials are **not** permission to proceed or a guessed classification. The lead records an explicit decision; deterministic atomic file ownership remains the ledger's responsibility. A tier suggestion never grants frontier-model or spend approval.

Credentials come only from `~/.cell/typesafe.env` (`TYPESAFE_API_KEY`); the file is parsed, never executed. Endpoint is fixed to `https://api.typesafe.ai/v1/systemone`, model `jev-latest`, redirects rejected. One 800 ms budget covers credentials, HTTP and response decoding, with no retries. Log persistence happens afterwards; a log failure requires lead judgement too. Tests inject credentials/network and temporary log directories; no paid calls were made.

Each invocation appends only timestamp, app, task, outcome, attempted, latency and validated token counts to `~/Studio/data/jev/YYYY-MM.jsonl` (UTC month). No note text, candidate identifiers, answers, raw responses, error messages or credentials enter the log. `attempted` distinguishes local validation/config failures from network attempts.

Protocol checked against the [provider OpenAPI](https://api.typesafe.ai/openapi.json) on 13 October 2026. The handover's working-tree reference was absent; recovered read-only from Kampong Git commit `f324985c`, path `supabase/functions/_shared/jev.ts`. Production access/accuracy remains unverified; mocked tests cover protocol, redaction and failure fallback.
