-- Lets the client know whether the signed-in user already has a PIN set
-- (to decide "set up your PIN" vs "enter your PIN"), without ever exposing
-- the hash itself.
create function public.has_pin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select pin_hash is not null from public.profiles where id = auth.uid();
$$;

grant execute on function public.has_pin() to authenticated;
