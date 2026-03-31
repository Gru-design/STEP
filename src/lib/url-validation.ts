/**
 * Validate URLs to prevent SSRF attacks.
 * Rejects private/reserved IP ranges and non-HTTPS in production.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http(s)
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    // In production, require HTTPS
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject private/reserved hostnames and IPs
    const blocked = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fd/,
      /^fe80:/,
      /\.local$/,
      /\.internal$/,
      /\.svc$/,
      /^metadata\.google\.internal$/,
    ];

    if (blocked.some((p) => p.test(hostname))) return false;

    // Reject IPs that resolve to 0.0.0.0
    if (hostname === "0.0.0.0" || hostname === "[::0]") return false;

    return true;
  } catch {
    return false;
  }
}
