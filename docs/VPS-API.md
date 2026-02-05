# OpenClaw VPS API

The SaaS calls these HTTP endpoints on your always-on OpenClaw server (e.g. Oracle Cloud VM). All requests require:

- **Authorization**: `Bearer <OPENCLAW_VPS_API_KEY>` (same key you set in Vercel as `OPENCLAW_VPS_API_KEY`).

---

## POST /api/agents

Create or update an agent (idempotent). Same `userId` overwrites existing config.

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | yes | Supabase user ID (UUID). |
| telegramBotToken | string | no | User's Telegram bot token (decrypted). Required for the agent to reply in Telegram. |
| openaiApiKey | string | no | OpenAI API key for this agent. |
| anthropicApiKey | string | no | Anthropic API key. |
| minimaxApiKey | string | no | MiniMax API key. |
| minimaxBaseUrl | string | no | MiniMax base URL. |

**Response:** `200 OK` with `{ "ok": true }` or JSON error and appropriate status (e.g. 400, 401, 500).

**Example:**

```bash
curl -X POST "https://your-vps.example.com/api/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VPS_API_KEY" \
  -d '{"userId":"uuid","telegramBotToken":"123:ABC"}'
```

---

## DELETE /api/agents/:userId

Delete the agent for the given user.

**Response:** `200 OK` or 404 if no agent exists.

---

## POST /api/telegram-hook

Called by the SaaS when a Telegram message is received (webhook forwards here). The VPS should route the message to the correct agent by `userId` and process it (e.g. run OpenClaw and reply via the user's Telegram bot token).

**Request:** Same `Authorization: Bearer <OPENCLAW_VPS_API_KEY>` header.

**Request body (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| userId | string | Supabase user ID. |
| chatId | number | Telegram chat ID. |
| text | string | Message text. |

**Response:** `200 OK` with `{ "ok": true }` or error JSON.

---

## Implementation notes

- Run OpenClaw (or your gateway) as a long-lived process (e.g. systemd, Docker). The VPS API can be a thin HTTP layer that creates/updates per-user config files or sends config to the OpenClaw process.
- Store `telegramBotToken` and API keys securely (e.g. encrypted at rest, not in logs).
- For multi-tenant: one OpenClaw instance can handle multiple agents keyed by `userId`; or one process per user if you prefer isolation.
