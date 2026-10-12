-- Starter foundation: people (profiles + admin), the feedback loop (Tell Prata Raja: feedback, feedback_messages, releases),
-- public app config and private config. Compatible with `akit feedback` and the Cell runner (they read and write these
-- tables with the service role). The "bell" (notifications) is not part of the starter, so the feedback triggers that
-- feed it are left out; add a notifications table and the triggers from Oleh's migrations if your app needs one.
-- Add your own tables in new migrations (supabase migration new <name>), never by editing this file.

-- ── Grants: hosted Supabase gives broad defaults; local does not. Be exact in both. ──
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;

-- ── Types ──
create type public.feedback_kind as enum ('like', 'dislike', 'bug', 'idea', 'change');
create type public.feedback_status as enum ('new', 'needs_info', 'proposed', 'approved', 'in_progress', 'shipped', 'done', 'wont_do', 'duplicate');

-- ── Tables ──
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.app_config (key text primary key, value text not null);
create table public.private_config (key text primary key, value text not null);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.feedback_kind not null default 'idea',
  body text not null check (length(trim(body)) > 0),
  route text,
  params jsonb not null default '{}'::jsonb,
  screen text,
  platform text,
  app_version text,
  update_id text,
  device text,
  screenshot_path text,
  status public.feedback_status not null default 'new',
  priority integer check (priority >= 1 and priority <= 5),
  tags text[] not null default '{}',
  parent_id uuid references public.feedback (id) on delete set null,
  shipped_in text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  plan text,
  -- Which module (extension) the note is about; an app that hosts extensions files each note under the extension's id.
  -- `akit.json` may carry "module": "<id>" so akit feedback and the Cell runner treat that module as its own inbox.
  module text not null default 'prata-raja' check (length(module) between 1 and 60)
);
create index feedback_author_id_created_at_idx on public.feedback (author_id, created_at desc);
create index feedback_status_created_at_idx on public.feedback (status, created_at desc);
create index feedback_module_status_idx on public.feedback (module, status, created_at desc);

create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_label text not null default 'Claude',
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index feedback_messages_feedback_id_created_at_idx on public.feedback_messages (feedback_id, created_at);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('ota', 'apk')),
  runtime_version text not null,
  notes text not null,
  feedback_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Functions ──
create function public.touch_updated_at() returns trigger language plpgsql set search_path to 'public' as $$
begin new.updated_at := now(); return new; end $$;

create function public.is_admin() returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create function public.is_permanent() returns boolean language sql stable set search_path to 'public' as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create function public.is_admin_email(p_email text) returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(p_email, '') <> '' and lower(p_email) = any (
    string_to_array(replace(lower(coalesce((select value from private_config where key = 'admin_emails'), '')), ' ', ''), ',')
  )
$$;

create function public.display_name_of(u uuid) returns text language sql stable security definer set search_path to 'public' as $$
  select coalesce(nullif(display_name, ''), 'Someone') from profiles where id = u
$$;

create function public.feedback_stage(s public.feedback_status) returns text language sql immutable set search_path to 'public' as $$
  select case s
    when 'new' then 'received'
    when 'needs_info' then 'question'
    when 'proposed' then 'planned'
    when 'approved' then 'planned'
    when 'in_progress' then 'building'
    when 'shipped' then 'shipped'
    when 'done' then 'done'
    when 'wont_do' then 'not_now'
    else 'merged' end
$$;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into profiles (id, display_name, is_admin)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    new.email_confirmed_at is not null and is_admin_email(new.email)
  );
  return new;
end $$;

create function public.handle_user_confirmed() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null and is_admin_email(new.email) then
    update profiles set is_admin = true where id = new.id;
  end if;
  return new;
end $$;

create function public.feedback_act(p_id uuid, p_action text, p_note text default null) returns public.feedback_status
  language plpgsql security definer set search_path to 'public' as $$
declare f feedback; v_to feedback_status; v_label text;
begin
  select * into f from feedback where id = p_id for update;
  if not found or not (f.author_id = auth.uid() or is_admin()) then raise exception 'not_found'; end if;
  v_to := case
    when p_action = 'approve' and f.status in ('new', 'needs_info', 'proposed') then 'approved'
    when p_action = 'not_now' and f.status in ('new', 'needs_info', 'proposed', 'approved') then 'wont_do'
    when p_action = 'done' and f.status = 'shipped' then 'done'
    when p_action = 'reopen' and f.status in ('shipped', 'done', 'wont_do') then 'new'
    else null end;
  if v_to is null then raise exception 'bad_transition' using detail = format('%s on %s', p_action, f.status); end if;
  update feedback set status = v_to where id = p_id;
  v_label := case p_action when 'approve' then 'Go ahead' when 'not_now' then 'Not now'
                           when 'done' then 'Looks good' else 'Still not right' end;
  insert into feedback_messages (feedback_id, author_id, author_label, body)
    values (p_id, auth.uid(), display_name_of(auth.uid()),
            v_label || coalesce(': ' || nullif(trim(p_note), ''), ''));
  return v_to;
end $$;

-- ── Triggers ──
create trigger feedback_touch before update on public.feedback for each row execute function public.touch_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row execute function public.handle_user_confirmed();

-- ── Row level security ──
alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.private_config enable row level security; -- no policies: only the service role reads it
alter table public.feedback enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.releases enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy app_config_read on public.app_config for select to authenticated, anon using (true);
create policy releases_read on public.releases for select to authenticated using (true);
create policy feedback_read on public.feedback for select to authenticated using (author_id = auth.uid() or public.is_admin());
create policy feedback_insert on public.feedback for insert to authenticated
  with check (author_id = auth.uid() and status = 'new');
create policy feedback_update on public.feedback for update to authenticated
  using ((author_id = auth.uid() and status = 'new') or public.is_admin());
create policy feedback_messages_read on public.feedback_messages for select to authenticated
  using (exists (select 1 from public.feedback f where f.id = feedback_messages.feedback_id and (f.author_id = auth.uid() or public.is_admin())));
create policy feedback_messages_insert on public.feedback_messages for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.feedback f where f.id = feedback_messages.feedback_id and (f.author_id = auth.uid() or public.is_admin())));

-- ── Privileges (RLS still decides which rows) ──
revoke all on public.profiles, public.feedback, public.feedback_messages, public.releases, public.app_config,
  public.private_config from anon, authenticated;
grant select on public.app_config to anon;
grant select on public.app_config, public.releases to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert on public.feedback, public.feedback_messages to authenticated;
grant update (kind, body, screenshot_path) on public.feedback to authenticated;
grant all on all tables in schema public to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin(), public.is_permanent(), public.feedback_act(uuid, text, text) to authenticated;

-- ── Config, storage ──
insert into public.app_config (key, value) values ('min_client_version', '0.1.0'), ('feedback_audience', 'everyone');

insert into storage.buckets (id, name, public) values ('feedback', 'feedback', false) on conflict (id) do nothing;
create policy feedback_shots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
create policy feedback_shots_read on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
