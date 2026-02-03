-- Bring your own Telegram bot: store encrypted token and webhook secret per user
alter table public.telegram_links
  add column if not exists bot_token_encrypted text,
  add column if not exists webhook_secret text,
  add column if not exists bot_username text;

create unique index if not exists telegram_links_webhook_secret_unique
  on public.telegram_links(webhook_secret)
  where webhook_secret is not null;

comment on column public.telegram_links.bot_token_encrypted is 'AES-GCM encrypted Telegram bot token (user-provided)';
comment on column public.telegram_links.webhook_secret is 'Secret used in webhook URL to route updates to this user';
comment on column public.telegram_links.bot_username is 'Cached @username of the user''s bot for display';
