import { NextRequest, NextResponse } from "next/server";

import { createOrConfigureAgent, isVpsConfigured } from "@/lib/openclaw-vps";
import { getSoulForPersonality } from "@/lib/personalities";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

async function rewritePersonalityWithMiniMax(currentSoul: string): Promise<string> {
  const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PLATFORM_MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.1",
      max_tokens: 1024,
      temperature: 0.7,
      system:
        "Rewrite the following SOUL.md personality file to be: " +
        "more opinionated, bold, witty, concise, human-like, confident, no corporate tone, strong takes, " +
        "sounds like a smart operator. Keep the same Markdown structure (# Soul, ## Core Truths, ## Boundaries, ## Vibe, ## Continuity). " +
        "Return ONLY the rewritten SOUL.md content. No preamble.",
      messages: [
        {
          role: "user",
          content: `Current SOUL.md:\n${currentSoul}`,
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text =
    data?.content?.find((c) => c.type === "text")?.text?.trim() ?? currentSoul;
  return text || currentSoul;
}

/**
 * Boost personality — rewrites SOUL.md to be more opinionated using MiniMax,
 * then redeploys the agent with the new soul.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isVpsConfigured()) {
    return NextResponse.json({ error: "VPS not configured" }, { status: 503 });
  }

  // Get current personality to rewrite
  const { data: profile } = await supabase
    .from("profiles")
    .select("personality")
    .eq("id", user.id)
    .single();

  const currentSoul = getSoulForPersonality(profile?.personality ?? "default");

  let rewritten: string;
  try {
    rewritten = await rewritePersonalityWithMiniMax(currentSoul);
  } catch (err) {
    console.error("[personality/boost] MiniMax rewrite failed", err);
    return NextResponse.json(
      { error: "Failed to rewrite personality" },
      { status: 500 }
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

  // Redeploy with boosted SOUL.md
  const result = await createOrConfigureAgent({
    userId: user.id,
    telegramBotToken,
    openaiApiKey: secretMap.openai_api_key,
    anthropicApiKey: secretMap.anthropic_api_key,
    minimaxApiKey: secretMap.minimax_api_key ?? process.env.PLATFORM_MINIMAX_API_KEY,
    minimaxBaseUrl: secretMap.minimax_base_url ?? process.env.MINIMAX_BASE_URL,
    soulMd: rewritten,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to update personality" },
      { status: 500 }
    );
  }

  // Mark as boosted custom personality
  await supabase
    .from("profiles")
    .update({ personality: "custom" })
    .eq("id", user.id);

  return NextResponse.json({ success: true, boosted: true });
}
