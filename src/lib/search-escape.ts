/**
 * Escape a user-supplied fragment for use inside a PostgreSQL LIKE/ILIKE
 * pattern.
 *
 * LIKE/ILIKE treat `%` and `_` as wildcards and `\` as the escape character.
 * Without escaping, a query like `100%` degrades into a catch-all scan and a
 * query like `_foo` matches any single char followed by "foo" — both are
 * information-disclosure vectors for pattern-based search endpoints.
 *
 * Order matters: backslash must be doubled first, otherwise the escapes we
 * insert for `%` / `_` would themselves be re-escaped.
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Escape a fragment for use inside a PostgREST `.or()` filter string.
 *
 * PostgREST parses `.or()` arguments as a comma-separated list of filters, with
 * parentheses used for grouping. A raw user value containing `,`, `(`, `)` (or
 * their URL-encoded forms) could inject additional filters and expand the
 * result set beyond what the caller intended.
 *
 * The safest remediation is to avoid `.or()` for untrusted input entirely and
 * issue separate `.ilike()` queries merged in application code. This helper is
 * kept for documentation + the small number of places where `.or()` is
 * genuinely needed on trusted fragments.
 */
export function escapePostgrestOr(input: string): string {
  return escapeLikePattern(input)
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
