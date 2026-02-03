create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  code text unique,
  chat_id bigint unique,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists telegram_links_user_id_idx on public.telegram_links(user_id);
create unique index if not exists telegram_links_user_id_unique on public.telegram_links(user_id);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null default 0
);

alter table public.telegram_links enable row level security;

create policy "Telegram links are private" on public.telegram_links
  for select using (user_id = auth.uid());
create policy "Telegram links insert self" on public.telegram_links
  for insert with check (user_id = auth.uid());
create policy "Telegram links update self" on public.telegram_links
  for update using (user_id = auth.uid());
create policy "Telegram links delete self" on public.telegram_links
  for delete using (user_id = auth.uid());
