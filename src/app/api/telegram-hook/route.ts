import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

async function sendTelegram(chatId: number, text: string, botToken: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("bot_token_encrypted")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!link?.bot_token_encrypted) {
    return NextResponse.json({ ok: true });
  }

  let botToken: string;
  try {
    botToken = decryptSecret(link.bot_token_encrypted);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const update = (await req.json()) as {
    message?: { chat: { id: number }; text?: string };
  };

  if (!update.message) return NextResponse.json({ ok: true });

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  console.log("📩 Message:", text);

  const reply = await askAI(text);

  console.log("🤖 Reply:", reply);

  await sendTelegram(chatId, reply, botToken);

  return NextResponse.json({ ok: true });
}
