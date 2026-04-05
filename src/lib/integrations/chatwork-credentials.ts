import type { SupabaseClient } from "@supabase/supabase-js";

export interface ChatworkCredentials {
  apiToken: string;
  roomId: string;
}

/**
 * Fetch active Chatwork integration credentials for a tenant.
 * Returns null if no active Chatwork integration is configured.
 */
export async function getChatworkCredentials(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ChatworkCredentials | null> {
  const { data } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("tenant_id", tenantId)
    .eq("provider", "chatwork")
    .eq("status", "active")
    .single();

  if (!data) return null;

  const creds = data.credentials as Record<string, string>;
  if (!creds?.api_token || !creds?.room_id) return null;

  return { apiToken: creds.api_token, roomId: creds.room_id };
}
