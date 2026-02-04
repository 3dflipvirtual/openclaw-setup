import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { username?: string; first_name?: string };
  };
};

const STRICT_LIMITS = {
  perChat: { limit: 8, windowSeconds: 60 },
  perUser: { limit: 20, windowSeconds: 60 },
  perIp: { limit: 120, windowSeconds: 60 },
};

async function sendMessage(
  chatId: number,
  text: string,
  botToken: string
) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

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

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createAdminSupabaseClient();
  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id, code, verified, chat_id, bot_token_encrypted")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!link?.user_id || !link.bot_token_encrypted) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let botToken: string;
  try {
    botToken = decryptSecret(link.bot_token_encrypted);
  } catch {
    return NextResponse.json({ error: "Invalid link config" }, { status: 500 });
  }

  const payload = (await request.json()) as TelegramUpdate;
  const message = payload.message;

  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  const chatAllowed = await checkRateLimit(
    supabaseAdmin,
    `chat:${chatId}`,
    STRICT_LIMITS.perChat.limit,
    STRICT_LIMITS.perChat.windowSeconds
  );
  const ipAllowed = await checkRateLimit(
    supabaseAdmin,
    `ip:${ip}`,
    STRICT_LIMITS.perIp.limit,
    STRICT_LIMITS.perIp.windowSeconds
  );

  if (!chatAllowed || !ipAllowed) {
    await sendMessage(
      chatId,
      "Rate limit hit. Please wait a moment and try again.",
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  if (text === link.code) {
    await supabaseAdmin
      .from("telegram_links")
      .update({
        chat_id: chatId,
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", link.user_id);

    await sendMessage(
      chatId,
      "✅ Connected! You can now chat with OpenClaw from Telegram.",
      botToken
    );

    return NextResponse.json({ ok: true });
  }

  if (!link.verified || link.chat_id !== chatId) {
    await sendMessage(
      chatId,
      "Please link your account first. Open the onboarding page and send the code shown there.",
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  const userAllowed = await checkRateLimit(
    supabaseAdmin,
    `user:${link.user_id}`,
    STRICT_LIMITS.perUser.limit,
    STRICT_LIMITS.perUser.windowSeconds
  );

  if (!userAllowed) {
    await sendMessage(
      chatId,
      "Rate limit hit for your account. Please wait a moment.",
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // Log the message in activity logs
  await supabaseAdmin.from("activity_logs").insert({
    user_id: link.user_id,
    message: `Telegram: ${text || "[non-text message]"}`,
  });

  // Optionally forward the message to the user's Cloudflare Worker
  try {
    const { data: deployment } = await supabaseAdmin
      .from("deployments")
      .select("config")
      .eq("user_id", link.user_id)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .maybeSingle();

    const workerName =
      (deployment?.config as { worker?: string } | null)?.worker ?? null;
    const workerSubdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN ?? "";

    if (workerName && workerSubdomain) {
      // Fetch gateway token secret for this user
      const { data: gatewaySecret } = await supabaseAdmin
        .from("secrets")
        .select("encrypted_value")
        .eq("user_id", link.user_id)
        .eq("type", "gateway_token")
        .maybeSingle();

      if (gatewaySecret?.encrypted_value) {
        const gatewayToken = decryptSecret(gatewaySecret.encrypted_value);
        const workerUrl = `https://${workerName}.${workerSubdomain}.workers.dev/api/telegram-hook?token=${encodeURIComponent(
          gatewayToken
        )}`;

        await fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: link.user_id,
            chatId,
            text,
          }),
        });
      }
    }
  } catch (error) {
    console.error("Failed to forward Telegram message to worker:", error);
  }

  // Immediate acknowledgement back to Telegram
  await sendMessage(chatId, "Got it! OpenClaw is working on this now.", botToken);
  return NextResponse.json({ ok: true });
}
