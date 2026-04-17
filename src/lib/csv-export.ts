/**
 * CSV export utility with Japanese Excel compatibility (BOM) and
 * formula-injection protection (CWE-1236).
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escape a single CSV field value.
 *
 * 1. Prefix with `'` if the cell starts with a character Excel / LibreOffice
 *    interpret as the start of a formula. This prevents CSV-injection payloads
 *    like `=HYPERLINK("http://evil",...)` or `@SUM(...)` from executing when
 *    a user opens the exported file.
 * 2. Quote and double-escape if the field contains commas, quotes, or
 *    newlines (per RFC 4180).
 */
export function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let field = String(value);

  if (FORMULA_PREFIX.test(field)) {
    field = `'${field}`;
  }

  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Build a CSV string (with BOM for Excel-Japanese) from an array of rows.
 * Safe against CSV-injection. Pure function — reusable from both browser and
 * server code.
 */
export function buildCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((row) =>
      headers.map((h) => escapeCSVField(row[h])).join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

/**
 * Browser-side file download helper.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) return;
  const csvString = buildCSV(data);
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
