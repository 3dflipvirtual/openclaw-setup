/**
 * Client for the OpenClaw VPS Management Gateway.
 * The VPS gateway manages OpenClaw daemon lifecycle per user:
 * writes openclaw.json + SOUL.md, starts/stops PM2 processes.
 * OpenClaw handles Telegram natively — no message forwarding needed.
 */

const VPS_URL = process.env.OPENCLAW_VPS_URL ?? "";
const VPS_API_KEY = process.env.OPENCLAW_VPS_API_KEY ?? "";

export function isVpsConfigured(): boolean {
  return Boolean(VPS_URL && VPS_API_KEY);
}

export type AgentConfig = {
  userId: string;
  telegramBotToken?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  /** SOUL.md content — written to the agent's workspace */
  soulMd?: string;
  /** ClawHub skill names to install (e.g. ['email', 'calendar']) */
  skills?: string[];
  /** True if user has no own API key — platform key rate limits apply */
  usingPlatformKey?: boolean;
};

type VpsResult = {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
};

async function vpsFetch(
  path: string,
  options: { method: string; body?: object }
): Promise<VpsResult> {
  const base = VPS_URL.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VPS_API_KEY}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: (data as { error?: string })?.error ?? (res.ok ? undefined : res.statusText),
  };
}

/**
 * Create or update an agent on the VPS.
 * Writes openclaw.json + SOUL.md and starts the OpenClaw daemon.
 */
export async function createOrConfigureAgent(config: AgentConfig): Promise<VpsResult> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  return vpsFetch("/api/agents", { method: "POST", body: config });
}

/**
 * Delete an agent from the VPS (stops daemon, keeps data).
 */
export async function deleteAgent(userId: string): Promise<VpsResult> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  return vpsFetch(`/api/agents/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

/**
 * Get agent status from the VPS (running, stopped, config state).
 */
export async function getAgentStatus(userId: string): Promise<VpsResult> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  return vpsFetch(`/api/agents/${encodeURIComponent(userId)}`, { method: "GET" });
}

/**
 * Restart an agent's OpenClaw daemon on the VPS.
 */
export async function restartAgent(userId: string): Promise<VpsResult> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  return vpsFetch(`/api/agents/${encodeURIComponent(userId)}/restart`, { method: "POST" });
}
