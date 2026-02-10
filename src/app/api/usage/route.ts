import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/usage — Returns the user's token usage as percentages for progress bars.
 *
 * Response:
 * {
 *   monthlyPercent: number,      // 0-100, % of monthly credits used
 *   rechargePercent: number,     // 0-100, % of recharge credits used (0 if none purchased)
 *   hasRecharge: boolean,        // whether user has recharge credits
 *   nearLimit: boolean,          // true if monthly >= 80% and no recharge left
 * }
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();

  // Get or create token budget for this user
  let { data: budget } = await admin
    .from("token_budgets")
    .select("monthly_credits, used_credits, recharge_credits, period_start")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!budget) {
    // Create default budget
    await admin.from("token_budgets").insert({
      user_id: user.id,
      monthly_credits: 1000,
      used_credits: 0,
      recharge_credits: 0,
      period_start: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString(),
    });
    budget = {
      monthly_credits: 1000,
      used_credits: 0,
      recharge_credits: 0,
      period_start: new Date().toISOString(),
    };
  }

  // Check if we need to reset for a new month
  const periodStart = new Date(budget.period_start);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (periodStart < currentMonthStart) {
    // New month — reset used credits, keep recharge balance
    await admin
      .from("token_budgets")
      .update({
        used_credits: 0,
        period_start: currentMonthStart.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", user.id);
    budget.used_credits = 0;
  }

  const monthlyCredits = budget.monthly_credits as number;
  const usedCredits = budget.used_credits as number;
  const rechargeCredits = budget.recharge_credits as number;

  // Calculate percentages
  // Monthly: used out of monthly allocation
  const monthlyPercent = monthlyCredits > 0
    ? Math.min(100, Math.round((usedCredits / monthlyCredits) * 100))
    : 0;

  // If user exceeded monthly, the excess eats into recharge credits
  const monthlyOverflow = Math.max(0, usedCredits - monthlyCredits);
  const rechargeUsed = rechargeCredits > 0 ? monthlyOverflow : 0;
  const rechargePercent = rechargeCredits > 0
    ? Math.min(100, Math.round((rechargeUsed / rechargeCredits) * 100))
    : 0;

  const hasRecharge = rechargeCredits > 0;
  const totalAvailable = monthlyCredits + rechargeCredits;
  const nearLimit = usedCredits >= totalAvailable * 0.8;

  return NextResponse.json({
    monthlyPercent,
    rechargePercent,
    hasRecharge,
    nearLimit,
  });
}
