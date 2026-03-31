import { describe, it, expect } from "vitest";
import {
  signupSchema,
  createDealSchema,
  createGoalSchema,
  createTeamSchema,
  updateProfileSchema,
  createKnowledgeSchema,
} from "@/lib/validations";

describe("signupSchema", () => {
  it("validates correct input", () => {
    const result = signupSchema.safeParse({
      tenantName: "テスト株式会社",
      name: "山田太郎",
      email: "yamada@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty tenant name", () => {
    const result = signupSchema.safeParse({
      tenantName: "",
      name: "山田太郎",
      email: "yamada@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      tenantName: "テスト",
      name: "山田太郎",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signupSchema.safeParse({
      tenantName: "テスト",
      name: "山田太郎",
      email: "yamada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = signupSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createDealSchema", () => {
  it("validates correct input", () => {
    const result = createDealSchema.safeParse({
      company: "ABC商事",
      stage_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("validates with optional fields", () => {
    const result = createDealSchema.safeParse({
      company: "ABC商事",
      title: "案件タイトル",
      value: 1000000,
      due_date: "2026-04-30",
      stage_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty company", () => {
    const result = createDealSchema.safeParse({
      company: "",
      stage_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stage_id", () => {
    const result = createDealSchema.safeParse({
      company: "ABC",
      stage_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = createDealSchema.safeParse({
      company: "ABC",
      value: -100,
      stage_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGoalSchema", () => {
  it("validates correct input", () => {
    const result = createGoalSchema.safeParse({
      name: "売上目標Q1",
      level: "company",
      target_value: 10000000,
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid level", () => {
    const result = createGoalSchema.safeParse({
      name: "目標",
      level: "invalid",
      target_value: 100,
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero target value", () => {
    const result = createGoalSchema.safeParse({
      name: "目標",
      level: "team",
      target_value: 0,
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTeamSchema", () => {
  it("validates correct input", () => {
    const result = createTeamSchema.safeParse({ name: "営業チーム" });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = createTeamSchema.safeParse({ name: "  営業チーム  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("営業チーム");
    }
  });

  it("rejects empty string", () => {
    const result = createTeamSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("validates correct input", () => {
    const result = updateProfileSchema.safeParse({
      name: "山田太郎",
      phone: "090-1234-5678",
      slack_id: "U12345",
      calendar_url: "https://calendly.com/yamada",
      bio: "よろしくお願いします",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty calendar_url", () => {
    const result = updateProfileSchema.safeParse({
      name: "山田太郎",
      calendar_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid calendar_url", () => {
    const result = updateProfileSchema.safeParse({
      name: "山田太郎",
      calendar_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("createKnowledgeSchema", () => {
  it("validates correct input", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "営業ノウハウ",
      body: "効果的なアプローチ方法について...",
      tags: ["営業", "ノウハウ"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "",
      body: "内容",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many tags", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "テスト",
      body: "内容",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });
});
