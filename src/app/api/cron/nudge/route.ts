import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMotivationDrop } from "@/lib/nudge/engine";
import { sendPendingNudges } from "@/lib/nudge/sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint for nudge engine (legacy / supplemental).
 * モチベーション低下チェック + 未送信ナッジ送信のみ。
 * 提出リマインダーは朝9時の統合cronに移行済み。
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
        { error: "Failed to fetch tenants" },
        { status: 500 }
      );
    }

    const stats = {
      tenantsProcessed: 0,
      motivationDropsCreated: 0,
      nudgesSent: 0,
    };

    for (const tenant of tenants) {
      const motivationCount = await checkMotivationDrop(supabase, tenant.id);
      stats.motivationDropsCreated += motivationCount;

      const sentCount = await sendPendingNudges(supabase, tenant.id);
      stats.nudgesSent += sentCount;

      stats.tenantsProcessed++;
    }

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error("Cron nudge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
