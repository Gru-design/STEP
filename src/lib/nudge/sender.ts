import { createAdminClient } from "@/lib/supabase/admin";

interface Nudge {
  id: string;
  tenant_id: string;
  target_user_id: string;
  trigger_type: string;
  content: string;
  status: string;
}

/**
 * Mark a nudge as 'sent'.
 * In production, this would also send via Realtime/email/push notification.
 * For now, it just updates the status.
 */
export async function sendNudge(nudge: Nudge): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("nudges")
    .update({ status: "sent" })
    .eq("id", nudge.id);

  if (error) {
    console.error(`Failed to mark nudge ${nudge.id} as sent:`, error);
    return false;
  }

  // TODO: In production, dispatch to appropriate channel:
  // - Supabase Realtime for in-app notifications
  // - Email via transactional email service
  // - Slack webhook if slack_id is configured

  return true;
}

/**
 * Send all pending nudges for a tenant.
 */
export async function sendPendingNudges(tenantId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: pendingNudges, error } = await supabase
    .from("nudges")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (error || !pendingNudges) return 0;

  let sentCount = 0;
  for (const nudge of pendingNudges) {
    const sent = await sendNudge(nudge as Nudge);
    if (sent) sentCount++;
  }

  return sentCount;
}
