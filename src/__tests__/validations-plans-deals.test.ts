import { describe, it, expect } from "vitest";
import { upsertPlanSchema, updateDealSchema, inviteUserSchema } from "@/lib/validations";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("upsertPlanSchema", () => {
  it("accepts draft status", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: UUID,
      items: { calls: 10 },
      status: "draft",
    });
    expect(r.success).toBe(true);
  });

  it("accepts submitted status", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: UUID,
      items: {},
      status: "submitted",
    });
    expect(r.success).toBe(true);
  });

  it("rejects approved status (approval bypass attempt)", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: UUID,
      items: {},
      status: "approved",
    });
    expect(r.success).toBe(false);
  });

  it("rejects rejected status", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: UUID,
      items: {},
      status: "rejected",
    });
    expect(r.success).toBe(false);
  });

  it("rejects reviewed status", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: UUID,
      items: {},
      status: "reviewed",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing templateId", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      items: {},
      status: "draft",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-UUID templateId", () => {
    const r = upsertPlanSchema.safeParse({
      weekStart: "2026-04-13",
      templateId: "not-a-uuid",
      items: {},
      status: "draft",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateDealSchema", () => {
  it("accepts partial update with allowed fields", () => {
    const r = updateDealSchema.safeParse({
      company: "Acme",
      status: "won",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    const r = updateDealSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("strips unknown fields like approval_status", () => {
    const r = updateDealSchema.safeParse({
      company: "Acme",
      approval_status: "approved", // attempt to self-approve
      user_id: "some-other-user", // attempt to seize ownership
      tenant_id: "other-tenant",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      // Fields not declared in the schema must NOT propagate.
      expect(r.data).not.toHaveProperty("approval_status");
      expect(r.data).not.toHaveProperty("user_id");
      expect(r.data).not.toHaveProperty("tenant_id");
      expect(r.data.company).toBe("Acme");
    }
  });

  it("rejects invalid status enum", () => {
    const r = updateDealSchema.safeParse({ status: "cancelled" });
    expect(r.success).toBe(false);
  });

  it("rejects negative value", () => {
    const r = updateDealSchema.safeParse({ value: -100 });
    expect(r.success).toBe(false);
  });

  it("rejects over-length company name", () => {
    const r = updateDealSchema.safeParse({ company: "x".repeat(201) });
    expect(r.success).toBe(false);
  });
});

describe("inviteUserSchema", () => {
  const base = { email: "new@example.com", name: "New User" };

  it("accepts role=admin", () => {
    expect(inviteUserSchema.safeParse({ ...base, role: "admin" }).success).toBe(true);
  });
  it("accepts role=manager", () => {
    expect(inviteUserSchema.safeParse({ ...base, role: "manager" }).success).toBe(true);
  });
  it("accepts role=member", () => {
    expect(inviteUserSchema.safeParse({ ...base, role: "member" }).success).toBe(true);
  });

  it("rejects role=super_admin (privilege-escalation attempt)", () => {
    const r = inviteUserSchema.safeParse({ ...base, role: "super_admin" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown role", () => {
    const r = inviteUserSchema.safeParse({ ...base, role: "owner" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = inviteUserSchema.safeParse({
      email: "not-an-email",
      name: "x",
      role: "member",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty name", () => {
    const r = inviteUserSchema.safeParse({
      email: "a@b.com",
      name: "",
      role: "member",
    });
    expect(r.success).toBe(false);
  });
});
