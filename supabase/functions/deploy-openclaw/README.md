# deploy-openclaw (deprecated)

This Edge Function is **no longer used**. The SaaS has moved to an **always-on VPS** (e.g. Oracle Cloud VM) for running OpenClaw.

- The app now calls the VPS HTTP API to **create / configure / delete** agents (see `docs/VPS-API.md`).
- Telegram messages are forwarded from the Next.js webhook to the VPS at `POST /api/telegram-hook`.

You can leave this function in the repo for reference or remove it. Do not deploy it for new setups.
