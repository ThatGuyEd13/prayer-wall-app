-- Stores the church's Google Sheets connection. Only ever read/written by
-- Edge Functions using the service role (which bypasses RLS entirely), so
-- there is deliberately no RLS policy granting clients direct access to the
-- refresh token — clients only ever call the export-prayer-log function.
create table public.google_sheets_integration (
  id boolean primary key default true check (id), -- singleton row (one church, one connection)
  refresh_token text not null,
  spreadsheet_id text,
  connected_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.google_sheets_integration enable row level security;
-- No policies created: authenticated/anon have zero access. Only the
-- service-role key (used inside Edge Functions) can read or write this
-- table, which bypasses RLS by design.
