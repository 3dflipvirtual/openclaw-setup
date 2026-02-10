-- Token budget tracking for per-user usage metering.
-- Monthly credits reset each billing period. Recharges add to recharge_credits.
-- Credits are abstract units (not raw tokens) — 1000 credits = 1 month's base allocation.

create table if not exists token_budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  monthly_credits int not null default 1000,
  used_credits int not null default 0,
  recharge_credits int not null default 0,
  period_start timestamptz not null default date_trunc('month', now()),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- RLS: users can read their own budget
alter table token_budgets enable row level security;

create policy "Users can view own budget"
  on token_budgets for select
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_token_budgets_user_id on token_budgets(user_id);
