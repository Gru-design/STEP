import { createAdminClient } from "@/lib/supabase/admin";
import { sendChatworkMessage, formatReportNotification } from "@/lib/integrations/chatwork";
import { getChatworkCredentials } from "@/lib/integrations/chatwork-credentials";

/**
 * 日報提出時にChatworkグループへ通知を送信する。
 * Server Action から fire-and-forget で呼び出される。
 */
export async function notifyReportSubmitted(params: {
  tenantId: string;
  userId: string;
  templateId: string;
  reportDate: string;
}): Promise<void> {
  const { tenantId, userId, templateId, reportDate } = params;

  const supabase = createAdminClient();

  // Chatwork連携が有効か確認
  const creds = await getChatworkCredentials(supabase, tenantId);
  if (!creds) return;

  // ユーザー名とテンプレート名を取得
  const [userResult, templateResult] = await Promise.all([
    supabase.from("users").select("name").eq("id", userId).single(),
    supabase.from("report_templates").select("name").eq("id", templateId).single(),
  ]);

  const userName = userResult.data?.name ?? "メンバー";
  const templateName = templateResult.data?.name ?? "日報";

  const message = formatReportNotification(userName, templateName, reportDate);

  await sendChatworkMessage(creds.apiToken, creds.roomId, message);
}
