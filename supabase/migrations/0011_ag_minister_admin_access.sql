-- Agricultural minister now gets the same admin-tab access as lead pastor
-- (church-wide broadcasts, exporting the prayer log) EXCEPT changing member
-- roles / promoting someone to pastor, which stays lead_pastor/owner only
-- (cycle_role() and transfer_ownership()/delete_church_account() are left
-- untouched on purpose).

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
  if me_role not in ('lead_pastor','owner','agricultural_minister') then
    raise exception 'Only the lead pastor, owner, or agricultural minister can send a church-wide notice';
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
  if me_role not in ('lead_pastor','owner','agricultural_minister') then
    raise exception 'Only the lead pastor, owner, or agricultural minister can export the prayer log';
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
