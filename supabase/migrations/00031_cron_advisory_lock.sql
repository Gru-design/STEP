-- Cron advisory locks
--
-- Vercel Cron (and retries) can fire the same endpoint concurrently. For the
-- unified cron this would double-send Chatwork reminders, double-insert
-- nudges, and re-generate weekly digests. We guard the entire handler with a
-- Postgres transaction-level advisory lock keyed by a stable BIGINT.
--
-- We expose two SECURITY DEFINER RPCs because the Service Role client
-- Supabase uses in the cron handler cannot call `pg_try_advisory_lock`
-- directly through PostgREST — only named SQL functions are exposed.

CREATE OR REPLACE FUNCTION public.try_cron_lock(lock_key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT pg_try_advisory_lock(lock_key);
$$;

CREATE OR REPLACE FUNCTION public.release_cron_lock(lock_key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT pg_advisory_unlock(lock_key);
$$;

-- Only the service_role (used by @/lib/supabase/admin) should invoke these.
-- Anon / authenticated roles have no business holding cron locks; revoke to
-- tighten the blast radius even though PostgREST wouldn't otherwise expose
-- them.
REVOKE EXECUTE ON FUNCTION public.try_cron_lock(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.try_cron_lock(bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_cron_lock(bigint) TO service_role;

REVOKE EXECUTE ON FUNCTION public.release_cron_lock(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_cron_lock(bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_cron_lock(bigint) TO service_role;

COMMENT ON FUNCTION public.try_cron_lock(bigint) IS
  'Attempts a session-level Postgres advisory lock. Returns true iff the caller now holds the lock. Release with release_cron_lock. Service role only.';
COMMENT ON FUNCTION public.release_cron_lock(bigint) IS
  'Releases the session-level advisory lock previously acquired via try_cron_lock. Service role only.';
