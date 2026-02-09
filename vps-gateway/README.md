# OpenClaw VPS Gateway

Locked-down API server for the always-on OpenClaw VPS. **Only requests that include the API key are accepted** (all others get 401).

When **OpenClaw is installed on the VPS**, set `OPENCLAW_INVOKE=1` and `OPENCLAW_CLI_PATH=openclaw` (or the path to the CLI). Then `POST /api/telegram-hook` will run `openclaw agent --agent <userId> --message "<text>"` and send the agent’s stdout as the Telegram reply. See **docs/OPENCLAW-INTEGRATION.md** in the repo root for the full plan (skills, ReAct, heartbeat).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/agents | Create or update agent (body: userId, telegramBotToken, …) |
| DELETE | /api/agents/:userId | Delete agent |
| POST | /api/telegram-hook | Forwarded Telegram message (body: userId, chatId, text) |

Every request must send: **`Authorization: Bearer <OPENCLAW_VPS_API_KEY>`**.

## Setup

1. **Set the API key on the VPS** (same value you set in Vercel as `OPENCLAW_VPS_API_KEY`):

   ```bash
   export OPENCLAW_VPS_API_KEY="your-secret-key"
   ```

   Or use a `.env` file (do not commit it):

   ```
   OPENCLAW_VPS_API_KEY=your-secret-key
   PORT=3080
   ```

2. **Install and run:**

   ```bash
   cd vps-gateway
   npm install
   npm start
   ```

3. **Run with PM2 (24/7):**

   ```bash
   cd vps-gateway
   npm install
   pm2 start server.js --name openclaw-gateway
   pm2 save
   pm2 startup   # optional: start on boot
   ```

   If you use a `.env` file, load it first:

   ```bash
   pm2 start server.js --name openclaw-gateway --env production
   # Or: pm2 start "node -r dotenv/config server.js" --name openclaw-gateway
   ```

   With a plain env file, you can do:

   ```bash
   set -a && source .env && set +a && pm2 start server.js --name openclaw-gateway
   ```

## Test

```bash
export API_KEY="your-secret-key"
curl -X POST http://localhost:3080/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"userId":"test-user-123","telegramBotToken":"optional"}'
# Expect: {"ok":true}

curl -X POST http://localhost:3080/api/agents \
  -H "Authorization: Bearer wrong" \
  -d '{}'
# Expect: 401 Unauthorized
```
