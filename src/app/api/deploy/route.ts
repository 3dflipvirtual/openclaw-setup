import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { getSoulForPersonality } from "@/lib/personalities";
import { createOrConfigureAgent, isVpsConfigured } from "@/lib/openclaw-vps";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function checkRateLimit(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  key: string,
  limit: number,
  windowSeconds: number
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (!existing || new Date(existing.window_start) < windowStart) {
    await supabase.from("rate_limits").upsert({
      key,
      window_start: now.toISOString(),
      count: 1,
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);
  return true;
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const deployAllowed = await checkRateLimit(
    admin,
    `deploy:${user.id}`,
    5,
    60 * 60
  );

  if (!deployAllowed) {
    return NextResponse.json(
      {
        error:
          "Too many deploy attempts. Please wait about an hour before trying again.",
      },
      { status: 429 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("paid")
    .eq("id", user.id)
    .single();

  if (!profile?.paid) {
    return NextResponse.json(
      { error: "Payment required" },
      { status: 402 }
    );
  }

  if (!isVpsConfigured()) {
    return NextResponse.json(
      {
        error:
          "OpenClaw server is not configured. Set OPENCLAW_VPS_URL and OPENCLAW_VPS_API_KEY.",
      },
      { status: 503 }
    );
  }

  // Build agent config: Telegram bot token (required for replies) + optional API keys
  let telegramBotToken: string | undefined;
  let webhookSecret: string | undefined;
  const { data: link } = await admin
    .from("telegram_links")
    .select("bot_token_encrypted, webhook_secret")
    .eq("user_id", user.id)
    .maybeSingle();
  if (link?.bot_token_encrypted) {
    try {
      telegramBotToken = decryptSecret(link.bot_token_encrypted);
    } catch {
      // continue without token; VPS may still create agent
    }
  }
  if (link?.webhook_secret) {
    webhookSecret = link.webhook_secret;
  }

  const { data: secrets } = await admin
    .from("secrets")
    .select("type, encrypted_value")
    .eq("user_id", user.id);
  const secretMap: Record<string, string> = {};
  if (secrets?.length) {
    for (const s of secrets) {
      try {
        secretMap[s.type] = decryptSecret(s.encrypted_value);
      } catch {
        // skip invalid
      }
    }
  }

  const defaultSkills =
    process.env.OPENCLAW_DEFAULT_SKILLS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  const agentConfig = {
    userId: user.id,
    telegramBotToken,
    openaiApiKey: secretMap.openai_api_key,
    anthropicApiKey: secretMap.anthropic_api_key,
    minimaxApiKey: secretMap.minimax_api_key ?? process.env.PLATFORM_MINIMAX_API_KEY,
    minimaxBaseUrl: secretMap.minimax_base_url ?? process.env.MINIMAX_BASE_URL,
    skills: defaultSkills,
  };

  const result = await createOrConfigureAgent(agentConfig);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Agent creation failed" },
      { status: result.status && result.status >= 400 ? result.status : 500 }
    );
  }

  // Set Telegram webhook to VPS so this bot's updates go to the always-on server (URL includes secret for per-user lookup)
  if (telegramBotToken && webhookSecret && process.env.OPENCLAW_VPS_URL) {
    const hookUrl = `${process.env.OPENCLAW_VPS_URL}/api/telegram-hook?secret=${encodeURIComponent(webhookSecret)}`;
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hookUrl }),
    });
  }

  await supabase.from("deployments").insert({
    user_id: user.id,
    status: "live",
    config: { vps: true },
  });

  await supabase
    .from("agents")
    .update({ status: "live", last_ping: new Date().toISOString() })
    .eq("user_id", user.id);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    message: "Deployed OpenClaw agent on always-on server.",
  });

  // Insert soul for this agent from user's chosen personality (one per user_id + agent_id, do not overwrite)
  if (telegramBotToken) {
    const { data: profileRow } = await admin
      .from("profiles")
      .select("personality")
      .eq("id", user.id)
      .maybeSingle();
    const soul = getSoulForPersonality(profileRow?.personality ?? "default");
    await admin
      .from("agent_soul")
      .upsert(
        {
          user_id: user.id,
          agent_id: telegramBotToken,
          soul,
        },
        { onConflict: "user_id,agent_id", ignoreDuplicates: true }
      );
  }

  return NextResponse.json({
    status: "ok",
    message: "Agent created on server",
  });
}
