-- Supabase installs pgcrypto into the `extensions` schema, not `public`.
-- set_my_pin()/verify_pin() had `search_path = public` only, so
-- gen_salt()/crypt() silently failed with "function does not exist" —
-- the RPC call errored, but the client wasn't checking for that error, so
-- the PIN-setup screen looked like it succeeded while nothing was ever
-- saved. Widen the search_path so these functions can actually find them.

create or replace function public.set_my_pin(pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.profiles
  set pin_hash = crypt(pin, gen_salt('bf'))
  where id = auth.uid();
end;
$$;

create or replace function public.verify_pin(pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored text;
begin
  select pin_hash into stored from public.profiles where id = auth.uid();
  if stored is null then
    return false;
  end if;
  return stored = crypt(pin, stored);
end;
$$;
