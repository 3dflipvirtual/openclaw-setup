import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BOT_TOKEN = process.env.PLATFORM_TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

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

async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
  const token = url.searchParams.get("token");

  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as TelegramUpdate;
  const message = payload.message;

  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const supabase = createAdminSupabaseClient();

  const chatAllowed = await checkRateLimit(
    supabase,
    `chat:${chatId}`,
    STRICT_LIMITS.perChat.limit,
    STRICT_LIMITS.perChat.windowSeconds
  );
  const ipAllowed = await checkRateLimit(
    supabase,
    `ip:${ip}`,
    STRICT_LIMITS.perIp.limit,
    STRICT_LIMITS.perIp.windowSeconds
  );

  if (!chatAllowed || !ipAllowed) {
    await sendMessage(
      chatId,
      "Rate limit hit. Please wait a moment and try again."
    );
    return NextResponse.json({ ok: true });
  }

  const { data: linkByCode } = await supabase
    .from("telegram_links")
    .select("user_id, code, verified")
    .eq("code", text)
    .maybeSingle();

  if (linkByCode?.user_id) {
    await supabase
      .from("telegram_links")
      .update({
        chat_id: chatId,
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", linkByCode.user_id);

    await sendMessage(
      chatId,
      "✅ Connected! You can now chat with OpenClaw from Telegram."
    );

    return NextResponse.json({ ok: true });
  }

  const { data: linkByChat } = await supabase
    .from("telegram_links")
    .select("user_id, verified")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!linkByChat?.user_id || !linkByChat.verified) {
    await sendMessage(
      chatId,
      "Please link your account first. Open the onboarding page and send the code shown there."
    );
    return NextResponse.json({ ok: true });
  }

  const userAllowed = await checkRateLimit(
    supabase,
    `user:${linkByChat.user_id}`,
    STRICT_LIMITS.perUser.limit,
    STRICT_LIMITS.perUser.windowSeconds
  );

  if (!userAllowed) {
    await sendMessage(
      chatId,
      "Rate limit hit for your account. Please wait a moment."
    );
    return NextResponse.json({ ok: true });
  }

  await supabase.from("activity_logs").insert({
    user_id: linkByChat.user_id,
    message: `Telegram: ${text || "[non-text message]"}`,
  });

  await sendMessage(chatId, "Got it! OpenClaw is working on this now.");
  return NextResponse.json({ ok: true });
}
