import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_id?: string; custom_soul_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const agentId = body?.agent_id;
  const customSoulText = body?.custom_soul_text;

  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json(
      { error: "agent_id is required" },
      { status: 400 }
    );
  }

  if (customSoulText == null || typeof customSoulText !== "string") {
    return NextResponse.json(
      { error: "custom_soul_text is required and must be a string" },
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

  const soul = customSoulText;

  const { error: updateError } = await admin
    .from("agent_soul")
    .upsert(
      {
        user_id: user.id,
        agent_id: agentId,
        soul,
      },
      { onConflict: "user_id,agent_id" }
    );

  if (updateError) {
    console.error("[personality/set] Update failed", updateError);
    return NextResponse.json(
      { error: "Failed to save personality" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
