import { describe, it, expect } from "vitest";
import { escapeCSVField, buildCSV } from "@/lib/csv-export";

describe("escapeCSVField — formula injection protection", () => {
  it("prefixes = with ' to disarm Excel formulas", () => {
    expect(escapeCSVField("=HYPERLINK(\"http://evil\",\"x\")"))
      .toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });

  it("prefixes + with '", () => {
    expect(escapeCSVField("+1+1")).toBe("'+1+1");
  });

  it("prefixes - with ' (minus / DDE)", () => {
    expect(escapeCSVField("-2+5")).toBe("'-2+5");
  });

  it("prefixes @ with ' (Lotus / DDE)", () => {
    expect(escapeCSVField("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
  });

  it("prefixes leading tab with '", () => {
    expect(escapeCSVField("\t=cmd|'/c calc'!A1")).toContain("'");
  });

  it("prefixes leading CR with '", () => {
    expect(escapeCSVField("\r=evil")).toContain("'");
  });

  it("does not prefix safe strings", () => {
    expect(escapeCSVField("Acme Corp")).toBe("Acme Corp");
    expect(escapeCSVField("John Doe <john@example.com>")).toContain("John");
  });

  it("quotes fields containing comma", () => {
    expect(escapeCSVField("a, b")).toBe('"a, b"');
  });

  it("quotes and double-escapes internal quotes", () => {
    expect(escapeCSVField('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("quotes fields containing newline", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null / undefined as empty", () => {
    expect(escapeCSVField(null)).toBe("");
    expect(escapeCSVField(undefined)).toBe("");
  });

  it("stringifies numbers and booleans without prefixing", () => {
    expect(escapeCSVField(42)).toBe("42");
    expect(escapeCSVField(true)).toBe("true");
  });
});

describe("buildCSV", () => {
  it("produces BOM-prefixed header + rows", () => {
    const csv = buildCSV([
      { name: "Acme", email: "a@example.com" },
      { name: "Beta", email: "b@example.com" },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("name,email");
    expect(csv).toContain("Acme,a@example.com");
  });

  it("neutralizes formula payloads embedded in cell values", () => {
    const csv = buildCSV([{ company: "=IMPORTXML(...)" }]);
    // The disarmed cell must appear with leading ', quoted because of = char
    expect(csv).toContain("'=IMPORTXML(...)");
    // And must NOT start a cell with a bare `=`
    expect(csv).not.toMatch(/\n=IMPORTXML/);
  });

  it("returns empty string for empty input", () => {
    expect(buildCSV([])).toBe("");
  });
});
