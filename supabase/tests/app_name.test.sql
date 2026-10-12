begin;
select plan(2);

-- Edge functions read the app's name from private_config.app_name (supabase/functions/_shared/app-name.ts).
select ok(length(trim((select value from public.private_config where key = 'app_name'))) > 0, 'private_config.app_name holds the app name');

-- Users can't read it (private_config is service-role only), so the name lives in the app's words file for screens.
set local role authenticated;
select throws_ok($q$ select value from public.private_config where key = 'app_name' $q$, '42501', null, 'app_name is not readable by users');

select * from finish();
rollback;
