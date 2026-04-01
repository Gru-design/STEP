import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeUrl } from "@/lib/url-validation";
import { sendChatworkMessage, formatNudgeNotification as formatChatworkNudge } from "@/lib/integrations/chatwork";

interface Nudge {
  id: string;
  tenant_id: string;
  target_user_id: string;
  trigger_type: string;
  content: string;
  status: string;
}

/**
 * Send a nudge via Supabase Realtime broadcast + update status.
 * Optionally dispatches to Slack if the user has slack_id configured.
 */
export async function sendNudge(nudge: Nudge): Promise<boolean> {
  const supabase = createAdminClient();

  // Mark as sent
  const { error } = await supabase
    .from("nudges")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", nudge.id);

  if (error) {
    console.error(`Failed to mark nudge ${nudge.id} as sent:`, error);
    return false;
  }

  // Broadcast via Supabase Realtime
  const channel = supabase.channel(`nudge:${nudge.target_user_id}`);
  await channel.send({
    type: "broadcast",
    event: "nudge",
    payload: {
      id: nudge.id,
      type: nudge.trigger_type,
      message: nudge.content,
      created_at: new Date().toISOString(),
    },
  });
  supabase.removeChannel(channel);

  // Dispatch to external chat services
  try {
    // Get all active integrations for this tenant
    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, credentials")
      .eq("tenant_id", nudge.tenant_id)
      .eq("status", "active");

    for (const integration of integrations ?? []) {
      const creds = integration.credentials as Record<string, string>;

      if (integration.provider === "slack" && creds?.webhook_url) {
        // Slack: send via webhook
        const { data: user } = await supabase
          .from("users")
          .select("slack_id")
          .eq("id", nudge.target_user_id)
          .single();

        if (user?.slack_id && isSafeUrl(creds.webhook_url)) {
          await fetch(creds.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: user.slack_id,
              text: nudge.content,
            }),
          }).catch(() => {});
        }
      }

      if (integration.provider === "chatwork" && creds?.api_token && creds?.room_id) {
        // Chatwork: send via API
        await sendChatworkMessage(
          creds.api_token,
          creds.room_id,
          formatChatworkNudge(nudge.content)
        ).catch(() => {});
      }
    }
  } catch {
    // Non-critical: external dispatch failure shouldn't block nudge
  }

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
