"use server";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve tenant_id from signed JWT claims (app_metadata, fast) or fallback
 * to DB lookup. Returns null if the user has no tenant_id in either source.
 *
 * SECURITY: Reads ONLY from `app_metadata` (set by custom_access_token_hook
 * on the server) and never from `user_metadata`, which users can freely
 * overwrite via `supabase.auth.updateUser({ data: { tenant_id: "..." } })`.
 * Trusting user_metadata would permit cross-tenant takeover anywhere this
 * helper's return value is used for database scoping.
 */
export async function resolveTenantId(
  user: User,
  supabase: SupabaseClient
): Promise<string | null> {
  // 1. Try signed JWT claims (fastest, no DB round-trip)
  const fromClaims = user.app_metadata?.tenant_id;

  if (typeof fromClaims === "string" && fromClaims.length > 0) {
    return fromClaims;
  }

  // 2. Fallback: DB lookup (canonical source)
  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  return dbUser?.tenant_id ?? null;
}
