// Read-only PostHog query (EU cloud; project and personal key from ~/.cell/posthog.env; never prints the key).
//   node docs/reviews/feedback-telemetry-check/phq.mjs "select event, count() from events where properties.app = 'prata-raja' group by event"
// Replays:  select session_id, min(min_first_timestamp), max(max_last_timestamp), sum(event_count), round(sum(size)/1024) from raw_session_replay_events where session_id = '<id>' group by session_id
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(`${process.env.HOME}/.cell/posthog.env`, 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const q = process.argv[2];
const res = await fetch(`https://eu.posthog.com/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}` },
  body: JSON.stringify({ query: { kind: 'HogQLQuery', query: q } }),
});
const body = await res.json();
if (!res.ok) { console.log('ERR', res.status, JSON.stringify(body).slice(0, 400)); process.exit(1); }
console.log(JSON.stringify({ columns: body.columns, results: body.results }, null, 1));
