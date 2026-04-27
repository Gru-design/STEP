-- ============================================================
-- Postgres-backed rate limiter
-- ============================================================
--
-- Why:
-- src/lib/rate-limit.ts kept counters in a Node Map. Each Vercel
-- Function instance has its own memory, so an attacker round-robining
-- across cold-started instances multiplied the effective limit by N.
-- An attacker hitting the login endpoint from a single IP could blow
-- past the per-IP limit just by spreading requests across regions.
--
-- This table + helper function move the counter into Postgres so a
-- single shared store enforces the limit across every Vercel instance.
-- The application layer keeps the same { success, remaining, resetAt }
-- contract so callers do not need to change.
--
-- Window strategy: fixed window (truncated to window size). Cheaper
-- than sliding window and good enough for the brute-force / cost
-- protection use case. INSERT … ON CONFLICT DO UPDATE makes the
-- increment atomic.

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- The PK already covers the lookup; an additional index on
-- window_start lets the daily cleanup scan the table by age cheaply.
CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_window_start
  ON rate_limit_counters (window_start);

-- No RLS: the table is touched only via SECURITY DEFINER helpers below.
-- Lock it down so accidental anon or authenticated reads do not leak
-- request patterns.
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- consume_rate_limit
--   Atomically increments the counter for (p_key, current window) and
--   returns whether the request is within the limit. Uses
--   date_trunc-style alignment so a window of 60s rounds to the
--   minute boundary; a window of 3600s rounds to the hour.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'consume_rate_limit: limit and window must be positive';
  END IF;

  -- Align to the start of the current fixed window. epoch math keeps
  -- the result a deterministic boundary regardless of server tz.
  v_window_start := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO rate_limit_counters (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limit_counters.count + 1
  RETURNING count INTO v_count;

  RETURN jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'remaining', greatest(0, p_limit - v_count),
    'reset_at', v_window_start + make_interval(secs => p_window_seconds)
  );
END;
$$;

-- purge_rate_limit_counters
--   Removes counter rows whose window ended more than p_keep_seconds
--   ago. Called from the daily cron to keep the table small.
CREATE OR REPLACE FUNCTION public.purge_rate_limit_counters(
  p_keep_seconds INTEGER DEFAULT 86400
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_counters
   WHERE window_start < now() - make_interval(secs => p_keep_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Only the service role and authenticated callers may consume; only
-- the service role may purge. The anon role gets nothing.
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_rate_limit_counters(INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_rate_limit_counters(INTEGER)
  TO service_role;
