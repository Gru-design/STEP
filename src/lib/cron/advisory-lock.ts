import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stable 64-bit key for an advisory lock derived from a string identifier.
 *
 * We use a deterministic FNV-1a 64-bit hash truncated to the Postgres BIGINT
 * range. A deterministic hash means a re-deploy or function-cold-start sees
 * the *same* key for the same cron job, so repeated invocations actually
 * contend for the same lock.
 *
 * We use the `BigInt()` constructor rather than `n` literals so the module
 * compiles under an ES2017 target.
 *
 * Exported for tests.
 */
export function cronLockKey(name: string): bigint {
  const FNV_OFFSET = BigInt("0xcbf29ce484222325");
  const FNV_PRIME = BigInt("0x100000001b3");
  const MASK = BigInt("0xffffffffffffffff");
  let hash = FNV_OFFSET;
  for (let i = 0; i < name.length; i++) {
    hash = hash ^ BigInt(name.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK;
  }
  // Convert unsigned 64-bit to signed BIGINT (two's complement).
  const SIGN_BIT = BigInt(1) << BigInt(63);
  const WRAP = BigInt(1) << BigInt(64);
  return hash >= SIGN_BIT ? hash - WRAP : hash;
}

/**
 * Wrap a cron handler in a Postgres advisory lock so that concurrent
 * invocations (Vercel retry, misconfigured double-schedule, warm-start race)
 * short-circuit instead of duplicating work.
 *
 * Contract:
 * - If the lock cannot be acquired, returns `{ acquired: false }` without
 *   invoking `run`.
 * - If `run` throws, the lock is still released before rethrowing.
 * - Uses session-level locks (not transactional), since the PostgREST RPC
 *   runs each call in its own transaction.
 */
export async function withCronLock<T>(
  supabase: SupabaseClient,
  name: string,
  run: () => Promise<T>
): Promise<{ acquired: true; result: T } | { acquired: false }> {
  const key = cronLockKey(name);
  // Supabase sends BIGINT over JSON as a string to preserve precision; both
  // forms are accepted by our RPC.
  const keyParam = key.toString();

  const acquireResult = (await supabase.rpc("try_cron_lock", {
    lock_key: keyParam,
  })) as { data: boolean | null; error: unknown };

  if (acquireResult.error || !acquireResult.data) {
    return { acquired: false };
  }

  try {
    const result = await run();
    return { acquired: true, result };
  } finally {
    // Best-effort release; session advisory locks auto-release on connection
    // drop even if the call below fails.
    await supabase.rpc("release_cron_lock", { lock_key: keyParam });
  }
}
