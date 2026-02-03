import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("telegram_links")
    .select("verified, chat_id, code")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    verified: Boolean(data?.verified),
    chatId: data?.chat_id ?? null,
    code: data?.code ?? null,
  });
}
