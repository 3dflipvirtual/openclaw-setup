import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function generateCode() {
  return `OC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("telegram_links")
    .select("code, verified, webhook_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing?.webhook_secret) {
    return NextResponse.json(
      { error: "Connect your Telegram bot first (add your bot token)." },
      { status: 400 }
    );
  }

  if (existing?.verified) {
    return NextResponse.json({ code: existing.code, verified: true });
  }

  // Always generate a fresh code when requested
  const code = generateCode();
  const { error } = await supabase
    .from("telegram_links")
    .update({
      code,
      verified: false,
      chat_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ code });
}
