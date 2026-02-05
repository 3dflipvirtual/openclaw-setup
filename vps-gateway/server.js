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
app.post("/api/agents", (req, res) => {
  const { userId, telegramBotToken, openaiApiKey, anthropicApiKey, minimaxApiKey, minimaxBaseUrl } = req.body || {};
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId (string) required" });
  }
  agents.set(userId, {
    userId,
    telegramBotToken: telegramBotToken ?? null,
    openaiApiKey: openaiApiKey ?? null,
    anthropicApiKey: anthropicApiKey ?? null,
    minimaxApiKey: minimaxApiKey ?? null,
    minimaxBaseUrl: minimaxBaseUrl ?? null,
    updatedAt: new Date().toISOString(),
  });
  console.log("[agents] create/update", userId);
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
app.post("/api/telegram-hook", (req, res) => {
  const { userId, chatId, text } = req.body || {};
  if (!userId || chatId == null) {
    return res.status(400).json({ error: "userId and chatId required" });
  }
  const agent = agents.get(userId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  console.log("[telegram-hook]", userId, "chatId", chatId, "text", (text || "").slice(0, 80));
  // TODO: hand off to OpenClaw / reply via agent.telegramBotToken
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClaw VPS gateway listening on port ${PORT}`);
});
