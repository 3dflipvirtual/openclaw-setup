/**
 * Client for the OpenClaw VPS API (always-on Oracle Cloud VM).
 * The VPS exposes agent create/delete/configure and receives forwarded Telegram updates.
 */

const VPS_URL = process.env.OPENCLAW_VPS_URL ?? "";
const VPS_API_KEY = process.env.OPENCLAW_VPS_API_KEY ?? "";

export function isVpsConfigured(): boolean {
  return Boolean(VPS_URL && VPS_API_KEY);
}

export type AgentConfig = {
  userId: string;
  telegramBotToken?: string;
  /** Optional: API keys and settings the VPS may use for this agent */
  openaiApiKey?: string;
  anthropicApiKey?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  [key: string]: string | undefined;
};

async function vpsFetch(
  path: string,
  options: { method: string; body?: object }
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
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
 * Create or update (configure) an agent on the VPS.
 * Idempotent: same userId overwrites existing config.
 */
export async function createOrConfigureAgent(config: AgentConfig): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  const res = await vpsFetch("/api/agents", {
    method: "POST",
    body: config,
  });
  return {
    ok: res.ok,
    error: res.error,
    status: res.status,
  };
}

/**
 * Delete an agent from the VPS.
 */
export async function deleteAgent(userId: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "OPENCLAW_VPS_URL or OPENCLAW_VPS_API_KEY not set" };
  }
  const res = await vpsFetch(`/api/agents/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  return { ok: res.ok, error: res.error, status: res.status };
}

/**
 * Forward a Telegram message payload to the VPS so the user's agent can process it.
 */
/**
 * Forward a Telegram message to the VPS. Uses same Bearer token as other VPS API calls.
 */
export async function forwardTelegramToVps(payload: {
  userId: string;
  chatId: number;
  text: string;
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!isVpsConfigured()) {
    return { ok: false, error: "VPS not configured" };
  }
  const res = await vpsFetch("/api/telegram-hook", {
    method: "POST",
    body: payload,
  });
  return { ok: res.ok, status: res.status, error: res.error };
}
