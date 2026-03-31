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
  role: string;
  created_at: string;
}

export type TemplateType = "daily" | "weekly" | "plan" | "checkin";

export type FieldType = "text" | "textarea" | "number" | "select_single" | "select_multi" | "date" | "rating" | "file" | "link" | "section" | "repeater";

export interface TemplateField {
  key: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
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
  tenant_id: string;
  name: string;
  type: TemplateType;
  target_roles: string[];
  schema: TemplateSchema;
  visibility_override: ReportVisibility | null;
  is_system: boolean;
  is_published: boolean;
  version: number;
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
