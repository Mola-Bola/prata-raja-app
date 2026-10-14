-- Cloud copy of the game's progress save: one row per player, written by the web client (src/game/bridge.web.ts).
create table public.game_saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  version int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

create policy game_saves_select on public.game_saves for select to authenticated using (user_id = auth.uid());
create policy game_saves_insert on public.game_saves for insert to authenticated with check (user_id = auth.uid());
create policy game_saves_update on public.game_saves for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.game_saves from anon, authenticated;
grant select, insert, update on public.game_saves to authenticated;
grant all on public.game_saves to service_role;
