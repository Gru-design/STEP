export type Role = "super_admin" | "admin" | "manager" | "member";
export type ReportVisibility = "manager_only" | "team" | "tenant_all";
export type Plan = "free" | "starter" | "professional" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  plan: Plan;
  domain: string | null;
  settings: Record<string, unknown>;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  report_visibility: ReportVisibility;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: Role;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  slack_id: string | null;
  calendar_url: string | null;
  bio: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  manager_id: string | null;
  parent_team_id: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  created_at: string;
}

export type TemplateType = "daily" | "weekly" | "plan" | "checkin";

export type FieldType = "text" | "textarea" | "number" | "select_single" | "select_multi" | "date" | "rating" | "link" | "section" | "repeater";

export interface TemplateField {
  key: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  show_cumulative?: boolean;  // number フィールドで当月累計を表示
  options?: string[];
  fields?: TemplateField[];  // for repeater
}

export interface TemplateSection {
  id: string;
  label: string;
  fields: TemplateField[];
}

export interface TemplateSchema {
  sections: TemplateSection[];
}

export interface ReportTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  type: TemplateType;
  target_roles: string[];
  schema: TemplateSchema;
  visibility_override: ReportVisibility | null;
  is_system: boolean;
  is_published: boolean;
  version: number;
  source_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = "draft" | "submitted";
export type ReactionType = "like" | "fire" | "clap" | "heart" | "eyes";

export interface ReportEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  template_id: string;
  report_date: string;
  data: Record<string, unknown>;
  status: ReportStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reaction {
  id: string;
  entry_id: string;
  user_id: string;
  type: ReactionType;
  comment: string | null;
  created_at: string;
}

// ── Nudge & Gamification ──

export type NudgeStatus = "pending" | "sent" | "actioned" | "dismissed";

export interface Nudge {
  id: string;
  tenant_id: string;
  target_user_id: string;
  trigger_type: string;
  content: string;
  status: NudgeStatus;
  actioned_at: string | null;
  created_at: string;
}

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  condition: Record<string, unknown>;
  rarity: BadgeRarity;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level: number;
  xp: number;
  updated_at: string;
}

// ── Peer Bonus ──

export interface PeerBonus {
  id: string;
  tenant_id: string;
  from_user_id: string;
  to_user_id: string;
  report_entry_id: string | null;
  message: string;
  bonus_date: string;
  created_at: string;
}

// ── Deals & Pipeline ──

export type DealStatus = "active" | "won" | "lost" | "hold";
export type ApprovalStatus = "none" | "submitted" | "approved" | "rejected";

export interface PipelineStage {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  conversion_target: number | null;
  created_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  user_id: string;
  stage_id: string;
  company: string;
  title: string | null;
  value: number | null;
  persona: Record<string, unknown>;
  due_date: string | null;
  status: DealStatus;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface DealHistory {
  id: string;
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
}

// ── Goals ──

export type GoalLevel = "company" | "department" | "team" | "individual";

export interface Goal {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  level: GoalLevel;
  name: string;
  target_value: number;
  kpi_field_key: string | null;
  template_id: string | null;
  period_start: string;
  period_end: string;
  owner_id: string | null;
  team_id: string | null;
  created_at: string;
}

export interface GoalSnapshot {
  id: string;
  goal_id: string;
  actual_value: number;
  progress_rate: number;
  snapshot_date: string;
  created_at: string;
}

// ── Weekly Plans ──

export type PlanStatus = "draft" | "submitted" | "approved" | "rejected" | "review_pending" | "reviewed";

export interface WeeklyPlan {
  id: string;
  tenant_id: string;
  user_id: string;
  week_start: string;
  template_id: string | null;
  items: Record<string, unknown>;
  status: PlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  execution_rate: number | null;
  created_at: string;
  updated_at: string;
}

// ── Plan Reviews ──

export interface PlanReview {
  id: string;
  tenant_id: string;
  plan_id: string;
  user_id: string;
  self_rating: number | null;
  went_well: string | null;
  to_improve: string | null;
  next_actions: string | null;
  manager_id: string | null;
  manager_comment: string | null;
  manager_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Approval Logs ──

export type ApprovalTargetType = "weekly_plan" | "deal";
export type ApprovalAction = "submitted" | "approved" | "rejected";

export interface ApprovalLog {
  id: string;
  target_type: ApprovalTargetType;
  target_id: string;
  action: ApprovalAction;
  actor_id: string;
  comment: string | null;
  created_at: string;
}

// ── Knowledge Posts ──

export interface KnowledgePost {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ── Weekly Digests ──

export interface WeeklyDigest {
  id: string;
  tenant_id: string;
  week_start: string;
  rankings: Record<string, unknown>;
  mvp: Record<string, unknown>;
  stats: Record<string, unknown>;
  badges_earned: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  created_at: string;
}

// ── Integrations ──

export type IntegrationProvider = "google_calendar" | "gmail" | "slack" | "chatwork" | "teams" | "cti";
export type IntegrationStatus = "active" | "inactive" | "error";

export interface Integration {
  id: string;
  tenant_id: string;
  provider: IntegrationProvider;
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  status: IntegrationStatus;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string;
  source: string;
  raw_data: Record<string, unknown>;
  collected_at: string;
}
