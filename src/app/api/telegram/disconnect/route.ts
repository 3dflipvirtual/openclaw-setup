import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("bot_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (link?.bot_token_encrypted) {
    try {
      const botToken = decryptSecret(link.bot_token_encrypted);
      await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=`
      );
    } catch {
      // Continue to clear link even if setWebhook fails (e.g. token revoked)
    }
  }

  const { error } = await admin
    .from("telegram_links")
    .update({
      bot_token_encrypted: null,
      webhook_secret: null,
      bot_username: null,
      code: null,
      chat_id: null,
      verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
