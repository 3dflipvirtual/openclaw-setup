import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Telegram webhook handler — ONLY used for pre-deploy bot linking.
 *
 * Once deployed, OpenClaw handles Telegram natively via its built-in
 * grammY channel. This route is only needed during onboarding so the
 * user can send their linking code to verify the bot connection.
 *
 * After deploy, the Telegram webhook is NOT pointed here — OpenClaw
 * owns the Telegram connection directly.
 */

export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("user_id, bot_token_encrypted, code, verified, chat_id")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!link?.bot_token_encrypted) {
    return NextResponse.json({ ok: true });
  }

  let botToken: string;
  try {
    botToken = decryptSecret(link.bot_token_encrypted);
  } catch {
    console.error("[telegram-hook] decrypt failed", { userId: link.user_id });
    return NextResponse.json({ ok: true });
  }

  const update = (await req.json()) as {
    message?: { chat: { id: number }; text?: string };
  };

  if (!update.message) return NextResponse.json({ ok: true });

  const chatId = update.message.chat.id;
  const text = (update.message.text || "").trim();

  // Handle linking code verification
  if (text === link.code) {
    await admin
      .from("telegram_links")
      .update({
        chat_id: chatId,
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", link.user_id);

    await sendTelegram(
      chatId,
      "Connected! Your bot is linked. Go back to the dashboard and hit Deploy to start your agent.",
      botToken
    );

    return NextResponse.json({ ok: true });
  }

  // If not verified yet, prompt for code
  if (!link.verified || link.chat_id !== chatId) {
    await sendTelegram(
      chatId,
      "Please send the linking code from your onboarding page to connect.",
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // If verified but not yet deployed, let them know
  await sendTelegram(
    chatId,
    "Your bot is linked but not deployed yet. Go to your dashboard and hit Deploy to start your OpenClaw agent.",
    botToken
  );

  return NextResponse.json({ ok: true });
}

async function sendTelegram(chatId: number, text: string, botToken: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[telegram-hook] sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
  }
}
