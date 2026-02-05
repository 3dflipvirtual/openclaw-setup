import { NextResponse } from "next/server";

import { isVpsConfigured } from "@/lib/openclaw-vps";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/telegram/forward-status
 * Returns whether Telegram messages will be forwarded to the OpenClaw VPS.
 * Requires auth.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vpsConfigured = isVpsConfigured();

  const admin = createAdminSupabaseClient();
  const { data: deployment } = await admin
    .from("deployments")
    .select("config, created_at")
    .eq("user_id", user.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .maybeSingle();

  const canForward = vpsConfigured && Boolean(deployment);

  return NextResponse.json({
    ok: true,
    vpsConfigured,
    hasDeployment: Boolean(deployment),
    canForward,
    hint: !vpsConfigured
      ? "Set OPENCLAW_VPS_URL and OPENCLAW_VPS_API_KEY in Vercel, then redeploy."
      : !deployment
        ? "Deploy your agent from the app (Onboarding → Deploy) so messages are forwarded to the server."
        : "Forward is active. Send a Telegram message and check Vercel logs for [telegram-webhook].",
  });
}
