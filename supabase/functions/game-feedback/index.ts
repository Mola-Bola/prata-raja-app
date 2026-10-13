// game-feedback: a note written inside the game ("Tell Kannan", src/game/ui/FeedbackSheet.tsx) becomes a row in public.feedback,
// so `node scripts/feedback.mjs digest` and the Cell runner see it like any other note. The game has no account to sign in
// with, so this is an open endpoint (deploy with --no-verify-jwt, like `updates`) and has to defend itself: it checks the
// note's shape and size (logic.ts), allows a few notes per device and per hour, and writes with the service role under ONE
// system profile ("In-game"; the person's typed name and the device id go in params). Retrying a note is safe: the game
// makes the id once, and a second insert of the same id answers ok.
//   POST .../game-feedback   body: JSON (sent as text/plain so browsers skip the CORS preflight)   -> { ok: true, id } | { ok: false, error }
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { AUTHOR_NAME, LIMITS, parseNote, rateVerdict, rowFor } from './logic.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, apikey, x-client-info',
  'access-control-max-age': '86400',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } });

// The system profile: an auth user nobody can sign in as (an address on the reserved .invalid domain, no password), made
// the first time a note arrives and remembered in private_config (service role only) so every later call is one lookup.
const AUTHOR_KEY = 'game_feedback_author';
const AUTHOR_EMAIL = 'in-game-notes@system.invalid';
let author: string | null = null;

async function authorId(): Promise<string> {
  if (author) return author;
  const stored = async () => (await admin.from('private_config').select('value').eq('key', AUTHOR_KEY).maybeSingle()).data?.value ?? null;
  let id = await stored();
  if (!id) {
    const made = await admin.auth.admin.createUser({ email: AUTHOR_EMAIL, email_confirm: false, user_metadata: { display_name: AUTHOR_NAME } });
    id = made.data.user?.id ?? null;
    if (!id) {
      // Another call made it a moment ago (email_exists), or it was made by hand: find it.
      id = await stored();
      if (!id) id = (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users.find((u) => u.email === AUTHOR_EMAIL)?.id ?? null;
    }
    if (!id) throw new Error('no system author');
    await admin.from('private_config').upsert({ key: AUTHOR_KEY, value: id }, { onConflict: 'key', ignoreDuplicates: true });
    id = (await stored()) ?? id;
  }
  return (author = id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'use POST' });

  const text = await req.text();
  if (text.length > LIMITS.request) return reply(413, { ok: false, error: 'too large' });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply(400, { ok: false, error: 'not json' });
  }
  const parsed = parseNote(raw);
  if (!parsed.ok) return reply(400, { ok: false, error: parsed.error });
  const note = parsed.note;

  try {
    // A retry of a note that already landed (the answer got lost): same id, answer ok without counting it again.
    const known = await admin.from('feedback').select('id').eq('id', note.id).maybeSingle();
    if (known.error) throw known.error;
    if (known.data) return reply(200, { ok: true, id: note.id });

    // ponytail: these two counts scan params; add an index on (params->>'device_id') if the table ever grows large.
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const count = (q: { count: number | null; error: unknown }) => {
      if (q.error) throw q.error;
      return q.count ?? 0;
    };
    const verdict = rateVerdict({
      device: count(await admin.from('feedback').select('id', { count: 'exact', head: true }).eq('params->>device_id', note.deviceId).gte('created_at', since)),
      global: count(await admin.from('feedback').select('id', { count: 'exact', head: true }).eq('params->>src', 'game').gte('created_at', since)),
    });
    if (verdict !== 'ok') return reply(429, { ok: false, error: verdict === 'device' ? 'slow down' : 'busy' });

    const { error } = await admin.from('feedback').insert(rowFor(note, await authorId()));
    if (error && error.code !== '23505') throw error; // 23505: a second call with the same id won the race; also fine
    return reply(200, { ok: true, id: note.id });
  } catch (e) {
    // Never log the note itself: only that something failed.
    console.error('game-feedback failed', e instanceof Error ? e.message : typeof e === 'object' && e && 'code' in e ? (e as { code: unknown }).code : 'unknown');
    return reply(500, { ok: false, error: 'server' });
  }
});
