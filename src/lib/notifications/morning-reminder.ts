import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 朝リマインダー（Chatwork通知）
 * 現在は日報提出通知のみに絞っているため無効化。
 */
export async function sendMorningReminder(
  _supabase: SupabaseClient,
  _tenantId: string,
  _jstNow: Date
): Promise<number> {
  return 0;
}
