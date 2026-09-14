-- Let a member delete their own request/praise, and let the lead pastor or
-- owner delete any post. Comments and prayer_log rows for that request are
-- already `on delete cascade` (see 0001_init.sql, 0020_comments.sql), so
-- deleting the request cleans those up automatically.
create policy "requests_delete" on public.requests
  for delete using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('lead_pastor','owner')
    )
  );
