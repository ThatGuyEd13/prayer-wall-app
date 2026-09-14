-- Prayer Wall — core schema, roles, and row-level security.
-- Identity/password/OTP are handled by Supabase Auth (auth.users, keyed by phone).
-- This migration adds the app-specific profile, request, prayer-log, and
-- notification tables, plus the business-rule functions that enforce the
-- role model from the design spec.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'member'
    check (role in ('member','prayer_team','agricultural_minister','pastor','lead_pastor','owner')),
  pin_hash text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Column-level lock-down: nobody can SELECT pin_hash directly, even on their
-- own row. PIN verification happens only inside verify_pin() below.
revoke select on public.profiles from authenticated, anon;
grant select (id, name, role, created_at) on public.profiles to authenticated, anon;
grant insert (id, name, role) on public.profiles to authenticated;
grant update (name, pin_hash) on public.profiles to authenticated;

-- Everyone can see every profile EXCEPT the owner's row — unless the viewer
-- IS the owner, or is looking at their own row. Matches: "Edward's row must
-- be invisible on the People list to everyone except Edward himself."
create policy "profiles_select" on public.profiles
  for select using (
    role <> 'owner'
    or id = auth.uid()
    or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'owner')
  );

-- A user may only insert their own profile row (fired once, right after
-- sign-up, from the client — see handle_new_user() trigger below which does
-- this automatically instead).
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- A user may update only their own row (name / pin_hash). Role changes are
-- never done via direct update — only through cycle_role()/transfer_ownership()
-- below, which run as SECURITY DEFINER and enforce the promotion ladder.
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile the moment someone signs up. First person ever
-- becomes the owner; everyone after that starts as a member.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Member'),
    case when is_first then 'owner' else 'member' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  tag text not null,
  audience text not null check (audience in ('church','pastors')),
  kind text not null default 'request' check (kind in ('request','praise')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.requests enable row level security;

-- Members see church-wide requests + their own; leader roles see everything.
create policy "requests_select" on public.requests
  for select using (
    audience = 'church'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('pastor','agricultural_minister','lead_pastor','owner')
    )
  );

create policy "requests_insert_own" on public.requests
  for insert with check (owner_id = auth.uid());

-- Only the owning member can toggle answered_at on their own request.
create policy "requests_update_own" on public.requests
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- prayer_log — who prayed for which request, and when.
-- ---------------------------------------------------------------------------
create table public.prayer_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  prayed_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, prayed_by)
);

alter table public.prayer_log enable row level security;

-- Anyone who can see the request can see who's prayed for it (needed for
-- the "N have prayed" count).
create policy "prayer_log_select" on public.prayer_log
  for select using (
    exists (select 1 from public.requests r where r.id = request_id)
  );

-- Only leader roles may log a prayer, and only for themselves.
create policy "prayer_log_insert" on public.prayer_log
  for insert with check (
    prayed_by = auth.uid()
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role in ('pastor','agricultural_minister','lead_pastor','owner')
    )
  );

create policy "prayer_log_delete_own" on public.prayer_log
  for delete using (prayed_by = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (to_user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

-- No direct insert policy for notifications — they're only ever created by
-- the SECURITY DEFINER functions below (pray_for, send_broadcast), so a
-- client can never forge a notification "from" someone else.

-- ---------------------------------------------------------------------------
-- Business-rule functions (all SECURITY DEFINER — run with elevated
-- privilege but only do exactly what's named, after checking the caller's
-- own role from auth.uid()).
-- ---------------------------------------------------------------------------

-- Set your own PIN (first-time setup for elevated roles) or change it later.
create function public.set_my_pin(pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set pin_hash = crypt(pin, gen_salt('bf'))
  where id = auth.uid();
end;
$$;

-- Verify a PIN attempt without ever exposing the stored hash to the client.
create function public.verify_pin(pin text)
returns boolean
language plpgsql
security definer
set search_path = public
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

-- Pray for a request: logs the prayer and notifies the requester, atomically.
-- Toggles off (removes the log entry, no new notification) if already prayed.
create function public.pray_for(p_request_id uuid)
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
  if me_role not in ('pastor','agricultural_minister','lead_pastor','owner') then
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

-- Send a church-wide notice: one notification per existing account.
-- Lead pastor and owner only.
create function public.send_broadcast(body text)
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
  if me_role not in ('lead_pastor','owner') then
    raise exception 'Only the lead pastor or owner can send a church-wide notice';
  end if;

  insert into public.notifications (to_user_id, title, body)
  select id, 'Notice from ' || me_name, body from public.profiles;
end;
$$;

-- Cycle a target user's role up the ladder. Lead pastor and owner only;
-- only the owner may promote someone to (or off of) lead pastor; nobody
-- may touch the owner's own row through this path.
create function public.cycle_role(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
  target_role text;
  ladder text[] := array['member','prayer_team','agricultural_minister','pastor','lead_pastor'];
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

-- Transfer ownership: owner only. Current owner drops to lead_pastor,
-- target becomes owner.
create function public.transfer_ownership(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role <> 'owner' then
    raise exception 'Only the owner can transfer ownership';
  end if;
  if target_id = auth.uid() then
    raise exception 'Pick someone else to hand ownership to';
  end if;

  update public.profiles set role = 'lead_pastor' where id = auth.uid();
  update public.profiles set role = 'owner' where id = target_id;
end;
$$;

-- Export data for CSV — returns every request with its owner's name and
-- prayed status. Leader roles only (matches "Export the prayer log").
create function public.export_prayer_log()
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
  if me_role not in ('lead_pastor','owner') then
    raise exception 'Only the lead pastor or owner can export the prayer log';
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

-- Delete the entire church account (owner only). Wipes all app data; the
-- caller's own auth.users row is removed too so they're fully signed out.
create function public.delete_church_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text;
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role <> 'owner' then
    raise exception 'Only the owner can delete the church account';
  end if;

  delete from public.notifications;
  delete from public.prayer_log;
  delete from public.requests;
  delete from auth.users; -- cascades to profiles
end;
$$;
