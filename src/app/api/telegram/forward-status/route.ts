import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/telegram/forward-status
 * Returns why Telegram messages may or may not be forwarded to your worker.
 * Requires auth. Use this to debug "zero requests" on the worker.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workerSubdomain = (process.env.CLOUDFLARE_WORKERS_SUBDOMAIN ?? "").trim();
  if (workerSubdomain.endsWith(".workers.dev")) {
    workerSubdomain = workerSubdomain.replace(/\.workers\.dev$/i, "");
  }

  const admin = createAdminSupabaseClient();
  const { data: deployment } = await admin
    .from("deployments")
    .select("config, created_at")
    .eq("user_id", user.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .maybeSingle();

  const workerName = (deployment?.config as { worker?: string } | null)?.worker ?? null;

  const { data: gatewayRow } = await admin
    .from("secrets")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "gateway_token")
    .maybeSingle();

  const canForward =
    Boolean(workerSubdomain) && Boolean(workerName) && Boolean(gatewayRow);

  return NextResponse.json({
    ok: true,
    subdomainSet: Boolean(workerSubdomain),
    subdomainPreview: workerSubdomain ? `${workerSubdomain}.workers.dev` : null,
    hasDeployment: Boolean(deployment),
    workerName,
    hasGatewayToken: Boolean(gatewayRow),
    canForward,
    workerUrlPreview:
      workerName && workerSubdomain
        ? `https://${workerName}.${workerSubdomain}.workers.dev/api/telegram-hook?token=...`
        : null,
    hint: !workerSubdomain
      ? "Set CLOUDFLARE_WORKERS_SUBDOMAIN in Vercel (e.g. openclaw-setup), then redeploy."
      : !workerName
        ? "Deploy your worker from the app (Dashboard → Deploy) so a deployment is recorded."
        : !gatewayRow
          ? "Gateway token is set during deploy; redeploy once to fix."
          : "Forward should be active. Send a Telegram message and check Vercel logs for [telegram-webhook].",
  });
}
