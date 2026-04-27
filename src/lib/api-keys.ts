import crypto from "crypto";

/**
 * API key hashing and issuance.
 *
 * Plaintext API keys are returned to the issuing admin exactly once and
 * never stored. Only HMAC-SHA256(plaintext, API_KEY_HMAC_SECRET) lives
 * in the integrations table. A DB dump therefore does not expose any
 * working credential.
 *
 * The HMAC secret lives in the API_KEY_HMAC_SECRET environment variable.
 * Rotating it invalidates every previously issued key.
 */

const KEY_PREFIX = "step_";
const RAW_KEY_BYTES = 32;

function getHmacSecret(): string {
  const secret = process.env.API_KEY_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "API_KEY_HMAC_SECRET is not configured (must be at least 32 characters)"
    );
  }
  return secret;
}

/** Hash a plaintext API key with HMAC-SHA256. Hex-encoded for storage. */
export function hashApiKey(plaintext: string): string {
  return crypto
    .createHmac("sha256", getHmacSecret())
    .update(plaintext)
    .digest("hex");
}

export interface IssuedApiKey {
  /** Full plaintext key. Only returned once at issuance time. */
  plaintext: string;
  /** HMAC-SHA256 hex digest of the plaintext. Stored in DB. */
  hash: string;
  /** Short non-secret identifier shown in admin UI ("step_aB12cD34"). */
  prefix: string;
}

export function generateApiKey(): IssuedApiKey {
  const random = crypto.randomBytes(RAW_KEY_BYTES).toString("base64url");
  const plaintext = `${KEY_PREFIX}${random}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, KEY_PREFIX.length + 8),
  };
}
