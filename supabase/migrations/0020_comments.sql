-- Comments on requests/praises. Anyone who can see a request (per the same
-- visibility rule as requests_select) can read and add comments on it —
-- this is a general communication feature, not gated to pastoral roles.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.requests r
      where r.id = request_id
        and (
          r.audience = 'church'
          or r.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles me
            where me.id = auth.uid()
              and me.role in ('pastor','agricultural_minister','worship_minister','lead_pastor','owner')
          )
        )
    )
  );

create policy "comments_insert" on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and (
          r.audience = 'church'
          or r.owner_id = auth.uid()
          or exists (
            select 1 from public.profiles me
            where me.id = auth.uid()
              and me.role in ('pastor','agricultural_minister','worship_minister','lead_pastor','owner')
          )
        )
    )
  );
