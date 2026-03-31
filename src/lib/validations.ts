import { z } from "zod";

// ── Auth ──

export const signupSchema = z.object({
  tenantName: z.string().min(1, "テナント名を入力してください").max(100),
  name: z.string().min(1, "名前を入力してください").max(100),
  email: z.string().email("有効なメールアドレスを入力してください").max(255),
  password: z.string().min(8, "パスワードは8文字以上で入力してください").max(128),
});

// ── Team ──

export const createTeamSchema = z.object({
  name: z.string().min(1, "チーム名を入力してください").max(100).trim(),
});

export const addTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removeTeamMemberSchema = z.object({
  memberId: z.string().uuid(),
});

// ── Deals ──

export const createDealSchema = z.object({
  company: z.string().min(1, "会社名を入力してください").max(200),
  title: z.string().max(200).optional(),
  value: z.number().nonnegative().optional(),
  due_date: z.string().optional(),
  stage_id: z.string().uuid("ステージを選択してください"),
});

export const updateDealSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  title: z.string().max(200).optional(),
  value: z.number().nonnegative().optional(),
  due_date: z.string().optional(),
  status: z.enum(["active", "won", "lost", "hold"]).optional(),
  persona: z.record(z.string(), z.unknown()).optional(),
});

// ── Goals ──

export const createGoalSchema = z.object({
  name: z.string().min(1, "目標名を入力してください").max(200),
  level: z.enum(["company", "department", "team", "individual"]),
  target_value: z.number().positive("目標値は正の数で入力してください"),
  kpi_field_key: z.string().optional(),
  template_id: z.string().uuid().optional(),
  period_start: z.string().min(1, "開始日を入力してください"),
  period_end: z.string().min(1, "終了日を入力してください"),
  owner_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional(),
});

// ── Profile ──

export const updateProfileSchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(100),
  phone: z.string().max(20).optional(),
  slack_id: z.string().max(50).optional(),
  calendar_url: z.string().url("有効なURLを入力してください").max(500).optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
});

// ── Settings ──

export const updateTenantSchema = z.object({
  name: z.string().min(1, "テナント名を入力してください").max(100),
  report_visibility: z.enum(["manager_only", "team", "tenant_all"]),
});

// ── Knowledge ──

export const createKnowledgeSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  body: z.string().min(1, "本文を入力してください").max(10000),
  tags: z.array(z.string().max(50)).max(10).optional(),
});
