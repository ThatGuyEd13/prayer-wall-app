-- Reverting part of 0026: the owner decided members should NOT see requests
-- sent to the pastors only after all. Restoring the original audience-gated
-- visibility for requests and comments. The profiles_select fix from 0026
-- (everyone can see everyone's name) stays — that was fixing a real bug,
-- unrelated to this.

drop policy "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (
    audience = 'church'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role = any (array['pastor', 'agricultural_minister', 'worship_minister', 'lead_pastor', 'owner'])
    )
  );

drop policy "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.requests r
      where r.id = comments.request_id
        and (
          r.audience = 'church'
          or r.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles me
            where me.id = auth.uid()
              and me.role = any (array['pastor', 'agricultural_minister', 'worship_minister', 'lead_pastor', 'owner'])
          )
        )
    )
  );

drop policy "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = comments.request_id
        and (
          r.audience = 'church'
          or r.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles me
            where me.id = auth.uid()
              and me.role = any (array['pastor', 'agricultural_minister', 'worship_minister', 'lead_pastor', 'owner'])
          )
        )
    )
  );
