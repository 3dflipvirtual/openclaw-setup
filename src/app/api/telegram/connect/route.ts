import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { encryptSecret } from "@/lib/crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function generateCode() {
  return `OC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateWebhookSecret() {
  return randomBytes(24).toString("hex");
}

function getBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL must be set for Telegram webhook");
  }
  return url.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Bot token is required" },
      { status: 400 }
    );
  }

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = (await meRes.json()) as { ok?: boolean; result?: { username?: string } };

  if (!meRes.ok || !meData?.ok) {
    return NextResponse.json(
      { error: "Invalid token. Check the token from @BotFather and try again." },
      { status: 400 }
    );
  }

  const botUsername = meData.result?.username ?? null;
  const encryptedToken = encryptSecret(token);
  const code = generateCode();

  const { data: existing } = await supabase
    .from("telegram_links")
    .select("id, webhook_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  let webhookSecret = existing?.webhook_secret ?? null;
  if (!webhookSecret) {
    webhookSecret = generateWebhookSecret();
  }

  const baseUrl = getBaseUrl();
  const webhookUrl = `${baseUrl}/api/telegram/webhook?secret=${encodeURIComponent(webhookSecret)}`;

  const setWebhookRes = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
  );
  const setWebhookData = (await setWebhookRes.json()) as { ok?: boolean; description?: string };

  if (!setWebhookRes.ok || !setWebhookData?.ok) {
    return NextResponse.json(
      {
        error:
          setWebhookData?.description ?? "Failed to set webhook. Please try again.",
      },
      { status: 400 }
    );
  }

  const { error: upsertError } = await supabase.from("telegram_links").upsert(
    {
      user_id: user.id,
      bot_token_encrypted: encryptedToken,
      webhook_secret: webhookSecret,
      bot_username: botUsername,
      code,
      verified: false,
      chat_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    code,
    botUsername: botUsername ? `@${botUsername}` : null,
  });
}
