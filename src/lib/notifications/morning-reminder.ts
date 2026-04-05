import type { SupabaseClient } from "@supabase/supabase-js";
import { sendChatworkMessage, formatMorningReminder } from "@/lib/integrations/chatwork";
import { getChatworkCredentials } from "@/lib/integrations/chatwork-credentials";

/**
 * 前日の日報未提出者をChatworkグループに通知する。
 * 月曜は金曜分をチェック。土日はスキップ。
 *
 * @returns 通知した未提出者数
 */
export async function sendMorningReminder(
  supabase: SupabaseClient,
  tenantId: string,
  jstNow: Date
): Promise<number> {
  const jstDay = jstNow.getDay();

  // 対象日を算出（月曜→金曜、火〜金→前日）
  let targetDate: Date;
  if (jstDay === 1) {
    targetDate = new Date(jstNow);
    targetDate.setDate(targetDate.getDate() - 3);
  } else {
    targetDate = new Date(jstNow);
    targetDate.setDate(targetDate.getDate() - 1);
  }
  const targetDateStr = targetDate.toISOString().split("T")[0];

  // Chatwork連携が有効か確認
  const creds = await getChatworkCredentials(supabase, tenantId);
  if (!creds) return 0;

  // テナントのアクティブメンバー取得
  const { data: users } = await supabase
    .from("users")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .in("role", ["member", "manager"])
    .eq("is_active", true);

  if (!users || users.length === 0) return 0;

  // 対象日に提出済みのユーザーを取得
  const { data: submittedEntries } = await supabase
    .from("report_entries")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("report_date", targetDateStr)
    .eq("status", "submitted");

  const submittedUserIds = new Set(
    (submittedEntries ?? []).map((e: { user_id: string }) => e.user_id)
  );

  const nonSubmitters = users.filter(
    (u: { id: string; name: string }) => !submittedUserIds.has(u.id)
  );

  if (nonSubmitters.length === 0) return 0;

  const names = nonSubmitters.map((u: { id: string; name: string }) => u.name);
  const message = formatMorningReminder(names, targetDateStr);

  await sendChatworkMessage(creds.apiToken, creds.roomId, message);

  return nonSubmitters.length;
}
