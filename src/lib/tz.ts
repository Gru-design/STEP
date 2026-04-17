/**
 * Timezone-aware date helpers.
 *
 * Previous code used `new Date(date.toLocaleString("en-US", { timeZone: "..." }))`
 * which relies on locale-specific string parsing — fragile, non-portable, and
 * silently wrong on any runtime whose system TZ is not UTC. These helpers use
 * `Intl.DateTimeFormat#formatToParts` so the result is independent of the
 * server's system timezone.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;
  second: number;
  /** 0 = Sunday ... 6 = Saturday */
  dayOfWeek: number;
}

const DOW_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
}

/**
 * Break a moment into calendar parts for the given IANA timezone.
 *
 * @example
 *   // At 2026-04-15T23:15Z the JST day is already 2026-04-16.
 *   zonedParts(d, "Asia/Tokyo") // { year: 2026, month: 4, day: 16, ... }
 */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const byType: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") byType[p.type] = p.value;
  }
  // `hour: "2-digit"` + `hour12: false` returns "24" at midnight in some
  // Node versions; normalise to 0.
  const hour = Number(byType.hour);
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(byType.minute),
    second: Number(byType.second),
    dayOfWeek: DOW_INDEX[byType.weekday] ?? 0,
  };
}

/** Convenience wrapper for Asia/Tokyo. */
export function jstParts(date: Date = new Date()): ZonedParts {
  return zonedParts(date, "Asia/Tokyo");
}

/** "YYYY-MM-DD" in the given timezone. */
export function zonedDateString(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year.toString().padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" in Asia/Tokyo. */
export function jstDateString(date: Date = new Date()): string {
  return zonedDateString(date, "Asia/Tokyo");
}

/**
 * Shift a "YYYY-MM-DD" date string by a signed number of days without being
 * affected by the local system timezone. We anchor at UTC noon to stay safely
 * inside the same calendar day under DST transitions for any tz.
 */
export function addDaysToDateString(dateStr: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error(`addDaysToDateString: invalid date ${dateStr}`);
  const [, y, mo, d] = m;
  const anchor = Date.UTC(Number(y), Number(mo) - 1, Number(d), 12, 0, 0);
  const shifted = new Date(anchor + delta * 24 * 60 * 60 * 1000);
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
