-- Hosted Supabase grants EXECUTE on new functions to authenticated by default (local does not), which exposed
-- is_admin_email (an "is this address an admin?" oracle) and the trigger functions. Be exact: only the three the app calls.
alter default privileges in schema public revoke execute on functions from authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from authenticated;
revoke execute on all functions in schema public from authenticated;
grant execute on function public.is_admin(), public.is_permanent(), public.feedback_act(uuid, text, text) to authenticated;
