import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "approve"
  | "reject"
  | "submit"
  | "reopen";

interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Append-only audit log entry.
 * Uses admin client to bypass RLS and ensure logs are always written.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_logs").insert({
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      source: `${entry.action}:${entry.resource}`,
      raw_data: {
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        details: entry.details,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Audit log failure should never break the main operation
    console.error("[Audit] Failed to write log:", entry);
  }
}
