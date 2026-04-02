import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeUrl } from "@/lib/url-validation";
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

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // 1s, 3s

/**
 * Dispatch a webhook event to all active webhook endpoints for the tenant.
 * Signs the payload with HMAC-SHA256 for verification.
 * Retries up to 2 times with exponential backoff on failure.
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
    if (!creds.url || !isSafeUrl(creds.url)) continue;

    // HMAC signature for webhook verification
    const signature = creds.secret
      ? crypto
          .createHmac("sha256", creds.secret)
          .update(body)
          .digest("hex")
      : "";

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
        }

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

        if (response.ok) {
          lastError = null;
          break;
        }

        lastError = `HTTP ${response.status}`;
      } catch {
        lastError = "timeout or network error";
      }
    }

    if (lastError) {
      console.error(
        `[Webhook] ${event} to ${creds.url} failed after ${MAX_RETRIES + 1} attempts: ${lastError}`
      );
    }
  }
}
