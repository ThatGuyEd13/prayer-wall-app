-- One-time SMS codes for passwordless sign-in. Only ever read/written by
-- the send-sms-code / verify-sms-code Edge Functions using the service
-- role, which bypasses RLS entirely — no policies are granted here, so
-- clients have zero direct access to this table.
create table public.otp_codes (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.otp_codes enable row level security;
