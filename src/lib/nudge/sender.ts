import type { SupabaseClient } from "@supabase/supabase-js";
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

interface IntegrationInfo {
  provider: string;
  credentials: Record<string, string>;
}

/**
 * Send all pending nudges for a tenant.
 *
 * Optimized: single supabase client, batch-fetches integrations and user
 * slack_ids before the loop, batch-updates nudge statuses.
 */
export async function sendPendingNudges(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data: pendingNudges, error } = await supabase
    .from("nudges")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .limit(500);

  if (error || !pendingNudges || pendingNudges.length === 0) return 0;

  // Pre-fetch integrations for this tenant (once, not per nudge)
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, credentials")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const activeIntegrations: IntegrationInfo[] = (integrations ?? []).map(
    (i) => ({
      provider: i.provider,
      credentials: i.credentials as Record<string, string>,
    })
  );

  // Pre-fetch slack_ids for all target users (once, not per nudge)
  const targetUserIds = [...new Set(pendingNudges.map((n: Nudge) => n.target_user_id))];
  const { data: usersData } = await supabase
    .from("users")
    .select("id, slack_id")
    .in("id", targetUserIds);

  const userSlackMap = new Map(
    (usersData ?? []).map((u: { id: string; slack_id: string | null }) => [u.id, u.slack_id])
  );

  const sentNudgeIds: string[] = [];
  const now = new Date().toISOString();

  for (const nudge of pendingNudges as Nudge[]) {
    // Broadcast via Supabase Realtime
    const channel = supabase.channel(`nudge:${nudge.target_user_id}`);
    await channel.send({
      type: "broadcast",
      event: "nudge",
      payload: {
        id: nudge.id,
        type: nudge.trigger_type,
        message: nudge.content,
        created_at: now,
      },
    });
    supabase.removeChannel(channel);

    // Dispatch to external chat services using pre-fetched data
    try {
      for (const integration of activeIntegrations) {
        const creds = integration.credentials;

        if (integration.provider === "slack" && creds?.webhook_url) {
          const slackId = userSlackMap.get(nudge.target_user_id);
          if (slackId && isSafeUrl(creds.webhook_url)) {
            await fetch(creds.webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: slackId,
                text: nudge.content,
              }),
            }).catch(() => {});
          }
        }

        if (integration.provider === "chatwork" && creds?.api_token && creds?.room_id) {
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

    sentNudgeIds.push(nudge.id);
  }

  if (sentNudgeIds.length === 0) return 0;

  // Batch update all sent nudges in one query
  const { error: updateError } = await supabase
    .from("nudges")
    .update({ status: "sent", sent_at: now })
    .in("id", sentNudgeIds);

  if (updateError) {
    console.error("Failed to batch-update nudge statuses:", updateError);
  }

  return sentNudgeIds.length;
}
