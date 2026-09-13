-- Fix a bug where a lead pastor could already promote a pastor straight to
-- lead pastor — the ladder's wraparound math produced 'lead_pastor' as the
-- next role regardless of who called cycle_role, even though the guide has
-- always said only the owner can do this. Now it's actually owner-only.
create or replace function public.cycle_role(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
  target_role text;
  ladder text[] := array['member','prayer_team','agricultural_minister','worship_minister','pastor','lead_pastor'];
  idx int;
  next_role text;
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role not in ('lead_pastor','owner') then
    raise exception 'Only the lead pastor or owner can change roles';
  end if;

  select role into target_role from public.profiles where id = target_id;
  if target_role is null then
    raise exception 'Target user not found';
  end if;
  if target_role = 'owner' then
    raise exception 'Only the owner can hand off ownership';
  end if;
  if target_role = 'pastor' and me_role <> 'owner' then
    raise exception 'Only the owner can make someone lead pastor';
  end if;

  idx := array_position(ladder, target_role);
  next_role := ladder[(idx % array_length(ladder,1)) + 1];
  if me_role = 'owner' and target_role = 'pastor' then
    next_role := 'lead_pastor';
  end if;

  update public.profiles
  set role = next_role, pin_hash = case when next_role = 'member' then null else pin_hash end
  where id = target_id;
end;
$$;
