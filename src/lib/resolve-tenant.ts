"use server";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve tenant_id from JWT claims (fast) or fallback to DB lookup.
 * Returns null if the user has no tenant_id in either source.
 *
 * This function centralizes tenant resolution to avoid inconsistent
 * null-handling across Server Actions.
 */
export async function resolveTenantId(
  user: User,
  supabase: SupabaseClient
): Promise<string | null> {
  // 1. Try JWT claims (fastest, no DB round-trip)
  const fromClaims =
    user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id;

  if (typeof fromClaims === "string" && fromClaims.length > 0) {
    return fromClaims;
  }

  // 2. Fallback: DB lookup
  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  return dbUser?.tenant_id ?? null;
}
