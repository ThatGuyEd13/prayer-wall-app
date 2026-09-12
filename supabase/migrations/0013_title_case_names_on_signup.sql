-- Belt-and-suspenders fix for names landing lowercase (client autocapitalize
-- doesn't always fire, e.g. on desktop web or pasted text): title-case the
-- name server-side too, in the same trigger that creates the profile row.
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
    initcap(coalesce(new.raw_user_meta_data->>'name', 'Member')),
    case when is_first then 'owner' else 'member' end,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
