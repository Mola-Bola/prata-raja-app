-- Schema fingerprint: run on local (docker exec -i supabase_db_prata-raja psql -U postgres -At -F " " < scripts/db-fingerprint.sql)
-- and on the cloud (Supabase MCP execute_sql with this text). Every row must match after a migration.
select kind, md5(string_agg(x, '|' order by x)) as fp, count(*) as n from (
  select 'policies' kind, schemaname||'.'||tablename||'.'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'')||':'||array_to_string(roles,',') x
    from pg_policies where schemaname in ('public','storage') and (schemaname='public' or policyname like '%feedback%')
  union all select 'functions', p.proname||':'||md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all select 'columns', table_name||'.'||column_name||':'||data_type||':'||coalesce(column_default,'')||':'||is_nullable from information_schema.columns where table_schema='public'
  union all select 'col_grants', table_name||'.'||column_name||':'||privilege_type||':'||grantee from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated')
  union all select 'table_grants', table_name||':'||privilege_type||':'||grantee from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated')
  union all select 'fn_exec', r.routine_name||':'||r.grantee from information_schema.routine_privileges r where r.routine_schema='public' and r.grantee in ('anon','authenticated','PUBLIC')
  union all select 'triggers', event_object_table||'.'||trigger_name||':'||event_manipulation||':'||action_timing from information_schema.triggers where trigger_schema='public'
) s group by kind order by kind;
