-- A tiny write-only log so real devices can report exactly what their
-- browser reports about push-notification support, without asking someone
-- to transcribe a long user-agent string back over text. Only inserts are
-- allowed from the client; nobody can read other people's rows via the API.
create table public.client_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  context text not null,
  info text not null,
  created_at timestamptz not null default now()
);

alter table public.client_diagnostics enable row level security;

create policy "client_diagnostics_insert" on public.client_diagnostics
  for insert with check (auth.uid() is not null);
