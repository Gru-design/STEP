import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeGoalProgressMap } from "@/lib/goals/progress";
import { GoalsTreeView } from "./GoalsTreeView";
import type {
  Goal,
  GoalSnapshot,
  User,
  Team,
  ReportTemplate,
  GoalPreset,
  GoalPresetItem,
} from "@/types/database";

export default async function GoalsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Use admin client to bypass RLS (custom_access_token_hook may not be configured)
  const adminClient = createAdminClient();

  const { data: dbUser } = await adminClient
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const tenantId = (dbUser as User).tenant_id;

  // Fetch goals
  const { data: goalsData, error: goalsError } = await adminClient
    .from("goals")
    .select("id, tenant_id, parent_id, level, name, target_value, kpi_field_key, template_id, period_start, period_end, owner_id, team_id, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (goalsError) {
    console.error("[Goals] Failed to fetch goals:", goalsError);
  }

  const goals = (goalsData ?? []) as Goal[];

  // Compute live progress instead of reading the daily snapshot, so the
  // user sees aggregation reflect their KPI configuration and any new
  // report submissions immediately rather than waiting for the next cron.
  const progressMap = await computeGoalProgressMap(adminClient, goals);
  const today = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  const snapshotMap: Record<string, GoalSnapshot> = {};
  for (const goal of goals) {
    const progress = progressMap.get(goal.id) ?? {
      actualValue: 0,
      progressRate: 0,
    };
    snapshotMap[goal.id] = {
      id: `live-${goal.id}`,
      goal_id: goal.id,
      actual_value: progress.actualValue,
      progress_rate: progress.progressRate,
      snapshot_date: today,
      created_at: nowIso,
    };
  }

  // Fetch users for owner selection
  const { data: usersData, error: usersError } = await adminClient
    .from("users")
    .select("id, name, role")
    .eq("tenant_id", tenantId)
    .order("name");

  if (usersError) {
    console.error("[Goals] Failed to fetch users:", usersError);
  }

  const users = (usersData ?? []) as Pick<User, "id" | "name" | "role">[];

  // Fetch teams for team selection
  const { data: teamsData, error: teamsError } = await adminClient
    .from("teams")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (teamsError) {
    console.error("[Goals] Failed to fetch teams:", teamsError);
  }

  const teams = (teamsData ?? []) as Pick<Team, "id" | "name">[];

  // Fetch templates for KPI field key (schema is needed to populate the
  // KPI field selector with the template's numeric/rating fields)
  const { data: templatesData, error: templatesError } = await adminClient
    .from("report_templates")
    .select("id, name, type, schema")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .order("name");

  if (templatesError) {
    console.error("[Goals] Failed to fetch templates:", templatesError);
  }

  const templates = (templatesData ?? []) as Pick<
    ReportTemplate,
    "id" | "name" | "type" | "schema"
  >[];

  // Fetch goal presets + items so the bulk-create dialog has data without
  // an extra round-trip on dialog open.
  const [presetsRes, presetItemsRes] = await Promise.all([
    adminClient
      .from("goal_presets")
      .select(
        "id, tenant_id, name, description, default_level, created_by, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("goal_preset_items")
      .select(
        "id, preset_id, name, report_template_id, kpi_field_key, default_target_value, sort_order, created_at"
      )
      .order("sort_order", { ascending: true }),
  ]);

  const presets = (presetsRes.data ?? []) as GoalPreset[];
  const presetIdSet = new Set(presets.map((p) => p.id));
  const allPresetItems = (presetItemsRes.data ?? []) as GoalPresetItem[];
  const presetItemsByPreset: Record<string, GoalPresetItem[]> = {};
  for (const item of allPresetItems) {
    if (!presetIdSet.has(item.preset_id)) continue;
    (presetItemsByPreset[item.preset_id] ??= []).push(item);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">目標管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          会社・部門・チーム・個人の目標をツリー構造で管理します
        </p>
      </div>
      <GoalsTreeView
        goals={goals}
        snapshotMap={snapshotMap}
        users={users}
        teams={teams}
        templates={templates}
        currentUserRole={(dbUser as User).role}
        presets={presets}
        presetItemsByPreset={presetItemsByPreset}
      />
    </div>
  );
}
