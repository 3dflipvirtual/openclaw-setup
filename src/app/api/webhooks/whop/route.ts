import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { whop } from "@/lib/whop";

// Whop plan IDs
const SUBSCRIPTION_PLAN_ID = "plan_45JMn0cnZdK2P";
const RECHARGE_PLAN_ID = "plan_sS1L8L8ME8ls4";
const RECHARGE_CREDITS = 1000; // Same as monthly base allocation

type WhopEvent = {
  type: string;
  data?: {
    plan_id?: string;
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
    const planId = webhookData.data?.plan_id;

    if (planId === RECHARGE_PLAN_ID) {
      // Token recharge — add credits to the user's balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profile?.id) {
        // Get existing budget
        const { data: budget } = await supabase
          .from("token_budgets")
          .select("recharge_credits")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (budget) {
          // Add recharge credits to existing balance
          await supabase
            .from("token_budgets")
            .update({
              recharge_credits: (budget.recharge_credits as number) + RECHARGE_CREDITS,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);
        } else {
          // Create budget with recharge credits
          await supabase.from("token_budgets").insert({
            user_id: profile.id,
            monthly_credits: 1000,
            used_credits: 0,
            recharge_credits: RECHARGE_CREDITS,
            period_start: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).toISOString(),
          });
        }

        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          message: "Recharged token credits (+$10).",
        });
      }
    } else if (planId === SUBSCRIPTION_PLAN_ID) {
      // Monthly subscription payment
      await supabase
        .from("profiles")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("email", email);
    }
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
