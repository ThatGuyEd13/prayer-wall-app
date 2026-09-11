-- The profiles_select policy queried public.profiles from within its own
-- USING clause (to check "is the viewer the owner?"), which makes Postgres
-- re-evaluate the same policy recursively -> "infinite recursion detected
-- in policy for relation profiles" (42P17).
--
-- Fix: move that check into a SECURITY DEFINER function. Since the function
-- is owned by the same role that owns the profiles table (the migration
-- role), and the table is not under FORCE ROW LEVEL SECURITY, the owner's
-- queries inside the function bypass RLS entirely — so no recursion.

create function public.is_owner(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = uid and role = 'owner');
$$;

drop policy "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (
    role <> 'owner'
    or id = auth.uid()
    or public.is_owner(auth.uid())
  );
