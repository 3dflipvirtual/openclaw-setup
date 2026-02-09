import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Telegram webhook — handles bot linking verification only.
 *
 * This webhook is set during onboarding (connect flow) so the user can
 * send their linking code. Once the agent is deployed, OpenClaw takes over
 * the Telegram connection natively — this webhook is no longer used.
 */

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { username?: string; first_name?: string };
  };
};

async function sendMessage(chatId: number, text: string, botToken: string) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
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

  // Handle linking code verification
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
      "Connected! Your bot is linked. Go back to the dashboard and hit Deploy to start your agent.",
      botToken
    );

    return NextResponse.json({ ok: true });
  }

  // Not verified yet — prompt for code
  if (!link.verified || link.chat_id !== chatId) {
    await sendMessage(
      chatId,
      "Please send the linking code from your onboarding page to connect.",
      botToken
    );
    return NextResponse.json({ ok: true });
  }

  // Verified but not deployed — OpenClaw hasn't taken over yet
  await sendMessage(
    chatId,
    "Your bot is linked but not deployed yet. Go to your dashboard and hit Deploy to start your OpenClaw agent.",
    botToken
  );

  return NextResponse.json({ ok: true });
}
