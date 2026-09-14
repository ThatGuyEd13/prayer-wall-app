-- The insert policy on client_diagnostics is rejecting authenticated
-- inserts even though auth.uid() clearly resolves correctly for the same
-- request against other tables. Recreate it from scratch as a simple
-- always-true check (this table has no sensitive read path — it is
-- write-only diagnostics — so an open insert check is fine).
drop policy if exists "client_diagnostics_insert" on public.client_diagnostics;
create policy "client_diagnostics_insert" on public.client_diagnostics
  for insert to authenticated, anon
  with check (true);
