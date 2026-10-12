begin;
select plan(14);

create schema if not exists tst2;
create or replace function tst2.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant usage on schema tst2 to authenticated;
grant execute on all functions in schema tst2 to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-4000-8000-00000000000a', 'owner@t.test', '{"display_name":"Owner"}'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'tester@t.test', '{"display_name":"Tester"}'),
  ('bbbbbbbb-0000-4000-8000-00000000000c', 'other@t.test', '{"display_name":"Other"}');
update public.profiles set is_admin = true where id = 'bbbbbbbb-0000-4000-8000-00000000000a';

-- 1: a tester can send feedback
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000b');
select lives_ok($q$ insert into public.feedback (id, kind, body, route) values ('cdcdcdcd-0000-4000-8000-000000000001', 'bug', 'The button is covered', '/me') $q$, 'tester can send feedback');
select is((select module from public.feedback where id = 'cdcdcdcd-0000-4000-8000-000000000001'), 'prata-raja', 'a note belongs to the app itself unless it names an extension');

-- 2: testers can't make themselves admin
select throws_ok($q$ update public.profiles set is_admin = true where id = 'bbbbbbbb-0000-4000-8000-00000000000b' $q$, '42501', null, 'cannot self-assign admin');

-- 3: testers can't set status directly
select throws_ok($q$ update public.feedback set status = 'done' where id = 'cdcdcdcd-0000-4000-8000-000000000001' $q$, '42501', null, 'status is not directly writable');

-- 4: owner (admin) sees everyone's feedback; 5: another tester sees none of it
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000a');
select is((select count(*)::int from public.feedback where id = 'cdcdcdcd-0000-4000-8000-000000000001'), 1, 'admin sees all feedback');
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000c');
select is((select count(*)::int from public.feedback), 0, 'other users cannot see it');

-- 6: profiles are private to their owner (and admins)
select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');

-- 7: author can reply in their thread; 8: an outsider can't
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000b');
select lives_ok($q$ insert into public.feedback_messages (feedback_id, author_id, author_label, body) values ('cdcdcdcd-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Tester', 'The Save button') $q$, 'author replies');
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000c');
select throws_ok($q$ insert into public.feedback_messages (feedback_id, author_id, author_label, body) values ('cdcdcdcd-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000c', 'X', 'hi') $q$, '42501', null, 'outsider cannot post');

-- 9: approve moves it on; 10: can't mark done before it ships; 11: reopen after shipping
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000b');
select is(public.feedback_act('cdcdcdcd-0000-4000-8000-000000000001', 'approve', null)::text, 'approved', 'Go ahead → approved');
select throws_ok($q$ select public.feedback_act('cdcdcdcd-0000-4000-8000-000000000001', 'done', null) $q$, 'P0001', 'bad_transition', 'cannot mark done before shipped');
select set_config('role', 'postgres', true);
update public.feedback set status = 'shipped', shipped_in = '1.1.1' where id = 'cdcdcdcd-0000-4000-8000-000000000001';
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000b');
select is(public.feedback_act('cdcdcdcd-0000-4000-8000-000000000001', 'reopen', 'Still covered on small phones')::text, 'new', 'Still not right → back to new');

-- 12: the stage a note reads as; 13: private settings are service-role only
select set_config('role', 'postgres', true);
select is(public.feedback_stage('approved'), 'planned', 'approved reads as planned');
select tst2.as_user('bbbbbbbb-0000-4000-8000-00000000000b');
select throws_ok($q$ select count(*) from public.private_config $q$, '42501', null, 'private_config is not readable by users');

select * from finish();
rollback;
