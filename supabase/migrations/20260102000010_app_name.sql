-- The app's name for server text (edge functions, emails): read from here, never written as a literal in a function.
-- See supabase/functions/_shared/app-name.ts. A rename never edits this file: it adds a new migration with
--   update public.private_config set value = 'New name' where key = 'app_name';
-- (README "Renaming the app"), so the cloud and every local database get the same name.
insert into public.private_config (key, value) values ('app_name', 'Prata Raja')
on conflict (key) do nothing;
