-- ============================================================
-- API key hashing for integrations (provider = 'api')
-- ============================================================
--
-- Why:
-- The /api/v1/* routes look up callers by X-API-Key header. Until now
-- the lookup compared incoming keys against the plaintext value stored
-- in integrations.credentials.api_key, iterating every active row and
-- doing a timing-safe compare per entry — O(N) per request, and a DB
-- dump would expose every customer's working API key.
--
-- This migration adds the 'api' provider to the enum and creates a
-- unique expression index on credentials->>'api_key_hash'. Going
-- forward the application stores only HMAC-SHA256(plaintext, secret)
-- and looks keys up in O(1) with the index.
--
-- No backfill is needed: the 'api' provider was never present in the
-- enum, so no rows of that provider exist.

-- 1. Allow 'api' as an integrations.provider value.
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'google_calendar',
    'gmail',
    'slack',
    'teams',
    'cti',
    'chatwork',
    'api'
  ));

-- 2. Unique expression index on the hash. Partial so it does not
--    interfere with the JSONB shape of other providers.
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_api_key_hash
  ON integrations ((credentials->>'api_key_hash'))
  WHERE provider = 'api';
