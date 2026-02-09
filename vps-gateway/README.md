# OpenClaw VPS Management Gateway

Manages OpenClaw daemon lifecycle per user. Each user gets their own OpenClaw instance with a dedicated workspace, `openclaw.json`, and `SOUL.md`. OpenClaw handles Telegram natively — no message forwarding needed.

## Architecture

```
SaaS (Vercel) → Management API (this gateway) → PM2 → OpenClaw daemons
                                                         ├── User A (openclaw.json + SOUL.md)
                                                         ├── User B (openclaw.json + SOUL.md)
                                                         └── User C (openclaw.json + SOUL.md)
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/agents | Bearer | Create/update agent: writes config, SOUL.md, starts daemon |
| DELETE | /api/agents/:userId | Bearer | Stop and remove agent |
| GET | /api/agents/:userId | Bearer | Get agent status (running, config state) |
| POST | /api/agents/:userId/restart | Bearer | Restart agent daemon |
| GET | /api/health | None | Gateway health check |

All `/api/*` endpoints (except health) require: **`Authorization: Bearer <OPENCLAW_VPS_API_KEY>`**.

## Setup

1. **Install OpenClaw on the VPS:**

   ```bash
   npm install -g openclaw@latest
   ```

2. **Install PM2:**

   ```bash
   npm install -g pm2
   ```

3. **Set environment variables** (or use `.env`):

   ```bash
   export OPENCLAW_VPS_API_KEY="your-secret-key"   # same as in Vercel
   export AGENTS_DIR="/home/ubuntu/.openclaw-agents" # optional, default: ~/.openclaw-agents
   export PORT=3080                                  # optional, default: 3080
   ```

4. **Install and run the gateway:**

   ```bash
   cd vps-gateway
   npm install
   npm start
   ```

5. **Run with PM2 (24/7):**

   ```bash
   pm2 start server.js --name openclaw-gateway
   pm2 save
   pm2 startup   # start on boot
   ```

## How It Works

When the SaaS calls `POST /api/agents`, the gateway:

1. Creates a workspace directory at `AGENTS_DIR/<userId>/`
2. Writes `openclaw.json` with Telegram channel config, LLM provider keys, and tool settings
3. Writes `SOUL.md` with the user's chosen personality
4. Installs any requested ClawHub skills
5. Starts the OpenClaw daemon via PM2

OpenClaw then runs as a persistent process, handling:
- Telegram messages natively (via built-in grammY)
- Memory (MEMORY.md + daily logs with hybrid vector/BM25 search)
- Tools (100+ built-in: file system, web, browser, email, etc.)
- Autonomy (HEARTBEAT every 30 min, cron scheduling)
- Multi-step reasoning (ReAct loop)

## Test

```bash
export API_KEY="your-secret-key"

# Create agent
curl -X POST http://localhost:3080/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"userId":"test-user","telegramBotToken":"123:ABC","soulMd":"# Soul\n\n## Core Truths\n- Be helpful"}'

# Check status
curl http://localhost:3080/api/agents/test-user \
  -H "Authorization: Bearer $API_KEY"

# Restart
curl -X POST http://localhost:3080/api/agents/test-user/restart \
  -H "Authorization: Bearer $API_KEY"

# Delete
curl -X DELETE http://localhost:3080/api/agents/test-user \
  -H "Authorization: Bearer $API_KEY"

# Health check (no auth needed)
curl http://localhost:3080/api/health
```
