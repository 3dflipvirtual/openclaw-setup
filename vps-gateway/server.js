/**
 * OpenClaw VPS Management Gateway
 *
 * Manages OpenClaw daemon lifecycle per user. Instead of forwarding messages,
 * this gateway writes openclaw.json + SOUL.md per user and manages PM2 processes.
 * OpenClaw handles Telegram natively via its built-in grammY channel.
 *
 * Endpoints:
 *   POST   /api/agents            — create/update agent (writes config, starts daemon)
 *   DELETE /api/agents/:userId    — stop + remove agent
 *   GET    /api/agents/:userId    — get agent status (running, stopped, etc.)
 *   POST   /api/agents/:userId/restart — restart agent daemon
 *   GET    /api/health            — gateway health check
 *
 * Run: OPENCLAW_VPS_API_KEY=your-key node server.js
 * PM2: pm2 start server.js --name openclaw-gateway
 */

import "dotenv/config";
import express from "express";
import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";

const PORT = Number(process.env.PORT) || 3080;
const API_KEY = process.env.OPENCLAW_VPS_API_KEY;
const AGENTS_DIR = process.env.AGENTS_DIR || join(process.env.HOME || "/root", ".openclaw-agents");

if (!API_KEY) {
  console.error("OPENCLAW_VPS_API_KEY is required. Set it in the environment.");
  process.exit(1);
}

// Resolve the full path to the openclaw binary at startup.
// This avoids PM2 confusing the binary name "openclaw" with an existing
// PM2 process also named "openclaw" (the gateway itself).
let OPENCLAW_BIN = "openclaw";
try {
  OPENCLAW_BIN = execSync("which openclaw", { encoding: "utf-8" }).trim();
  console.log(`Resolved openclaw binary: ${OPENCLAW_BIN}`);
} catch {
  console.warn("Could not resolve openclaw binary path, using 'openclaw' from PATH");
}

// Ensure agents directory exists
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
 * Get the workspace directory for a user's agent.
 */
function agentDir(userId) {
  // Sanitize userId for filesystem safety
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(AGENTS_DIR, safeId);
}

/**
 * Build an openclaw.json configuration for a user.
 */
function buildOpenClawConfig({ userId, telegramBotToken, minimaxApiKey, minimaxBaseUrl, anthropicApiKey, openaiApiKey, usingPlatformKey }) {
  const config = {
    $schema: "https://openclaw.ai/schemas/openclaw.json",
    agents: {
      default: userId,
      list: [
        {
          id: userId,
          identity: {
            name: "OpenClaw Agent",
            emoji: "🦞",
          },
        },
      ],
    },
    // Model provider configuration — prefer MiniMax, fallback to others
    models: {},
    channels: {},
    tools: {
      profile: "full",
    },
    heartbeat: {
      enabled: true,
      // Platform key users: heartbeat every 2 hours to save API credits
      // Own key users: every 30 minutes for full autonomy
      interval: usingPlatformKey ? 7200 : 1800,
    },
  };

  // Configure model providers based on available keys
  if (minimaxApiKey) {
    config.models.default = {
      provider: "minimax",
      model: "MiniMax-M2.1",
    };
    config.models.providers = config.models.providers || {};
    config.models.providers.minimax = {
      apiKey: minimaxApiKey,
      ...(minimaxBaseUrl ? { baseUrl: minimaxBaseUrl } : {}),
    };
  }

  if (anthropicApiKey) {
    if (!config.models.default) {
      config.models.default = {
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
      };
    }
    config.models.providers = config.models.providers || {};
    config.models.providers.anthropic = {
      apiKey: anthropicApiKey,
    };
  }

  if (openaiApiKey) {
    if (!config.models.default) {
      config.models.default = {
        provider: "openai",
        model: "gpt-4o",
      };
    }
    config.models.providers = config.models.providers || {};
    config.models.providers.openai = {
      apiKey: openaiApiKey,
    };
  }

  // Configure Telegram channel if bot token is provided
  if (telegramBotToken) {
    config.channels.telegram = {
      enabled: true,
      botToken: telegramBotToken,
      dm: { enabled: true, mode: "auto" },
      groups: { enabled: false },
    };
  }

  return config;
}

/**
 * Check if a PM2 process exists for a user agent.
 */
function getPm2Status(userId) {
  const processName = `openclaw-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
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
  const dir = agentDir(userId);
  const processName = `openclaw-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  // Stop existing process if any
  try {
    execSync(`pm2 delete ${processName}`, { stdio: "ignore", timeout: 10000 });
  } catch {
    // Process didn't exist, that's fine
  }

  // Start OpenClaw daemon with the agent's workspace
  // OpenClaw reads openclaw.json from the workspace directory
  // Use full binary path to avoid PM2 confusing it with existing process names
  const child = spawn("pm2", [
    "start", OPENCLAW_BIN,
    "--name", processName,
    "--",
    "--workspace", dir,
    "--config", join(dir, "openclaw.json"),
  ], {
    cwd: dir,
    stdio: "pipe",
    env: { ...process.env },
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
        console.log(`[agents] Started ${processName}`);
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
  const processName = `openclaw-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
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

  const dir = agentDir(userId);

  // Create agent workspace directory
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create memory directory
  const memoryDir = join(dir, "memory");
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }

  // Write openclaw.json
  const config = buildOpenClawConfig({
    userId,
    telegramBotToken,
    minimaxApiKey,
    minimaxBaseUrl,
    anthropicApiKey,
    openaiApiKey,
    usingPlatformKey: Boolean(usingPlatformKey),
  });

  writeFileSync(join(dir, "openclaw.json"), JSON.stringify(config, null, 2), "utf-8");
  console.log(`[agents] Wrote openclaw.json for ${userId}`);

  // Write SOUL.md if provided
  if (soulMd && typeof soulMd === "string") {
    writeFileSync(join(dir, "SOUL.md"), soulMd, "utf-8");
    console.log(`[agents] Wrote SOUL.md for ${userId}`);
  }

  // Install skills if any
  const skillList = Array.isArray(skills) ? skills.filter((s) => typeof s === "string" && s.trim()) : [];
  if (skillList.length > 0) {
    for (const name of skillList) {
      try {
        execSync(`openclaw skills install ${name}`, {
          cwd: dir,
          stdio: "ignore",
          timeout: 30000,
        });
        console.log(`[agents] Installed skill: ${name}`);
      } catch (err) {
        console.error(`[agents] Skill install failed: ${name}`, err.message);
      }
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

  // Stop the daemon
  stopAgent(userId);

  // Remove workspace (optional — keep data for now, just stop the process)
  // To fully clean up, uncomment:
  // const dir = agentDir(userId);
  // if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });

  console.log(`[agents] Deleted agent ${userId}`);
  res.json({ ok: true });
});

// GET /api/agents/:userId — get agent status
app.get("/api/agents/:userId", (req, res) => {
  const userId = req.params.userId;
  const dir = agentDir(userId);
  const configExists = existsSync(join(dir, "openclaw.json"));
  const soulExists = existsSync(join(dir, "SOUL.md"));
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
  const dir = agentDir(userId);

  if (!existsSync(join(dir, "openclaw.json"))) {
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
  const dir = agentDir(userId);

  if (!existsSync(join(dir, "openclaw.json"))) {
    return res.status(404).json({ error: "Agent not configured" });
  }

  // OpenClaw tracks token usage in the agent's workspace.
  // Try reading from sessions.json or token usage files.
  let tokensUsed = 0;

  // Check OpenClaw's token usage tracking (sessions.json stores per-session token counts)
  const sessionsPath = join(dir, "sessions.json");
  if (existsSync(sessionsPath)) {
    try {
      const sessions = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      // Sum up token usage across all sessions
      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          tokensUsed += (s.tokensIn || 0) + (s.tokensOut || 0);
        }
      } else if (sessions && typeof sessions === "object") {
        // Could be keyed by session ID
        for (const key of Object.keys(sessions)) {
          const s = sessions[key];
          tokensUsed += (s?.tokensIn || 0) + (s?.tokensOut || 0);
        }
      }
    } catch {
      // Can't read sessions, default to 0
    }
  }

  // Also check memory directory for activity (daily log files = agent was active)
  const memoryDir = join(dir, "memory");
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
