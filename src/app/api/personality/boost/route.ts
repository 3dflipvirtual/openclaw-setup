import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
      max_tokens: 512,
      temperature: 0.7,
      system:
        "Rewrite the following AI personality to be: " +
        "more opinionated, bold, witty, concise, human-like, confident, no corporate tone, strong takes, " +
        "sounds like a smart operator. " +
        "Return ONLY the rewritten personality text. No preamble.",
      messages: [
        {
          role: "user",
          content: `Current personality:\n${currentSoul}`,
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

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const agentId = body?.agent_id;
  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json(
      { error: "agent_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("bot_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!link?.bot_token_encrypted) {
    return NextResponse.json(
      { error: "No Telegram agent linked for this user" },
      { status: 403 }
    );
  }

  let resolvedAgentId: string;
  try {
    resolvedAgentId = decryptSecret(link.bot_token_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Could not resolve agent" },
      { status: 403 }
    );
  }

  if (resolvedAgentId !== agentId) {
    return NextResponse.json(
      { error: "Agent does not belong to this user" },
      { status: 403 }
    );
  }

  const { data: soulRow } = await admin
    .from("agent_soul")
    .select("soul")
    .eq("user_id", user.id)
    .eq("agent_id", agentId)
    .maybeSingle();

  const currentSoul =
    (soulRow?.soul as string) ||
    "You are an autonomous AI operator. Be direct, concise, and helpful.";

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

  const { error: updateError } = await admin
    .from("agent_soul")
    .upsert(
      {
        user_id: user.id,
        agent_id: agentId,
        soul: rewritten,
      },
      { onConflict: "user_id,agent_id" }
    );

  if (updateError) {
    console.error("[personality/boost] Update failed", updateError);
    return NextResponse.json(
      { error: "Failed to save personality" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
