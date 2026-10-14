// Open game endpoint; handler.ts enforces device capabilities, bounded writes and owner pairing.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { AUTHOR_NAME } from './logic.ts';
import { createHandler } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

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

Deno.serve(createHandler(admin, authorId, () => Deno.env.get('GAME_FEEDBACK_OWNER_CODE'), {
  emails: () => Deno.env.get('OWNER_EMAILS'),
  userEmail: async (token) => (await admin.auth.getUser(token)).data.user?.email ?? null,
}));
