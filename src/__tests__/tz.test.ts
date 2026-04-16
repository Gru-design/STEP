import { describe, it, expect } from "vitest";
import {
  zonedParts,
  jstParts,
  jstDateString,
  addDaysToDateString,
} from "@/lib/tz";

describe("zonedParts / jstParts", () => {
  it("returns correct JST parts for an afternoon UTC instant", () => {
    // 2026-04-16T05:30:00Z is 2026-04-16 14:30 JST.
    const d = new Date("2026-04-16T05:30:00Z");
    const p = jstParts(d);
    expect(p.year).toBe(2026);
    expect(p.month).toBe(4);
    expect(p.day).toBe(16);
    expect(p.hour).toBe(14);
    expect(p.minute).toBe(30);
    // Thursday
    expect(p.dayOfWeek).toBe(4);
  });

  it("rolls the calendar day forward when UTC is late evening (JST next day)", () => {
    // 2026-04-15T23:00:00Z = 2026-04-16 08:00 JST
    const d = new Date("2026-04-15T23:00:00Z");
    const p = jstParts(d);
    expect(p.year).toBe(2026);
    expect(p.month).toBe(4);
    expect(p.day).toBe(16);
    expect(p.hour).toBe(8);
    // Thursday (same — the UTC date is Wednesday but JST has already rolled)
    expect(p.dayOfWeek).toBe(4);
  });

  it("rolls the calendar day back when UTC is early morning (JST still prev day)", () => {
    // 2026-04-16T14:00:00Z = 2026-04-16 23:00 JST (still same day)
    const d = new Date("2026-04-16T14:00:00Z");
    const p = jstParts(d);
    expect(p.day).toBe(16);
    expect(p.hour).toBe(23);
  });

  it("gives Monday=1 for a known JST Monday", () => {
    // 2026-04-13 (Mon) 09:00 JST = 2026-04-13T00:00:00Z
    const d = new Date("2026-04-13T00:00:00Z");
    expect(jstParts(d).dayOfWeek).toBe(1);
  });

  it("gives Sunday=0 for a known JST Sunday", () => {
    // 2026-04-12 (Sun) 09:00 JST = 2026-04-12T00:00:00Z
    const d = new Date("2026-04-12T00:00:00Z");
    expect(jstParts(d).dayOfWeek).toBe(0);
  });

  it("normalises midnight JST to hour 0", () => {
    // 2026-04-15T15:00:00Z is 2026-04-16 00:00 JST. Some Node/ICU versions
    // report "24" for midnight via Intl — the helper must coerce to 0.
    const d = new Date("2026-04-15T15:00:00Z");
    const p = jstParts(d);
    expect(p.hour).toBe(0);
    expect(p.day).toBe(16);
  });

  it("works for other timezones via zonedParts", () => {
    // 2026-04-16T05:00:00Z = 2026-04-15 22:00 America/New_York (EDT, UTC-4)
    const d = new Date("2026-04-16T05:00:00Z");
    const p = zonedParts(d, "America/New_York");
    expect(p.year).toBe(2026);
    expect(p.month).toBe(4);
    expect(p.day).toBe(16);
    expect(p.hour).toBe(1);
  });
});

describe("jstDateString / zonedDateString", () => {
  it("returns YYYY-MM-DD in JST", () => {
    expect(jstDateString(new Date("2026-04-16T05:30:00Z"))).toBe("2026-04-16");
  });

  it("crosses the day boundary correctly vs raw UTC toISOString", () => {
    const d = new Date("2026-04-15T23:00:00Z");
    // UTC day is still 15, JST day has advanced to 16.
    expect(d.toISOString().startsWith("2026-04-15")).toBe(true);
    expect(jstDateString(d)).toBe("2026-04-16");
  });

  it("pads month and day to 2 digits", () => {
    expect(jstDateString(new Date("2026-01-02T05:00:00Z"))).toBe("2026-01-02");
  });
});

describe("addDaysToDateString", () => {
  it("subtracts days", () => {
    expect(addDaysToDateString("2026-04-16", -1)).toBe("2026-04-15");
    expect(addDaysToDateString("2026-04-13", -3)).toBe("2026-04-10");
  });

  it("adds days across month boundaries", () => {
    expect(addDaysToDateString("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDateString("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("handles leap years", () => {
    // 2024 is a leap year.
    expect(addDaysToDateString("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToDateString("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("handles year rollover", () => {
    expect(addDaysToDateString("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDaysToDateString("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("rejects malformed input", () => {
    expect(() => addDaysToDateString("not-a-date", 1)).toThrow();
    expect(() => addDaysToDateString("2026-4-16", 1)).toThrow();
  });
});
