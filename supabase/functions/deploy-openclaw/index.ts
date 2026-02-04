import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function getKey() {
  const key = Deno.env.get("ENCRYPTION_KEY");
  if (!key) throw new Error("Missing ENCRYPTION_KEY");
  const hashed = await crypto.subtle.digest("SHA-256", encoder.encode(key));
  return crypto.subtle.importKey("raw", hashed, "AES-GCM", false, [
    "decrypt",
    "encrypt",
  ]);
}

async function decryptSecret(value: string) {
  const [ivB64, tagB64, cipherB64] = value.split(":");
  if (!ivB64 || !tagB64 || !cipherB64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = base64ToBytes(ivB64);
  const tag = base64ToBytes(tagB64);
  const cipher = base64ToBytes(cipherB64);
  const combined = new Uint8Array(cipher.length + tag.length);
  combined.set(cipher);
  combined.set(tag, cipher.length);
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return new TextDecoder().decode(decrypted);
}

async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value)
  );
  const bytes = new Uint8Array(encrypted);
  const tag = bytes.slice(bytes.length - 16);
  const cipher = bytes.slice(0, bytes.length - 16);
  return [bytesToBase64(iv), bytesToBase64(tag), bytesToBase64(cipher)].join(":");
}

async function putWorkerSecret(
  accountId: string,
  token: string,
  scriptName: string,
  name: string,
  text: string
) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, text, type: "secret_text" }),
    }
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Secret set failed: ${payload}`);
  }
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type BundleManifest = {
  main_module: string;
  modules: { name: string; type: string }[];
  compatibility_date?: string;
  compatibility_flags?: string[];
  durable_objects?: unknown;
  r2_buckets?: unknown;
  browser?: unknown;
  observability?: unknown;
  assets?: unknown;
  triggers?: unknown;
};

async function loadBundleManifest(manifestUrl: string) {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch moltworker bundle manifest");
  }
  return (await response.json()) as BundleManifest;
}

function getBaseUrl(url: string) {
  return url.replace(/\/[^/]+$/, "");
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
  const cloudflareToken = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? "";
  const manifestUrl =
    Deno.env.get("MOLTWORKER_BUNDLE_URL") ??
    `${supabaseUrl}/storage/v1/object/public/moltworker-bundles/moltworker/bundle.json`;

  const cfAccessTeam = Deno.env.get("CF_ACCESS_TEAM_DOMAIN") ?? "";
  const cfAccessAud = Deno.env.get("CF_ACCESS_AUD") ?? "";
  const aiGatewayKey = Deno.env.get("AI_GATEWAY_API_KEY") ?? "";
  const aiGatewayBase = Deno.env.get("AI_GATEWAY_BASE_URL") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const telegramPolicy = Deno.env.get("TELEGRAM_DM_POLICY") ?? "pairing";
  const bindMode = Deno.env.get("CLAWDBOT_BIND_MODE") ?? "gateway";
  const sleepAfter = Deno.env.get("SANDBOX_SLEEP_AFTER") ?? "never";
  const workerSubdomain = Deno.env.get("CLOUDFLARE_WORKERS_SUBDOMAIN") ?? "";
  const cdpSecret = Deno.env.get("CDP_SECRET") ?? "";
  const platformMinimaxKey = Deno.env.get("PLATFORM_MINIMAX_API_KEY") ?? "";
  const minimaxBaseUrl = Deno.env.get("MINIMAX_BASE_URL") ?? "https://api.minimax.io/anthropic";
  const platformTelegramToken = Deno.env.get("PLATFORM_TELEGRAM_BOT_TOKEN") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Supabase env missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!cloudflareAccountId || !cloudflareToken) {
    return new Response(JSON.stringify({ error: "Cloudflare env missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header. Please log in again." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(
      JSON.stringify({
        error: userError?.message ?? "Invalid or expired session. Please log in again.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: secrets, error: secretsError } = await supabase
    .from("secrets")
    .select("type, encrypted_value")
    .eq("user_id", user.id);

  if (secretsError) {
    return new Response(JSON.stringify({ error: secretsError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const claudeSecret = secrets?.find((secret) => secret.type === "claude_api_key");
  const telegramSecret = secrets?.find(
    (secret) => secret.type === "telegram_bot_token"
  );

  const { data: telegramLink } = await supabase
    .from("telegram_links")
    .select("bot_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!platformMinimaxKey && !claudeSecret) {
    return new Response(JSON.stringify({ error: "Missing MiniMax or Claude secret" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let claudeApiKey = platformMinimaxKey;
  let telegramBotToken = platformTelegramToken;

  try {
    if (!claudeApiKey && claudeSecret) {
      claudeApiKey = await decryptSecret(claudeSecret.encrypted_value);
    }
    if (telegramLink?.bot_token_encrypted) {
      telegramBotToken = await decryptSecret(telegramLink.bot_token_encrypted);
    } else if (!telegramBotToken && telegramSecret) {
      telegramBotToken = await decryptSecret(telegramSecret.encrypted_value);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!claudeApiKey) {
    return new Response(JSON.stringify({ error: "Missing MiniMax API key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!telegramBotToken) {
    return new Response(JSON.stringify({ error: "Connect your Telegram bot in onboarding first, then deploy again." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const workerName = `openclaw-${user.id.slice(0, 8)}`;

  let manifest: BundleManifest;
  try {
    manifest = await loadBundleManifest(manifestUrl);
  } catch (error) {
    const msg = (error as Error).message;
    return new Response(
      JSON.stringify({
        error: msg.includes("fetch") || msg.includes("manifest")
          ? `${msg} Check MOLTWORKER_BUNDLE_URL or upload the bundle to Supabase Storage (bucket: moltworker-bundles, path: moltworker/bundle.json).`
          : msg,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseUrl = getBaseUrl(manifestUrl);
  const mainModule = manifest.main_module ?? "index.js";
  const modules = Array.isArray(manifest.modules) ? manifest.modules : [];

  const moduleResponses = await Promise.all(
    modules.map(async (mod) => {
      const response = await fetch(`${baseUrl}/${mod.name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch module ${mod.name}`);
      }
      const content = new Uint8Array(await response.arrayBuffer());
      return { mod, content };
    })
  );

  const mainResponse = await fetch(`${baseUrl}/${mainModule}`);
  if (!mainResponse.ok) {
    return new Response(JSON.stringify({ error: "Missing main module" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const mainContent = new Uint8Array(await mainResponse.arrayBuffer());

  const metadata: Record<string, unknown> = {
    main_module: mainModule,
    modules,
    compatibility_date: manifest.compatibility_date,
    compatibility_flags: manifest.compatibility_flags,
    durable_objects: manifest.durable_objects,
    r2_buckets: manifest.r2_buckets,
    browser: manifest.browser,
    observability: manifest.observability,
    assets: manifest.assets,
    triggers: manifest.triggers,
  };

  Object.keys(metadata).forEach((key) => {
    if (metadata[key] === undefined) {
      delete metadata[key];
    }
  });

  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append(
    mainModule,
    new Blob([mainContent], { type: "application/javascript+module" }),
    mainModule
  );

  for (const { mod, content } of moduleResponses) {
    const contentType =
      mod.type === "text"
        ? "text/plain"
        : mod.type === "esm" || mod.name.endsWith(".js")
          ? "application/javascript+module"
          : "application/javascript";
    form.append(mod.name, new Blob([content], { type: contentType }), mod.name);
  }

  const deployResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/scripts/${workerName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
      },
      body: form,
    }
  );

  if (!deployResponse.ok) {
    const payload = await deployResponse.text();
    return new Response(JSON.stringify({ error: payload }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gatewayToken = generateToken();
  const encryptedGatewayToken = await encryptSecret(gatewayToken);
  await supabase.from("secrets").upsert(
    {
      user_id: user.id,
      type: "gateway_token",
      encrypted_value: encryptedGatewayToken,
      last4: gatewayToken.slice(-4),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,type" }
  );

  try {
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "MINIMAX_API_KEY", claudeApiKey);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "MINIMAX_BASE_URL", minimaxBaseUrl);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "TELEGRAM_BOT_TOKEN", telegramBotToken);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "MOLTBOT_GATEWAY_TOKEN", gatewayToken);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "TELEGRAM_DM_POLICY", telegramPolicy);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "CLAWDBOT_BIND_MODE", bindMode);
    await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "SANDBOX_SLEEP_AFTER", sleepAfter);
    if (cfAccessTeam) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "CF_ACCESS_TEAM_DOMAIN", cfAccessTeam);
    }
    if (cfAccessAud) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "CF_ACCESS_AUD", cfAccessAud);
    }
    if (aiGatewayKey) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "AI_GATEWAY_API_KEY", aiGatewayKey);
    }
    if (aiGatewayBase) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "AI_GATEWAY_BASE_URL", aiGatewayBase);
    }
    if (openaiKey) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "OPENAI_API_KEY", openaiKey);
    }
    if (cdpSecret) {
      await putWorkerSecret(cloudflareAccountId, cloudflareToken, workerName, "CDP_SECRET", cdpSecret);
    }
    if (workerSubdomain) {
      await putWorkerSecret(
        cloudflareAccountId,
        cloudflareToken,
        workerName,
        "WORKER_URL",
        `https://${workerName}.${workerSubdomain}.workers.dev`
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

    return new Response(JSON.stringify({ ok: true, worker: workerName, gatewayToken }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
