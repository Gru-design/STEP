import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSubmissionReminder,
  checkMotivationDrop,
} from "@/lib/nudge/engine";
import { sendPendingNudges } from "@/lib/nudge/sender";

export const dynamic = "force-dynamic";

/**
 * On-demand nudge trigger.
 * ダッシュボードアクセス時に呼び出され、ナッジ処理を実行する。
 * Vercel Free プランでの cron 制限を補完する目的。
 *
 * - 平日17:00-19:00 JST のみ実行
 * - テナントごとに1時間に1回のみ実行（重複防止）
 */
export async function POST() {
  try {
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: dbUser } = await userSupabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check JST time - only run during nudge window (17:00-19:00 JST weekdays)
    const now = new Date();
    const jst = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const jstHour = jst.getHours();
    const jstDay = jst.getDay();
    const isWeekday = jstDay >= 1 && jstDay <= 5;
    const isNudgeWindow = jstHour >= 17 && jstHour <= 19;

    if (!isWeekday || !isNudgeWindow) {
      return NextResponse.json({ skipped: true, reason: "outside_window" });
    }

    // Throttle: check if nudges were already created this hour for this tenant
    const admin = createAdminClient();
    const hourStart = new Date(jst);
    hourStart.setMinutes(0, 0, 0);

    const { count } = await admin
      .from("nudges")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", dbUser.tenant_id)
      .gte("created_at", hourStart.toISOString());

    if (count && count > 0) {
      return NextResponse.json({ skipped: true, reason: "already_processed" });
    }

    // Run nudge checks
    const reminders = await checkSubmissionReminder(
      dbUser.tenant_id,
      jstHour
    );
    const motivation = await checkMotivationDrop(dbUser.tenant_id);
    const sent = await sendPendingNudges(dbUser.tenant_id);

    return NextResponse.json({
      success: true,
      reminders,
      motivation,
      sent,
    });
  } catch (error) {
    console.error("Trigger nudge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
