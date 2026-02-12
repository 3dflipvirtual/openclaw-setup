/**
 * OpenClaw VPS Management Gateway
 *
 * Manages OpenClaw daemon lifecycle per user. Instead of forwarding messages,
 * this gateway writes openclaw.json + SOUL.md per user and manages PM2 processes.
 * OpenClaw handles Telegram natively via its built-in grammY channel.
 *
 * Each user gets an isolated HOME directory so OpenClaw's default ~/.openclaw/
 * path resolves to a per-user location.
 *
 * Endpoints:
 *   POST   /api/agents            — create/update agent (writes config, starts daemon)
 *   DELETE /api/agents/:userId    — stop + remove agent
 *   GET    /api/agents/:userId    — get agent status (running, stopped, etc.)
 *   POST   /api/agents/:userId/restart — restart agent daemon
 *   GET    /api/health            — gateway health check
 */

import "dotenv/config";
import express from "express";
import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";

const PORT = Number(process.env.PORT) || 3080;
const API_KEY = process.env.OPENCLAW_VPS_API_KEY;
const AGENTS_DIR = process.env.AGENTS_DIR || "/root/openclaw-agents";

if (!API_KEY) {
  console.error("OPENCLAW_VPS_API_KEY is required. Set it in the environment.");
  process.exit(1);
}

// Resolve the full path to the openclaw binary at startup.
let OPENCLAW_BIN = "openclaw";
try {
  OPENCLAW_BIN = execSync("which openclaw", { encoding: "utf-8" }).trim();
  console.log(`Resolved openclaw binary: ${OPENCLAW_BIN}`);
} catch {
  console.warn("Could not resolve openclaw binary path, using 'openclaw' from PATH");
}

// Ensure agents root directory exists
if (!existsSync(AGENTS_DIR)) {
  mkdirSync(AGENTS_DIR, { recursive: true });
}

const app = express();
app.use(express.json({ limit: "1mb" }));

function requireApiKey(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health check — no auth required (placed before middleware)
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    agentsDir: AGENTS_DIR,
  });
});

app.use("/api", requireApiKey);

/**
 * Get the isolated home directory for a user's agent.
 * Each user gets AGENTS_DIR/<safeId>/ as their HOME.
 * OpenClaw config goes to AGENTS_DIR/<safeId>/.openclaw/openclaw.json
 */
function safeId(userId) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function userHome(userId) {
  return join(AGENTS_DIR, safeId(userId));
}

function openclawDir(userId) {
  return join(userHome(userId), ".openclaw");
}

/**
 * Build an openclaw.json configuration for a user.
 */
function buildOpenClawConfig({ userId, telegramBotToken, minimaxApiKey, minimaxBaseUrl, anthropicApiKey, openaiApiKey, usingPlatformKey }) {
  const config = {
    agents: {
      defaults: {
        model: {},
      },
      list: [
        {
          id: "main",
          default: true,
        },
      ],
    },
    models: {
      providers: {},
    },
    channels: {},
    gateway: {
      mode: "local",
      auth: { mode: "token" },
    },
    cron: {
      enabled: !usingPlatformKey,
    },
  };

  // Configure model providers based on available keys
  if (minimaxApiKey) {
    config.agents.defaults.model.primary = "minimax/MiniMax-M2.1";
    config.models.providers.minimax = {
      apiKey: minimaxApiKey,
      baseUrl: minimaxBaseUrl || "https://api.minimax.io/anthropic/v1",
      api: "anthropic-messages",
      models: [
        {
          id: "MiniMax-M2.1",
          name: "MiniMax M2.1",
          reasoning: false,
          input: ["text"],
          contextWindow: 128000,
          maxTokens: 8192,
        },
      ],
    };
  }

  if (anthropicApiKey) {
    if (!config.agents.defaults.model.primary) {
      config.agents.defaults.model.primary = "anthropic/claude-sonnet-4-5";
    }
    config.models.providers.anthropic = {
      apiKey: anthropicApiKey,
      models: [
        {
          id: "claude-sonnet-4-5",
          name: "Claude Sonnet 4.5",
          reasoning: true,
          input: ["text"],
          contextWindow: 200000,
          maxTokens: 8192,
        },
      ],
    };
  }

  if (openaiApiKey) {
    if (!config.agents.defaults.model.primary) {
      config.agents.defaults.model.primary = "openai/gpt-4o";
    }
    config.models.providers.openai = {
      apiKey: openaiApiKey,
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          reasoning: false,
          input: ["text"],
          contextWindow: 128000,
          maxTokens: 16384,
        },
      ],
    };
  }

  // Configure Telegram channel
  if (telegramBotToken) {
    config.channels.telegram = {
      enabled: true,
      botToken: telegramBotToken,
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "disabled",
    };
  }

  return config;
}

/**
 * Check if a PM2 process exists for a user agent.
 */
function getPm2Status(userId) {
  const processName = `openclaw-${safeId(userId)}`;
  try {
    const output = execSync(`pm2 jlist`, { encoding: "utf-8", timeout: 5000 });
    const processes = JSON.parse(output);
    const proc = processes.find((p) => p.name === processName);
    if (!proc) return { running: false, processName };
    return {
      running: proc.pm2_env?.status === "online",
      status: proc.pm2_env?.status || "unknown",
      processName,
      pid: proc.pid,
      uptime: proc.pm2_env?.pm_uptime,
      restarts: proc.pm2_env?.restart_time,
    };
  } catch {
    return { running: false, processName };
  }
}

/**
 * Start or restart the OpenClaw daemon for a user via PM2.
 */
function startAgent(userId) {
  const home = userHome(userId);
  const processName = `openclaw-${safeId(userId)}`;

  // Stop existing process if any
  try {
    execSync(`pm2 delete ${processName}`, { stdio: "ignore", timeout: 10000 });
  } catch {
    // Process didn't exist, that's fine
  }

  // Start OpenClaw gateway daemon with an isolated HOME directory.
  // OpenClaw reads config from ~/.openclaw/openclaw.json by default.
  // By setting HOME per-user, each daemon gets its own config space.
  const gatewayToken = `oc_${userId.replace(/-/g, "").slice(0, 16)}`;
  const child = spawn("pm2", [
    "start", OPENCLAW_BIN,
    "--name", processName,
    "--",
    "gateway",
    "--allow-unconfigured",
  ], {
    cwd: home,
    stdio: "pipe",
    env: {
      ...process.env,
      HOME: home,
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    },
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d) => { stdout += d.toString(); });
  child.stderr?.on("data", (d) => { stderr += d.toString(); });

  return new Promise((resolve) => {
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[agents] PM2 start failed for ${userId}:`, stderr.slice(0, 500));
        resolve({ ok: false, error: stderr.slice(0, 200) || "PM2 start failed" });
      } else {
        console.log(`[agents] Started ${processName} (HOME=${home})`);
        resolve({ ok: true });
      }
    });
    child.on("error", (err) => {
      console.error(`[agents] spawn error for ${userId}:`, err.message);
      resolve({ ok: false, error: err.message });
    });
  });
}

/**
 * Stop the OpenClaw daemon for a user.
 */
function stopAgent(userId) {
  const processName = `openclaw-${safeId(userId)}`;
  try {
    execSync(`pm2 delete ${processName}`, { stdio: "ignore", timeout: 10000 });
    console.log(`[agents] Stopped ${processName}`);
    return { ok: true };
  } catch {
    return { ok: true }; // Already stopped
  }
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

// POST /api/agents — create or update agent config and start daemon
app.post("/api/agents", async (req, res) => {
  const {
    userId,
    telegramBotToken,
    openaiApiKey,
    anthropicApiKey,
    minimaxApiKey,
    minimaxBaseUrl,
    soulMd,
    skills,
    usingPlatformKey,
  } = req.body || {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId (string) required" });
  }

  // Create user's isolated home and .openclaw directory
  const ocDir = openclawDir(userId);
  if (!existsSync(ocDir)) {
    mkdirSync(ocDir, { recursive: true });
  }

  // Create memory directory inside .openclaw
  const memoryDir = join(ocDir, "memory");
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }

  // Write openclaw.json into ~/.openclaw/
  const config = buildOpenClawConfig({
    userId,
    telegramBotToken,
    minimaxApiKey,
    minimaxBaseUrl,
    anthropicApiKey,
    openaiApiKey,
    usingPlatformKey: Boolean(usingPlatformKey),
  });

  writeFileSync(join(ocDir, "openclaw.json"), JSON.stringify(config, null, 2), "utf-8");
  console.log(`[agents] Wrote openclaw.json for ${userId} -> ${ocDir}`);

  // Write SOUL.md if provided
  if (soulMd && typeof soulMd === "string") {
    writeFileSync(join(ocDir, "SOUL.md"), soulMd, "utf-8");
    console.log(`[agents] Wrote SOUL.md for ${userId}`);
  }

  // Install skills if any
  const skillList = Array.isArray(skills) ? skills.filter((s) => typeof s === "string" && s.trim()) : [];
  if (skillList.length > 0) {
    for (const name of skillList) {
      try {
        execSync(`openclaw skills install ${name}`, {
          cwd: ocDir,
          stdio: "ignore",
          timeout: 30000,
        });
        console.log(`[agents] Installed skill: ${name}`);
      } catch (err) {
        console.error(`[agents] Skill install failed: ${name}`, err.message);
      }
    }
  }

  // Clear any existing Telegram webhook so OpenClaw can use long polling.
  if (telegramBotToken) {
    try {
      const wh = await fetch(`https://api.telegram.org/bot${telegramBotToken}/deleteWebhook`, {
        method: "POST",
      });
      const whResult = await wh.json();
      console.log(`[agents] Deleted Telegram webhook for ${userId}:`, whResult?.ok ?? false);
    } catch (err) {
      console.warn(`[agents] Could not delete Telegram webhook for ${userId}:`, err.message);
    }
  }

  // Start the OpenClaw daemon
  const result = await startAgent(userId);

  if (!result.ok) {
    return res.status(500).json({ error: result.error || "Failed to start agent" });
  }

  res.json({ ok: true, message: "Agent configured and started" });
});

// DELETE /api/agents/:userId — stop and remove agent
app.delete("/api/agents/:userId", (req, res) => {
  const userId = req.params.userId;
  stopAgent(userId);
  console.log(`[agents] Deleted agent ${userId}`);
  res.json({ ok: true });
});

// GET /api/agents/:userId — get agent status
app.get("/api/agents/:userId", (req, res) => {
  const userId = req.params.userId;
  const ocDir = openclawDir(userId);
  const configExists = existsSync(join(ocDir, "openclaw.json"));
  const soulExists = existsSync(join(ocDir, "SOUL.md"));
  const pm2Status = getPm2Status(userId);

  res.json({
    userId,
    configured: configExists,
    hasSoul: soulExists,
    ...pm2Status,
  });
});

// POST /api/agents/:userId/restart — restart agent daemon
app.post("/api/agents/:userId/restart", async (req, res) => {
  const userId = req.params.userId;
  const ocDir = openclawDir(userId);

  if (!existsSync(join(ocDir, "openclaw.json"))) {
    return res.status(404).json({ error: "Agent not configured. Deploy first." });
  }

  const result = await startAgent(userId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error || "Failed to restart agent" });
  }

  res.json({ ok: true, message: "Agent restarted" });
});

// GET /api/agents/:userId/usage — get token usage for this agent
app.get("/api/agents/:userId/usage", (req, res) => {
  const userId = req.params.userId;
  const ocDir = openclawDir(userId);

  if (!existsSync(join(ocDir, "openclaw.json"))) {
    return res.status(404).json({ error: "Agent not configured" });
  }

  let tokensUsed = 0;
  const sessionsPath = join(ocDir, "sessions.json");
  if (existsSync(sessionsPath)) {
    try {
      const sessions = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          tokensUsed += (s.tokensIn || 0) + (s.tokensOut || 0);
        }
      } else if (sessions && typeof sessions === "object") {
        for (const key of Object.keys(sessions)) {
          const s = sessions[key];
          tokensUsed += (s?.tokensIn || 0) + (s?.tokensOut || 0);
        }
      }
    } catch {
      // ignore
    }
  }

  const memoryDir = join(ocDir, "memory");
  let activeDays = 0;
  if (existsSync(memoryDir)) {
    try {
      const files = readdirSync(memoryDir).filter(f => f.endsWith(".md"));
      activeDays = files.length;
    } catch {
      // ignore
    }
  }

  res.json({
    userId,
    tokensUsed,
    activeDays,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClaw VPS Management Gateway listening on port ${PORT}`);
  console.log(`Agents directory: ${AGENTS_DIR}`);
});
