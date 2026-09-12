-- The client has subscribed to postgres_changes on these tables since the
-- start, but they were never added to the supabase_realtime publication, so
-- no change ever actually reached the app — the wall only ever updated on a
-- manual refresh. Adding them here makes new requests/prayers/comments/
-- notifications/role changes push to every open app instantly.
do $$
declare
  t text;
begin
  foreach t in array array['requests', 'prayer_log', 'notifications', 'profiles', 'comments']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
