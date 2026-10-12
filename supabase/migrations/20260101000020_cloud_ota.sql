-- Over-the-air updates and APKs served from the cloud: bundles, assets and APKs live in the public 'updates' bucket,
-- manifests in ota_updates (written by scripts/ship-cloud.mjs with the service role, read by the `updates` function).
create table public.ota_updates (
  id uuid primary key,
  label text not null,
  runtime_version text not null,
  platform text not null check (platform in ('android', 'ios')),
  manifest jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.ota_updates (runtime_version, platform, created_at desc);
alter table public.ota_updates enable row level security; -- no policies: service role only
-- App users never touch it (RLS hides rows, but TRUNCATE ignores RLS), so grant them nothing.
revoke all on public.ota_updates from anon, authenticated;

insert into storage.buckets (id, name, public) values ('updates', 'updates', true) on conflict (id) do nothing;
