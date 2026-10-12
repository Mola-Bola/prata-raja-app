-- Prata Raja demo data for local review. Demo login: demo@prata-raja.test / prata-raja-demo-1 (also friend@prata-raja.test, same password).
-- Local database only: `supabase db reset` applies the migrations and then this file. Never run it against production.

do $$
declare
  pw text := extensions.crypt('prata-raja-demo-1', extensions.gen_salt('bf'));
  u record;
begin
  for u in select * from (values
    ('11111111-0000-4000-8000-000000000001'::uuid, 'demo@prata-raja.test', 'Demo'),
    -- A second, ordinary account (not an admin): lets the web tests act as someone whose notes the owner triages.
    ('11111111-0000-4000-8000-000000000002'::uuid, 'friend@prata-raja.test', 'Friend')
  ) as t(id, email, name) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, pw, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;

-- The demo user sees the feedback button and My notes like the owner does.
update public.profiles set is_admin = true where id = '11111111-0000-4000-8000-000000000001';
