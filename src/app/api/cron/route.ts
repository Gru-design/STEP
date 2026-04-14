import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSubmissionReminder, checkMotivationDrop } from "@/lib/nudge/engine";
import { sendPendingNudges } from "@/lib/nudge/sender";
import { snapshotAllGoals } from "@/lib/goals/progress";
import { generateDeviationAlerts } from "@/lib/goals/deviation";
import { generateWeeklyDigest } from "@/lib/digest/generator";
import { batchUpdateExecutionRates } from "@/lib/plans/execution-rate";
import { sendMorningReminder } from "@/lib/notifications/morning-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Unified cron endpoint for Vercel Free plan (1 cron / 1日1回制限対策).
 *
 * スケジュール: 毎日 00:00 UTC (= 09:00 JST)
 *
 * 実行内容 (JST時刻と曜日で分岐):
 * - 毎日(平日): 朝の未提出リマインダー (Chatwork通知)
 * - 毎日(平日): 前日未提出リマインダー(アプリ内ナッジ) + モチベーション低下チェック
 * - 毎日(平日): 目標スナップショット + 乖離アラート
 * - 月曜: 週刊STEP生成
 * - 金曜: 計画実行率計算
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

    // JST time info
    const now = new Date();
    const jst = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const jstHour = jst.getHours();
    const jstDay = jst.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const isWeekday = jstDay >= 1 && jstDay <= 5;

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

    const results: Record<string, number | string> = {
      jstHour,
      jstDay,
      tenantsProcessed: 0,
    };

    for (const tenant of tenants) {
      // ── 0. 朝の未提出リマインダー - Chatwork通知 (平日のみ) ──
      if (isWeekday) {
        try {
          const reminded = await sendMorningReminder(supabase, tenant.id, jst);
          results.morningReminders =
            ((results.morningReminders as number) || 0) + reminded;
        } catch (e) {
          console.error(`Morning reminder error tenant ${tenant.id}:`, e);
        }
      }

      // ── 1. 前日未提出リマインダー + モチベーション低下チェック (平日のみ) ──
      if (isWeekday) {
        try {
          const reminders = await checkSubmissionReminder(supabase, tenant.id);
          results.reminders = ((results.reminders as number) || 0) + reminders;

          const motiv = await checkMotivationDrop(supabase, tenant.id);
          results.motivationDrops =
            ((results.motivationDrops as number) || 0) + motiv;

          const sent = await sendPendingNudges(supabase, tenant.id);
          results.nudgesSent = ((results.nudgesSent as number) || 0) + sent;
        } catch (e) {
          console.error(`Nudge error tenant ${tenant.id}:`, e);
        }
      }

      // ── 2. 目標スナップショット + 乖離アラート (平日のみ) ──
      if (isWeekday) {
        try {
          const snapshots = await snapshotAllGoals(supabase, tenant.id);
          results.goalSnapshots =
            ((results.goalSnapshots as number) || 0) + snapshots;

          const alerts = await generateDeviationAlerts(supabase, tenant.id);
          results.deviationAlerts =
            ((results.deviationAlerts as number) || 0) + alerts;
        } catch (e) {
          console.error(`Goals error tenant ${tenant.id}:`, e);
        }
      }

      // ── 3. 週刊STEP生成 (月曜のみ) ──
      if (jstDay === 1) {
        try {
          const lastMonday = new Date(jst);
          lastMonday.setDate(lastMonday.getDate() - 7);
          const weekStart = lastMonday.toISOString().split("T")[0];

          await generateWeeklyDigest(supabase, tenant.id, weekStart);
          results.digestsGenerated =
            ((results.digestsGenerated as number) || 0) + 1;
        } catch (e) {
          console.error(`Digest error tenant ${tenant.id}:`, e);
        }
      }

      // ── 4. 計画実行率 (金曜のみ) ──
      if (jstDay === 5) {
        try {
          const monday = new Date(jst);
          monday.setDate(monday.getDate() - (jstDay - 1));
          const weekStart = monday.toISOString().split("T")[0];

          const batchResult = await batchUpdateExecutionRates(supabase, tenant.id, weekStart);
          results.plansUpdated =
            ((results.plansUpdated as number) || 0) + batchResult.updated;
        } catch (e) {
          console.error(`Execution rate error tenant ${tenant.id}:`, e);
        }
      }

      results.tenantsProcessed = (results.tenantsProcessed as number) + 1;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Unified cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
