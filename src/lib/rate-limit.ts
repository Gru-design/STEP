import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Postgres-backed fixed-window rate limiter.
 *
 * The previous implementation kept counters in a Node Map, which made
 * the limit local to each Vercel Function instance — a caller who
 * round-robined across cold-started instances multiplied the effective
 * limit by N. The counter now lives in rate_limit_counters and is
 * mutated atomically via the consume_rate_limit RPC (migration 00037),
 * so the same limit applies regardless of which instance handles the
 * request.
 *
 * Failure mode: fail-open. If the RPC errors (DB outage, connectivity)
 * we log and let the caller through. Rate limiting is a defense in
 * depth; it should not take the whole product down when Postgres
 * hiccups. Auth-critical endpoints can wrap this with stricter
 * behaviour later.
 */

interface RateLimitConfig {
  /** Max requests allowed in the window. Must be > 0. */
  limit: number;
  /** Window duration in seconds. Must be > 0. */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface ConsumeRpcRow {
  allowed: boolean;
  count: number;
  remaining: number;
  reset_at: string;
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig = { limit: 60, windowSeconds: 60 }
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
    });

    if (error || !data) {
      console.error("[rate-limit] consume_rate_limit rpc error:", error?.message);
      return failOpen(config);
    }

    const row = data as ConsumeRpcRow;
    return {
      success: row.allowed,
      remaining: row.remaining,
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (e) {
    console.error("[rate-limit] consume_rate_limit threw:", e);
    return failOpen(config);
  }
}

function failOpen(config: RateLimitConfig): RateLimitResult {
  return {
    success: true,
    remaining: config.limit,
    resetAt: Date.now() + config.windowSeconds * 1000,
  };
}

/**
 * Extract client identifier from request for rate limiting.
 */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return ip;
}
