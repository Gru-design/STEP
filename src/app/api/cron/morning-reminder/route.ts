import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendChatworkMessage, formatMorningReminder } from "@/lib/integrations/chatwork";
import { getChatworkCredentials } from "@/lib/integrations/chatwork-credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 朝9時リマインダー: 前日の日報未提出者をChatworkグループに通知
 *
 * スケジュール: 毎日 00:00 UTC (= 09:00 JST)
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

    // JST で昨日の日付を取得
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const jstDay = now.getDay();
    const isWeekday = jstDay >= 1 && jstDay <= 5;

    // 土日はスキップ（月曜の場合は金曜分をチェック）
    let targetDate: Date;
    if (jstDay === 1) {
      // 月曜 → 金曜をチェック
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 3);
    } else if (isWeekday) {
      // 火〜金 → 前日をチェック
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      // 土日 → スキップ
      return NextResponse.json({ success: true, skipped: true, reason: "weekend" });
    }

    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id")
      .limit(1000);

    if (tenantsError || !tenants) {
      return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
    }

    let totalNotified = 0;

    for (const tenant of tenants) {
      // Chatwork連携が有効か確認
      const creds = await getChatworkCredentials(supabase, tenant.id);
      if (!creds) continue;

      // テナントのアクティブメンバー取得
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .eq("tenant_id", tenant.id)
        .in("role", ["member", "manager"])
        .eq("is_active", true);

      if (!users || users.length === 0) continue;

      // 対象日に提出済みのユーザーを取得
      const { data: submittedEntries } = await supabase
        .from("report_entries")
        .select("user_id")
        .eq("tenant_id", tenant.id)
        .eq("report_date", targetDateStr)
        .eq("status", "submitted");

      const submittedUserIds = new Set(
        (submittedEntries ?? []).map((e: { user_id: string }) => e.user_id)
      );

      // 未提出者をフィルタ
      const nonSubmitters = users.filter(
        (u: { id: string; name: string }) => !submittedUserIds.has(u.id)
      );

      if (nonSubmitters.length === 0) continue;

      // Chatworkグループに通知
      const names = nonSubmitters.map((u: { id: string; name: string }) => u.name);
      const message = formatMorningReminder(names, targetDateStr);

      await sendChatworkMessage(creds.apiToken, creds.roomId, message).catch(
        (err) => console.error(`Chatwork morning reminder failed for tenant ${tenant.id}:`, err)
      );

      totalNotified += nonSubmitters.length;
    }

    return NextResponse.json({
      success: true,
      targetDate: targetDateStr,
      totalNotified,
    });
  } catch (error) {
    console.error("Morning reminder cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
