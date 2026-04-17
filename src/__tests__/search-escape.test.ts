import { describe, it, expect } from "vitest";
import { escapeLikePattern, escapePostgrestOr } from "@/lib/search-escape";

describe("escapeLikePattern", () => {
  it("escapes %", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes _", () => {
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes backslash FIRST so our own escapes aren't re-escaped", () => {
    // "\\%" -> after backslash doubling -> "\\\\%", then % escaped -> "\\\\\\%"
    expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
  });

  it("leaves safe characters alone", () => {
    expect(escapeLikePattern("Acme Corp")).toBe("Acme Corp");
    expect(escapeLikePattern("john@example.com")).toBe("john@example.com");
  });

  it("neutralises a pure-wildcard query", () => {
    // A user entering just "%" must not expand into a catch-all.
    expect(escapeLikePattern("%")).toBe("\\%");
    expect(escapeLikePattern("%%%")).toBe("\\%\\%\\%");
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });
});

describe("escapePostgrestOr", () => {
  it("escapes comma to prevent filter injection", () => {
    expect(escapePostgrestOr("a,b")).toBe("a\\,b");
  });

  it("escapes parentheses to prevent group injection", () => {
    expect(escapePostgrestOr("(evil)")).toBe("\\(evil\\)");
  });

  it("still escapes LIKE metachars", () => {
    expect(escapePostgrestOr("100%,_x")).toBe("100\\%\\,\\_x");
  });

  it("neutralises a crafted .or() injection payload", () => {
    // An attacker tries to append a second filter that matches everything.
    const payload = "x,tenant_id.neq.00000000-0000-0000-0000-000000000000";
    const escaped = escapePostgrestOr(payload);
    // Comma must be escaped → cannot terminate the current filter value.
    expect(escaped).not.toMatch(/[^\\],/);
    expect(escaped).toContain("\\,");
  });
});
