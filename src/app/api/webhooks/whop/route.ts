import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { whop } from "@/lib/whop";

type WhopEvent = {
  type: string;
  data?: {
    user?: {
      email?: string;
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: WhopEvent;
  try {
    webhookData = whop.webhooks.unwrap(rawBody, { headers }) as WhopEvent;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }

  const email = webhookData?.data?.user?.email;
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminSupabaseClient();

  if (webhookData.type === "payment.succeeded") {
    await supabase
      .from("profiles")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("email", email);
  }

  if (
    webhookData.type === "refund.created" ||
    webhookData.type === "refund.updated" ||
    webhookData.type === "payment.failed"
  ) {
    await supabase
      .from("profiles")
      .update({ paid: false })
      .eq("email", email);
  }

  return NextResponse.json({ ok: true });
}
