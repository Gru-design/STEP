import { describe, it, expect } from "vitest";
import { createReportSchema, createPlanSchema } from "@/lib/validations";
import { isSafeUrl } from "@/lib/url-validation";

describe("createReportSchema", () => {
  it("validates correct input", () => {
    const result = createReportSchema.safeParse({
      templateId: "550e8400-e29b-41d4-a716-446655440000",
      reportDate: "2026-03-31",
      data: { motivation: 4, comment: "今日は良い日でした" },
      status: "submitted",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid template UUID", () => {
    const result = createReportSchema.safeParse({
      templateId: "not-uuid",
      reportDate: "2026-03-31",
      data: {},
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty reportDate", () => {
    const result = createReportSchema.safeParse({
      templateId: "550e8400-e29b-41d4-a716-446655440000",
      reportDate: "",
      data: {},
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = createReportSchema.safeParse({
      templateId: "550e8400-e29b-41d4-a716-446655440000",
      reportDate: "2026-03-31",
      data: {},
      status: "published",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPlanSchema", () => {
  it("validates correct input", () => {
    const result = createPlanSchema.safeParse({
      weekStart: "2026-03-30",
    });
    expect(result.success).toBe(true);
  });

  it("validates with optional fields", () => {
    const result = createPlanSchema.safeParse({
      weekStart: "2026-03-30",
      templateId: "550e8400-e29b-41d4-a716-446655440000",
      items: [{ key: "calls", target: 10 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty weekStart", () => {
    const result = createPlanSchema.safeParse({
      weekStart: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("isSafeUrl", () => {
  it("allows valid HTTPS URLs", () => {
    expect(isSafeUrl("https://hooks.slack.com/services/abc")).toBe(true);
    expect(isSafeUrl("https://example.com/webhook")).toBe(true);
  });

  it("allows HTTP in non-production", () => {
    expect(isSafeUrl("http://example.com/webhook")).toBe(true);
  });

  it("blocks localhost", () => {
    expect(isSafeUrl("http://localhost:3000")).toBe(false);
    expect(isSafeUrl("http://localhost/admin")).toBe(false);
  });

  it("blocks private IP ranges", () => {
    expect(isSafeUrl("http://127.0.0.1")).toBe(false);
    expect(isSafeUrl("http://10.0.0.1")).toBe(false);
    expect(isSafeUrl("http://192.168.1.1")).toBe(false);
    expect(isSafeUrl("http://172.16.0.1")).toBe(false);
  });

  it("blocks AWS metadata endpoint", () => {
    expect(isSafeUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("blocks internal domains", () => {
    expect(isSafeUrl("http://service.local")).toBe(false);
    expect(isSafeUrl("http://api.internal")).toBe(false);
  });

  it("blocks non-http protocols", () => {
    expect(isSafeUrl("ftp://example.com")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("handles invalid URLs", () => {
    expect(isSafeUrl("not-a-url")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });

  it("blocks 0.0.0.0", () => {
    expect(isSafeUrl("http://0.0.0.0")).toBe(false);
  });
});
