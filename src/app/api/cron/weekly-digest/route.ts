import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyDigest } from "@/lib/digest/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint for weekly digest generation.
 * Schedule: "0 0 * * 1" (UTC) = Monday 09:00 JST
 * Generates the "週刊STEP" digest for the previous week.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id");

    if (tenantsError || !tenants) {
      return NextResponse.json(
        { error: "テナントの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Calculate previous week's Monday
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() - daysBack);
    const lastMonday = new Date(thisMonday);
    lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
    const weekStart = lastMonday.toISOString().split("T")[0];

    const stats = {
      tenantsProcessed: 0,
      digestsGenerated: 0,
      errors: 0,
      weekStart,
    };

    for (const tenant of tenants) {
      try {
        await generateWeeklyDigest(supabase, tenant.id, weekStart);
        stats.digestsGenerated++;
      } catch (error) {
        console.error(
          `Weekly digest error for tenant ${tenant.id}:`,
          error
        );
        stats.errors++;
      }
      stats.tenantsProcessed++;
    }

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("Cron weekly-digest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
