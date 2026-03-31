import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSubmissionReminder, checkMotivationDrop } from "@/lib/nudge/engine";
import { sendPendingNudges } from "@/lib/nudge/sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint for nudge engine.
 * Vercel Cron calls GET on schedule defined in vercel.json.
 * Schedule: "0 8,9 * * 1-5" (UTC) = 17:00, 18:00 JST on weekdays
 */
export async function GET(request: Request) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get current JST hour
    const now = new Date();
    const jstHour = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    ).getHours();

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id");

    if (tenantsError || !tenants) {
      return NextResponse.json(
        { error: "Failed to fetch tenants" },
        { status: 500 }
      );
    }

    const stats = {
      tenantsProcessed: 0,
      remindersCreated: 0,
      motivationDropsCreated: 0,
      nudgesSent: 0,
      jstHour,
    };

    for (const tenant of tenants) {
      // Submission reminders at 17:00 and 18:00 JST
      if (jstHour === 17 || jstHour === 18) {
        const reminderCount = await checkSubmissionReminder(
          tenant.id,
          jstHour
        );
        stats.remindersCreated += reminderCount;
      }

      // Motivation drop check runs at both hours
      const motivationCount = await checkMotivationDrop(tenant.id);
      stats.motivationDropsCreated += motivationCount;

      // Send all pending nudges for this tenant
      const sentCount = await sendPendingNudges(tenant.id);
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
