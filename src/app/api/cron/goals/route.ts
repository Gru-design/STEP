import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { snapshotAllGoals } from "@/lib/goals/progress";
import { generateDeviationAlerts } from "@/lib/goals/deviation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint for goal snapshots and deviation alerts.
 * Schedule: "0 15 * * 1-5" (UTC) = midnight JST on weekdays
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

    const stats = {
      tenantsProcessed: 0,
      snapshotsCreated: 0,
      deviationAlerts: 0,
    };

    for (const tenant of tenants) {
      const snapshots = await snapshotAllGoals(supabase, tenant.id);
      stats.snapshotsCreated += snapshots;

      const alerts = await generateDeviationAlerts(supabase, tenant.id);
      stats.deviationAlerts += alerts;

      stats.tenantsProcessed++;
    }

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("Cron goals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
