import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type SaveType = "claude_key" | "telegram_token" | "integrations" | "telegram_link";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, value, metadata } = body as {
    type: SaveType;
    value?: string;
    metadata?: Record<string, unknown>;
  };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  if (type === "claude_key") {
    await supabase
      .from("profiles")
      .update({ onboarding_step: 1 })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  }

  if (type === "telegram_token") {
    await supabase
      .from("profiles")
      .update({ onboarding_step: 2 })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  }

  if (type === "telegram_link") {
    const { data: link } = await supabase
      .from("telegram_links")
      .select("verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!link?.verified) {
      return NextResponse.json(
        { error: "Telegram not linked yet" },
        { status: 400 }
      );
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (agent?.id) {
      await supabase
        .from("agents")
        .update({
          telegram_bot: "shared",
          status: "configured",
        })
        .eq("id", agent.id);
    } else {
      await supabase.from("agents").insert({
        user_id: user.id,
        telegram_bot: "shared",
        status: "configured",
      });
    }

    await supabase
      .from("profiles")
      .update({ onboarding_step: 2 })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  }

  if (type === "integrations") {
    const integrations = (metadata?.integrations ?? {}) as Record<
      string,
      boolean
    >;

    const entries = Object.entries(integrations);
    if (entries.length === 0) {
      return NextResponse.json({ ok: true });
    }

    await Promise.all(
      entries.map(async ([provider, enabled]) => {
        const { data: existing } = await supabase
          .from("integrations")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .maybeSingle();

        if (existing?.id) {
          return supabase
            .from("integrations")
            .update({ enabled })
            .eq("id", existing.id);
        }

        return supabase.from("integrations").insert({
          user_id: user.id,
          provider,
          enabled,
        });
      })
    );

    await supabase
      .from("profiles")
      .update({ onboarding_step: 3 })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
}
