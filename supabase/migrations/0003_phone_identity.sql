-- Supabase Auth's phone+password sign-up requires a real SMS provider
-- (Twilio) to be configured, even with confirmations disabled — this
-- project has none. Work around it: authenticate internally via a
-- deterministic placeholder email derived from the phone number, while the
-- app UI only ever asks for phone + password. The real phone number lives
-- here on profiles as normal data.

alter table public.profiles add column phone text unique not null;

-- Let anyone (even signed-out visitors) check whether a phone number is
-- already registered, without exposing anything else about that account.
-- Needed so the sign-in screen can show "Sign in" vs "Save it and sign in"
-- before the visitor has any session at all.
create function public.phone_taken(p_phone text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.profiles where phone = p_phone);
$$;

grant execute on function public.phone_taken(text) to anon, authenticated;

-- handle_new_user() now also copies the real phone number out of the
-- sign-up metadata into profiles.phone.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Member'),
    case when is_first then 'owner' else 'member' end,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
