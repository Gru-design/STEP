import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeUrl } from "@/lib/url-validation";

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

  // Dispatch to Slack if user has slack_id
  try {
    const { data: user } = await supabase
      .from("users")
      .select("slack_id")
      .eq("id", nudge.target_user_id)
      .single();

    if (user?.slack_id) {
      // Check if tenant has Slack integration
      const { data: integration } = await supabase
        .from("integrations")
        .select("credentials")
        .eq("tenant_id", nudge.tenant_id)
        .eq("provider", "slack")
        .eq("status", "active")
        .single();

      if (integration?.credentials) {
        const webhookUrl = (integration.credentials as { webhook_url?: string })
          .webhook_url;
        if (webhookUrl && isSafeUrl(webhookUrl)) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: user.slack_id,
              text: nudge.content,
            }),
          }).catch(() => {
            // Non-critical: log but don't fail
          });
        }
      }
    }
  } catch {
    // Non-critical: Slack dispatch failure shouldn't block nudge
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
