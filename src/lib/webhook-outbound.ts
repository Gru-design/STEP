import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export type WebhookEvent =
  | "report.submitted"
  | "deal.created"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "plan.submitted"
  | "plan.approved"
  | "plan.rejected"
  | "goal.deviation"
  | "user.invited"
  | "user.deactivated";

interface WebhookPayload {
  event: WebhookEvent;
  tenant_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Dispatch a webhook event to all active webhook endpoints for the tenant.
 * Signs the payload with HMAC-SHA256 for verification.
 *
 * Webhook endpoints are stored in integrations table with provider='webhook'.
 * credentials: { url: string, secret: string }
 */
export async function dispatchWebhook(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  const { data: webhooks } = await supabase
    .from("integrations")
    .select("id, credentials")
    .eq("tenant_id", tenantId)
    .eq("provider", "webhook" as string)
    .eq("status", "active");

  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    tenant_id: tenantId,
    data,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  for (const webhook of webhooks) {
    const creds = webhook.credentials as {
      url?: string;
      secret?: string;
    };
    if (!creds.url) continue;

    // HMAC signature for webhook verification
    const signature = creds.secret
      ? crypto
          .createHmac("sha256", creds.secret)
          .update(body)
          .digest("hex")
      : "";

    try {
      const response = await fetch(creds.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Step-Event": event,
          "X-Step-Signature": signature,
          "X-Step-Timestamp": payload.timestamp,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(
          `[Webhook] ${event} to ${creds.url} failed: ${response.status}`
        );
      }
    } catch {
      console.error(`[Webhook] ${event} to ${creds.url} failed: timeout or network error`);
    }
  }
}
