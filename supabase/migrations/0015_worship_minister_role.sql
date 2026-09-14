-- Adds a "worship_minister" role with the same permission profile as
-- agricultural_minister: full leader access (see every request, pray),
-- full admin-tab access (broadcasts, export, People list) EXCEPT changing
-- roles, which stays lead_pastor/owner only.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','prayer_team','agricultural_minister','worship_minister','pastor','lead_pastor','owner'));

drop policy "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (
    audience = 'church'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('pastor','agricultural_minister','worship_minister','lead_pastor','owner')
    )
  );

drop policy "prayer_log_insert" on public.prayer_log;
create policy "prayer_log_insert" on public.prayer_log
  for insert with check (
    prayed_by = auth.uid()
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('pastor','agricultural_minister','worship_minister','lead_pastor','owner')
    )
  );

create or replace function public.pray_for(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
  me_name text;
  req record;
  already boolean;
begin
  select role, name into me_role, me_name from public.profiles where id = auth.uid();
  if me_role not in ('pastor','agricultural_minister','worship_minister','lead_pastor','owner') then
    raise exception 'Only pastoral roles can pray for a request';
  end if;

  select * into req from public.requests where id = p_request_id;
  if req is null then
    raise exception 'Request not found';
  end if;

  select exists(
    select 1 from public.prayer_log where request_id = p_request_id and prayed_by = auth.uid()
  ) into already;

  if already then
    delete from public.prayer_log where request_id = p_request_id and prayed_by = auth.uid();
    return;
  end if;

  insert into public.prayer_log (request_id, prayed_by) values (p_request_id, auth.uid());

  insert into public.notifications (to_user_id, title, body)
  values (
    req.owner_id,
    me_name || ' prayed for you',
    'On your request: "' || left(req.text, 60) || case when length(req.text) > 60 then '…' else '' end || '"'
  );
end;
$$;

create or replace function public.send_broadcast(body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
  me_name text;
begin
  select role, name into me_role, me_name from public.profiles where id = auth.uid();
  if me_role not in ('lead_pastor','owner','agricultural_minister','worship_minister') then
    raise exception 'Only the lead pastor, owner, or a specialty minister can send a church-wide notice';
  end if;

  insert into public.notifications (to_user_id, title, body)
  select id, 'Notice from ' || me_name, body from public.profiles;
end;
$$;

create or replace function public.export_prayer_log()
returns table (
  owner_name text,
  created_at timestamptz,
  tag text,
  audience text,
  kind text,
  prayed boolean,
  request_text text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role not in ('lead_pastor','owner','agricultural_minister','worship_minister') then
    raise exception 'Only the lead pastor, owner, or a specialty minister can export the prayer log';
  end if;

  return query
    select
      p.name,
      r.created_at,
      r.tag,
      r.audience,
      r.kind,
      exists(select 1 from public.prayer_log pl where pl.request_id = r.id),
      r.text
    from public.requests r
    join public.profiles p on p.id = r.owner_id
    order by r.created_at desc;
end;
$$;

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
  if target_role = 'lead_pastor' and me_role <> 'owner' then
    raise exception 'Only the owner can change a lead pastor';
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
