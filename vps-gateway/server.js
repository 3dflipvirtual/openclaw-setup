/**
 * OpenClaw VPS Gateway — lock down with OPENCLAW_VPS_API_KEY.
 * Only requests with Authorization: Bearer <OPENCLAW_VPS_API_KEY> are accepted.
 *
 * Endpoints:
 *   POST   /api/agents        — create/update agent
 *   DELETE /api/agents/:userId — delete agent
 *   POST   /api/telegram-hook  — forwarded Telegram message
 *
 * Run: OPENCLAW_VPS_API_KEY=your-key node server.js
 * Or:  Create .env with OPENCLAW_VPS_API_KEY and run npm start
 * PM2:  pm2 start server.js --name openclaw-gateway
 */

import "dotenv/config";
import express from "express";

const PORT = Number(process.env.PORT) || 3080;
const API_KEY = process.env.OPENCLAW_VPS_API_KEY;

if (!API_KEY) {
  console.error("OPENCLAW_VPS_API_KEY is required. Set it in the environment.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// In-memory agent configs (keyed by userId). Replace with file/DB for persistence.
const agents = new Map();

function requireApiKey(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.use("/api", requireApiKey);

// POST /api/agents — create or update agent
app.post("/api/agents", async (req, res) => {
  const { userId, telegramBotToken, openaiApiKey, anthropicApiKey, minimaxApiKey, minimaxBaseUrl, skills } = req.body || {};
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId (string) required" });
  }
  const skillList = Array.isArray(skills) ? skills.filter((s) => typeof s === "string" && s.trim()) : [];
  agents.set(userId, {
    userId,
    telegramBotToken: telegramBotToken ?? null,
    openaiApiKey: openaiApiKey ?? null,
    anthropicApiKey: anthropicApiKey ?? null,
    minimaxApiKey: minimaxApiKey ?? null,
    minimaxBaseUrl: minimaxBaseUrl ?? null,
    skills: skillList,
    updatedAt: new Date().toISOString(),
  });
  console.log("[agents] create/update", userId, skillList.length ? `skills=${skillList.join(",")}` : "");

  if (process.env.OPENCLAW_INVOKE === "1" && process.env.OPENCLAW_CLI_PATH && skillList.length > 0) {
    const { spawn } = await import("child_process");
    const cli = process.env.OPENCLAW_CLI_PATH;
    for (const name of skillList) {
      spawn(cli, ["skills", "install", name], { stdio: "ignore", env: process.env }).on("error", (err) =>
        console.error("[agents] skills install failed", name, err.message)
      );
    }
  }

  res.json({ ok: true });
});

// DELETE /api/agents/:userId
app.delete("/api/agents/:userId", (req, res) => {
  const userId = req.params.userId;
  if (agents.has(userId)) {
    agents.delete(userId);
    console.log("[agents] delete", userId);
  }
  res.json({ ok: true });
});

// POST /api/telegram-hook — forwarded from SaaS webhook
// To use OpenClaw: set OPENCLAW_INVOKE=1 and have OpenClaw installed on the VPS.
// Then we spawn: openclaw agent --agent <userId> --message "<text>" with env
// TELEGRAM_BOT_TOKEN, etc., and the agent reply is sent via openclaw message send
// (see docs/OPENCLAW-INTEGRATION.md).
async function sendTelegramReply(chatId, text, botToken) {
  if (!botToken || !text) return;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    console.error("[telegram-hook] send reply failed", res.status, await res.text());
  }
}

app.post("/api/telegram-hook", async (req, res) => {
  const { userId, chatId, text } = req.body || {};
  if (!userId || chatId == null) {
    return res.status(400).json({ error: "userId and chatId required" });
  }
  const agent = agents.get(userId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  console.log("[telegram-hook]", userId, "chatId", chatId, "text", (text || "").slice(0, 80));

  const useOpenClaw = process.env.OPENCLAW_INVOKE === "1";
  if (useOpenClaw && process.env.OPENCLAW_CLI_PATH) {
    const { spawn } = await import("child_process");
    const cli = process.env.OPENCLAW_CLI_PATH; // e.g. "openclaw" or "/usr/local/bin/openclaw"
    const env = {
      ...process.env,
      TELEGRAM_BOT_TOKEN: agent.telegramBotToken || "",
      OPENAI_API_KEY: agent.openaiApiKey || process.env.OPENAI_API_KEY || "",
      ANTHROPIC_API_KEY: agent.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
      MINIMAX_API_KEY: agent.minimaxApiKey || process.env.MINIMAX_API_KEY || "",
    };
    const msg = (text || "").replace(/"/g, '\\"');
    const child = spawn(cli, ["agent", "--agent", userId, "--message", msg], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error("[telegram-hook] OpenClaw exit", code, stderr.slice(0, 500));
      }
      const reply = stdout.trim();
      if (reply && agent.telegramBotToken) {
        sendTelegramReply(chatId, reply, agent.telegramBotToken).catch((e) =>
          console.error("[telegram-hook] sendTelegramReply", e)
        );
      }
    });
    child.on("error", (err) => {
      console.error("[telegram-hook] OpenClaw spawn error", err);
      sendTelegramReply(chatId, "Agent is temporarily unavailable.", agent.telegramBotToken);
    });
    return res.json({ ok: true });
  }

  // No OpenClaw: ack only. SaaS may use in-SaaS telegram-hook for full handling.
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClaw VPS gateway listening on port ${PORT}`);
});
