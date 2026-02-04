import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function checkRateLimit(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  key: string,
  limit: number,
  windowSeconds: number
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (!existing || new Date(existing.window_start) < windowStart) {
    await supabase.from("rate_limits").upsert({
      key,
      window_start: now.toISOString(),
      count: 1,
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);
  return true;
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const deployAllowed = await checkRateLimit(
    admin,
    `deploy:${user.id}`,
    5,
    60 * 60
  );

  if (!deployAllowed) {
    return NextResponse.json(
      {
        error:
          "Too many deploy attempts. Please wait about an hour before trying again.",
      },
      { status: 429 }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: refreshed } = await supabase.auth.refreshSession({
    refresh_token: session.refresh_token,
  });
  const accessToken = refreshed?.session?.access_token ?? session.access_token;

  const { data: profile } = await supabase
    .from("profiles")
    .select("paid")
    .eq("id", user.id)
    .single();

  if (!profile?.paid) {
    return NextResponse.json(
      { error: "Payment required" },
      { status: 402 }
    );
  }

  const deployResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deploy-openclaw`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!deployResponse.ok) {
    const payload = await deployResponse.json().catch(() => ({}));
    const message = payload?.error ?? "Deployment failed";
    const status = deployResponse.status;
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }

  const deployPayload = await deployResponse.json();

  await supabase.from("deployments").insert({
    user_id: user.id,
    status: "live",
    config: {
      worker: deployPayload?.worker ?? null,
    },
  });

  await supabase
    .from("agents")
    .update({ status: "live", last_ping: new Date().toISOString() })
    .eq("user_id", user.id);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    message: "Deployed OpenClaw agent (Cloudflare Moltworker queued).",
  });

  return NextResponse.json({
    status: "ok",
    message: "Deployment queued",
    worker: deployPayload?.worker ?? null,
  });
}
