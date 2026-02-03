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
    .select("code, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.code && !existing.verified) {
    return NextResponse.json({ code: existing.code });
  }

  if (existing?.code && existing.verified) {
    return NextResponse.json({ code: existing.code, verified: true });
  }

  const code = generateCode();
  const { error } = await supabase.from("telegram_links").upsert(
    {
      user_id: user.id,
      code,
      verified: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ code });
}
