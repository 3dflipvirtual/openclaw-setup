create table public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  code text unique,
  chat_id bigint unique,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_links enable row level security;

create policy "telegram_links_select_own"
  on public.telegram_links
  for select
  using (user_id = auth.uid());

create policy "telegram_links_insert_own"
  on public.telegram_links
  for insert
  with check (user_id = auth.uid());

create policy "telegram_links_update_own"
  on public.telegram_links
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "telegram_links_delete_own"
  on public.telegram_links
  for delete
  using (user_id = auth.uid());

create table public.rate_limits (
  key text primary key,
  window_start timestamptz,
  count integer default 0
);
