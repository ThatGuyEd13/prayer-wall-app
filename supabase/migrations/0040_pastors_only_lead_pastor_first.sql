-- Pastors-only posts now reach the lead pastor and owner first. Other
-- leader roles (pastor, agricultural minister, worship minister) can't see
-- one until the lead pastor or owner explicitly shares it with them.
alter table public.requests add column released_to_leadership boolean not null default false;

drop policy "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (
    audience = 'church'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('lead_pastor','owner')
    )
    or (
      released_to_leadership
      and exists (
        select 1 from public.profiles me
        where me.id = auth.uid()
          and me.role in ('pastor','agricultural_minister','worship_minister')
      )
    )
  );

-- Comments visibility mirrors requests_select and needs the same update, or
-- a not-yet-shared pastors-only post's comments would leak to other leaders.
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
              and me.role in ('lead_pastor','owner')
          )
          or (
            r.released_to_leadership
            and exists (
              select 1 from public.profiles me
              where me.id = auth.uid()
                and me.role in ('pastor','agricultural_minister','worship_minister')
            )
          )
        )
    )
  );
