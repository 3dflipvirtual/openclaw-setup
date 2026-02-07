import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const RATE_LIMIT = { perChat: { limit: 10, windowSeconds: 60 }, perUser: { limit: 30, windowSeconds: 60 } };

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
  if (existing.count >= limit) return false;
  await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("key", key);
  return true;
}

async function askAI(message: string) {
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 200,
      temperature: 0.7,
      system: "You are a helpful AI assistant.",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  console.log("MINIMAX RAW:", JSON.stringify(data));

  return (
    data?.content?.find((c) => c.type === "text")?.text ||
    "MiniMax returned nothing."
  );
}

async function sendTelegram(chatId: number, text: string, botToken: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
  }
}

export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("user_id, bot_token_encrypted")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!link?.bot_token_encrypted) {
    return NextResponse.json({ ok: true });
  }

  let botToken: string;
  try {
    botToken = decryptSecret(link.bot_token_encrypted);
  } catch (err) {
    console.error("[telegram-hook] decrypt failed", { userId: link.user_id });
    return NextResponse.json({ ok: true });
  }

  const update = (await req.json()) as {
    message?: { chat: { id: number }; text?: string };
  };

  if (!update.message) return NextResponse.json({ ok: true });

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  const chatKey = `telegram-hook:chat:${chatId}`;
  const userKey = `telegram-hook:user:${link.user_id}`;
  const chatOk = await checkRateLimit(admin, chatKey, RATE_LIMIT.perChat.limit, RATE_LIMIT.perChat.windowSeconds);
  const userOk = await checkRateLimit(admin, userKey, RATE_LIMIT.perUser.limit, RATE_LIMIT.perUser.windowSeconds);
  if (!chatOk || !userOk) {
    try {
      await sendTelegram(chatId, "Rate limit. Please wait a moment.", botToken);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  console.log("[telegram-hook] message", { chatId, userId: link.user_id, text: text.slice(0, 80) });

  let reply: string;
  try {
    reply = await askAI(text);
  } catch (err) {
    console.error("[telegram-hook] askAI failed", { chatId, userId: link.user_id, error: String(err) });
    try {
      await sendTelegram(chatId, "Sorry, the AI failed. Try again in a moment.", botToken);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  try {
    await sendTelegram(chatId, reply, botToken);
  } catch (err) {
    console.error("[telegram-hook] sendTelegram failed", { chatId, userId: link.user_id, error: String(err) });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
