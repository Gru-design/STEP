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
