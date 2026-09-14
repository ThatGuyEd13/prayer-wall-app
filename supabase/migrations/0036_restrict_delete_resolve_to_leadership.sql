-- Only the owner and lead pastor may delete or resolve a request/praise now —
-- a member can no longer delete or mark answered their own post.
drop policy if exists "requests_delete" on public.requests;
create policy "requests_delete" on public.requests
  for delete using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('lead_pastor','owner')
    )
  );

drop policy if exists "requests_update_own" on public.requests;
create policy "requests_update_own" on public.requests
  for update using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('lead_pastor','owner')
    )
  )
  with check (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('lead_pastor','owner')
    )
  );
