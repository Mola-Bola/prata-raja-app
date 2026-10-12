begin;
select plan(9);

create schema if not exists tst_autoclose;
create function tst_autoclose.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant usage on schema tst_autoclose to authenticated;
grant execute on all functions in schema tst_autoclose to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'author@t.test', '{"display_name":"Author"}'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'stranger@t.test', '{"display_name":"Stranger"}');
insert into public.feedback (id, author_id, body, status, updated_at) values
  ('acacacac-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Old shipped', 'shipped', now() - interval '8 days'),
  ('acacacac-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Recent shipped', 'shipped', now() - interval '2 days'),
  ('acacacac-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Old approved', 'approved', now() - interval '8 days');
select set_config('role', 'service_role', true);
select is(public.feedback_autoclose(), 1, 'service role closes one old shipped note');
select set_config('role', 'postgres', true);
select is((select status::text from public.feedback where id = 'acacacac-0000-4000-8000-000000000001'), 'done', 'eight days closes');
select is((select status::text from public.feedback where id = 'acacacac-0000-4000-8000-000000000002'), 'shipped', 'two days stays shipped');
select is((select status::text from public.feedback where id = 'acacacac-0000-4000-8000-000000000003'), 'approved', 'non-shipped untouched');
select is((select count(*)::int from public.feedback_messages where feedback_id = 'acacacac-0000-4000-8000-000000000001' and author_id is null and author_label = 'Cell' and body = 'Closed automatically after 7 days. Tap Reopen if it is not right.'), 1, 'Cell message recorded once');
select is(public.feedback_autoclose(), 0, 'repeat close is idempotent');
select tst_autoclose.as_user('aaaaaaaa-0000-4000-8000-000000000002');
select throws_ok($q$select public.feedback_act('acacacac-0000-4000-8000-000000000001', 'reopen', 'No')$q$, 'P0001', 'not_found', 'stranger cannot reopen');
select tst_autoclose.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select is(public.feedback_act('acacacac-0000-4000-8000-000000000001', 'reopen', 'Still broken')::text, 'new', 'author reopens auto-closed note');
select throws_ok($q$select public.feedback_autoclose()$q$, '42501', null, 'authenticated cannot auto-close');
select * from finish();
rollback;
