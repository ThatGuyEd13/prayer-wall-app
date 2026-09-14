-- Praying/reacting is now open to every member, not just pastoral roles —
-- the owner has decided this should be a whole-church action, matching the
-- Hallelujah reaction that was already open to everyone. Church-wide
-- notices, exporting the log, and role management are unaffected.
create or replace function public.pray_for(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_name text;
  req record;
  already boolean;
begin
  select name into me_name from public.profiles where id = auth.uid();
  if me_name is null then
    raise exception 'Not signed in';
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

  if req.kind = 'praise' then
    insert into public.notifications (to_user_id, title, body)
    values (
      req.owner_id,
      me_name || ' said Hallelujah to your praise',
      '"' || left(req.text, 60) || case when length(req.text) > 60 then '…' else '' end || '"'
    );
  else
    insert into public.notifications (to_user_id, title, body)
    values (
      req.owner_id,
      me_name || ' prayed for you',
      'On your request: "' || left(req.text, 60) || case when length(req.text) > 60 then '…' else '' end || '"'
    );
  end if;
end;
$$;

drop policy "prayer_log_insert" on public.prayer_log;
create policy "prayer_log_insert" on public.prayer_log
  for insert with check (
    prayed_by = auth.uid()
    and exists (select 1 from public.requests r where r.id = request_id)
  );
