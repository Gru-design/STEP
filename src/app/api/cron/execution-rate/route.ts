import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchUpdateExecutionRates } from "@/lib/plans/execution-rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint for execution rate calculation.
 * Schedule: "0 10 * * 5" (UTC) = Friday 19:00 JST
 * Updates execution_rate on all submitted/approved weekly plans for the current week.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = Buffer.from(cronSecret, "utf-8");
  const received = Buffer.from(authHeader.replace("Bearer ", ""), "utf-8");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id")
      .limit(1000);

    if (tenantsError || !tenants) {
      return NextResponse.json(
        { error: "テナントの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Calculate current week's Monday
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysBack);
    const weekStart = monday.toISOString().split("T")[0];

    const stats = {
      tenantsProcessed: 0,
      plansUpdated: 0,
      errors: 0,
      weekStart,
    };

    for (const tenant of tenants) {
      const result = await batchUpdateExecutionRates(supabase, tenant.id, weekStart);
      stats.plansUpdated += result.updated;
      stats.errors += result.errors;
      stats.tenantsProcessed++;
    }

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("Cron execution-rate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
