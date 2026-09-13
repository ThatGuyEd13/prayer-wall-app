-- Lets the lead pastor/owner pick a person's role directly instead of
-- stepping through the ladder one rank at a time (replaces cycle_role for
-- the People list). Same rules as cycle_role: only the owner can hand off
-- ownership or promote someone to lead pastor.
create or replace function public.set_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
  target_role text;
  valid_roles text[] := array['member','prayer_team','agricultural_minister','worship_minister','pastor','lead_pastor'];
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role not in ('lead_pastor','owner') then
    raise exception 'Only the lead pastor or owner can change roles';
  end if;

  if new_role is null or not (new_role = any(valid_roles)) then
    raise exception 'Not a valid role';
  end if;

  select role into target_role from public.profiles where id = target_id;
  if target_role is null then
    raise exception 'Target user not found';
  end if;
  if target_role = 'owner' then
    raise exception 'Only the owner can hand off ownership';
  end if;
  if new_role = 'lead_pastor' and me_role <> 'owner' then
    raise exception 'Only the owner can make someone lead pastor';
  end if;

  update public.profiles
  set role = new_role, pin_hash = case when new_role = 'member' then null else pin_hash end
  where id = target_id;
end;
$$;
