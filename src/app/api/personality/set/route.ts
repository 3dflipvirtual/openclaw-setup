import { NextRequest, NextResponse } from "next/server";

import { createOrConfigureAgent, isVpsConfigured } from "@/lib/openclaw-vps";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

/**
 * Set custom soul text for a deployed agent.
 * Sends the new SOUL.md content to the VPS and restarts the daemon.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { custom_soul_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customSoulText = body?.custom_soul_text;
  if (customSoulText == null || typeof customSoulText !== "string") {
    return NextResponse.json(
      { error: "custom_soul_text is required and must be a string" },
      { status: 400 }
    );
  }

  if (!isVpsConfigured()) {
    return NextResponse.json(
      { error: "VPS not configured" },
      { status: 503 }
    );
  }

  // Get bot token and API keys to rebuild config
  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("bot_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  let telegramBotToken: string | undefined;
  if (link?.bot_token_encrypted) {
    try {
      telegramBotToken = decryptSecret(link.bot_token_encrypted);
    } catch {
      // continue
    }
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
        // skip
      }
    }
  }

  // Redeploy with new SOUL.md
  const result = await createOrConfigureAgent({
    userId: user.id,
    telegramBotToken,
    openaiApiKey: secretMap.openai_api_key,
    anthropicApiKey: secretMap.anthropic_api_key,
    minimaxApiKey: secretMap.minimax_api_key ?? process.env.PLATFORM_MINIMAX_API_KEY,
    minimaxBaseUrl: secretMap.minimax_base_url ?? process.env.MINIMAX_BASE_URL,
    soulMd: customSoulText,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to update personality" },
      { status: 500 }
    );
  }

  // Update the personality key to "custom" in profiles
  await supabase
    .from("profiles")
    .update({ personality: "custom" })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
