# Using OpenClaw’s mechanism on the VPS

We build on top of OpenClaw. Using **OpenClaw’s own** mechanisms for actions, multi-step execution, and proactivity is **better and easier** than reimplementing them in the SaaS.

## Why use OpenClaw’s mechanism

| Area | Our custom (SaaS) | OpenClaw on VPS |
|------|-------------------|-----------------|
| **Actions** | Fixed tools in code (`create_task`, `send_email`, …) | **ClawHub skills** (email, calendar, Slack, etc.) + custom skills; `openclaw skills install` |
| **Multi-step** | Stored plan + “Step N done” in DB | **ReAct** (think → tool → observe) + optional **lobster** for typed workflows |
| **Proactivity** | SaaS cron calls MiniMax “anything to say?” → Telegram | **HEARTBEAT** + **cron** + **hooks** in OpenClaw; agent can set its own crons |

Benefits of using OpenClaw on the VPS:

- One stack: skills, ReAct, heartbeat, and docs (e.g. [docs.clawd.bot](https://docs.clawd.bot)) all align.
- Less duplicate logic: no need to keep our `agent_tasks` / `agent_workflow` in sync with what the agent does.
- Richer actions and proactivity: ClawHub + heartbeat/cron/hooks instead of a single cron route.

## Current architecture

- **SaaS (this repo)**: Auth, paywall, Telegram link, deploy. Sends agent config (including optional `skills`) to VPS via `POST /api/agents`. Receives Telegram at `POST /api/telegram/webhook` and **forwards** to VPS `POST /api/telegram-hook` when the user has a live deployment.
- **VPS** (`vps-gateway/server.js`): Stores agent config (including optional `skills`). On `POST /api/telegram-hook`, when `OPENCLAW_INVOKE=1` and `OPENCLAW_CLI_PATH` are set, invokes OpenClaw and sends the agent’s reply to Telegram. On `POST /api/agents`, runs `openclaw skills install <name>` for each skill when OpenClaw is enabled.
- **In-SaaS fallback**: `api/telegram-hook` and `api/cron/proactive` remain for when the VPS is not used or not deployed.

## Target: OpenClaw on the VPS

1. **Message handling**  
   When the VPS receives `POST /api/telegram-hook` with `{ userId, chatId, text }`:
   - Load agent config for `userId` (bot token, API keys).
   - Run OpenClaw so it processes this message and replies to the user (e.g. `openclaw agent` with the right agent/channel/target so the reply goes to Telegram `chatId`).  
   See [OpenClaw CLI agent](https://docs.clawd.bot/cli/agent) and [OpenClaw message](https://docs.clawd.bot/cli/message) (e.g. `openclaw message send --channel telegram --target <chatId> --message "..."` for outbound).

2. **Skills (actions beyond browsing)**  
   - On deploy (or first use), ensure the VPS has the desired skills installed (e.g. `openclaw skills install <name>` from ClawHub).  
   - Optionally: SaaS sends a list of skill names in agent config; VPS runs `openclaw skills install` for that agent or a shared env.

3. **Multi-step**  
   - No extra work in our code: OpenClaw’s ReAct loop handles planning and chaining.  
   - Optionally use [lobster](https://docs.openclaw.ai/tools/lobster) for typed workflows and approval gates.

4. **Proactivity**  
   - Use OpenClaw’s **HEARTBEAT** (and **cron** / **hooks**) on the VPS instead of (or in addition to) the SaaS cron.  
   - [HEARTBEAT template](https://docs.clawd.bot/reference/templates/HEARTBEAT): add tasks so the agent checks things periodically.  
   - Then you can **deprecate or keep** `GET/POST /api/cron/proactive` as a fallback for users without a deployed VPS.

## Implementation status

1. **VPS gateway** — **Done.**  
   Implement the TODO in `vps-gateway/server.js`: on `POST /api/telegram-hook`, invoke OpenClaw (CLI or Gateway API) so the agent runs one turn for `userId` with `text` and replies to Telegram `chatId` (using the stored bot token).  
   This may require:
   - Writing a small runner that sets env (e.g. `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`) from the agent config and calls `openclaw agent ...` (or equivalent), then sends the agent’s reply via `openclaw message send --channel telegram ...`.
   - Or running OpenClaw Gateway on the VPS and sending an RPC/HTTP request to run the agent and get the reply, then sending that reply with `openclaw message send`.

2. **Deploy payload**  
   SaaS sends optional `skills: string[]` in agent config (from `OPENCLAW_DEFAULT_SKILLS` env or future UI). VPS stores them and runs `openclaw skills install <name>` for each when OpenClaw is enabled.

3. **Proactivity** — **VPS-side.**  
   On the VPS, configure OpenClaw with HEARTBEAT (and cron/hooks as needed). Optionally, keep the SaaS proactive cron only for “no VPS” or “proactive-only” tiers.

4. **Fallback**  
   Keep the SaaS `telegram-hook` and `cron/proactive` routes as a **fallback** when `OPENCLAW_VPS_URL` is not set or the user has no live deployment, so the product still works without a VPS.

## Summary

- **Yes:** implementing OpenClaw’s mechanism on the VPS (skills, ReAct, heartbeat/cron/hooks) is **easier and better** than reimplementing equivalent behavior only in the SaaS.
- **Next step:** implement the VPS gateway’s “hand off to OpenClaw” for `POST /api/telegram-hook`, then add skills and HEARTBEAT on the VPS; keep the current SaaS logic as a fallback when the VPS is not in use.
