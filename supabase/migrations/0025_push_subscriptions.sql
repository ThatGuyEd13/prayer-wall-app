-- Stores each device's Web Push subscription so church-wide notices can be
-- delivered as a real push notification, not just an in-app row. A user can
-- have more than one subscription (phone + laptop, etc.), keyed by endpoint.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());
