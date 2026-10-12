begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-4000-8000-00000000000a', 'typed@t.test', '{"display_name":"Typed Name","full_name":"Ignored"}'),
  ('dddddddd-0000-4000-8000-00000000000b', 'google@t.test', '{"full_name":"Google Person","name":"G"}'),
  ('dddddddd-0000-4000-8000-00000000000c', 'plain.person@t.test', '{"display_name":"  "}');

select is((select display_name from public.profiles where id = 'dddddddd-0000-4000-8000-00000000000a'), 'Typed Name', 'typed name wins');
select is((select display_name from public.profiles where id = 'dddddddd-0000-4000-8000-00000000000b'), 'Google Person', 'Google full name used');
select is((select display_name from public.profiles where id = 'dddddddd-0000-4000-8000-00000000000c'), 'plain.person', 'blank name falls back to email prefix');

select * from finish();
rollback;
