import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton admin client using Service Role Key.
 *
 * Why singleton is safe here:
 * - The admin client carries no per-user state (no cookies, no JWT refresh).
 * - Node.js module scope is shared across requests within the same process,
 *   so reusing one instance avoids creating hundreds of connections in cron loops.
 * - Supabase JS client already pools fetch requests internally.
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY bypasses RLS.
 * This module must NEVER be imported from client components or bundled for the browser.
 */

let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
