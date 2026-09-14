-- Two visibility changes the owner asked for directly:
--
-- 1. Every member can now see every request, including ones sent to the
--    pastors only (previously only pastoral roles could). The "Pastors
--    only" tag is still shown for context, it just no longer hides the
--    post from other members.
--
-- 2. The owner's own name/profile was being hidden from everyone but
--    themselves (an old policy meant to keep the owner out of the
--    People-management list, which the client already handles on its own).
--    That made the owner's posts and reactions show up with a blank name
--    and a blank avatar for every other member — fixed by letting anyone
--    signed in read any profile's name.

drop policy "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (true);

drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (true);

drop policy "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    exists (select 1 from public.requests r where r.id = comments.request_id)
  );

drop policy "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.requests r where r.id = comments.request_id)
  );
