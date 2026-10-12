-- Use updated_at: the foundation has no shipped_at. Reopen is already
-- feedback_act(id, 'reopen', note), author/admin only, with a thread message;
-- reuse it rather than creating a second transition RPC.
create function public.feedback_autoclose(p_days int default 7) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if p_days is null or p_days <= 0 then raise exception 'days_must_be_positive'; end if;
  with closed as (
    update public.feedback set status = 'done'
    where status = 'shipped' and updated_at < now() - make_interval(days => p_days)
    returning id
  ), messages as (
    insert into public.feedback_messages (feedback_id, author_id, author_label, body)
    select id, null, 'Cell',
      'Closed automatically after ' || p_days || ' days. Tap Reopen if it is not right.'
    from closed returning feedback_id
  ) select count(*)::int into v_count from messages;
  return v_count;
end $$;
revoke all on function public.feedback_autoclose(int) from public, anon, authenticated;
grant execute on function public.feedback_autoclose(int) to service_role;

-- No-op on the local bench without pg_cron. Rollout may enable pg_cron or
-- schedule `akit autoclose` with the app's service-role target instead.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('feedback-autoclose', '17 3 * * *', 'select public.feedback_autoclose(7)')$cron$;
  end if;
end $$;
