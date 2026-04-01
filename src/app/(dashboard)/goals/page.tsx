import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoalsTreeView } from "./GoalsTreeView";
import type { Goal, GoalSnapshot, User, Team, ReportTemplate } from "@/types/database";

export default async function GoalsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const tenantId = (dbUser as User).tenant_id;

  // Fetch goals
  const { data: goalsData, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (goalsError) {
    console.error("[Goals] Failed to fetch goals:", goalsError);
  }

  const goals = (goalsData ?? []) as Goal[];

  // Fetch latest snapshots for each goal
  const goalIds = goals.map((g) => g.id);
  let snapshots: GoalSnapshot[] = [];
  if (goalIds.length > 0) {
    const { data: snapshotsData, error: snapshotsError } = await supabase
      .from("goal_snapshots")
      .select("*")
      .in("goal_id", goalIds)
      .order("snapshot_date", { ascending: false });

    if (snapshotsError) {
      console.error("[Goals] Failed to fetch snapshots:", snapshotsError);
    }
    snapshots = (snapshotsData ?? []) as GoalSnapshot[];
  }

  // Build a map: goal_id -> latest snapshot
  const snapshotMap: Record<string, GoalSnapshot> = {};
  for (const s of snapshots) {
    if (!snapshotMap[s.goal_id]) {
      snapshotMap[s.goal_id] = s;
    }
  }

  // Fetch users for owner selection
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("tenant_id", tenantId)
    .order("name");

  if (usersError) {
    console.error("[Goals] Failed to fetch users:", usersError);
  }

  const users = (usersData ?? []) as Pick<User, "id" | "name" | "role">[];

  // Fetch teams for team selection
  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (teamsError) {
    console.error("[Goals] Failed to fetch teams:", teamsError);
  }

  const teams = (teamsData ?? []) as Pick<Team, "id" | "name">[];

  // Fetch templates for KPI field key
  const { data: templatesData, error: templatesError } = await supabase
    .from("report_templates")
    .select("id, name, type")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .order("name");

  if (templatesError) {
    console.error("[Goals] Failed to fetch templates:", templatesError);
  }

  const templates = (templatesData ?? []) as Pick<
    ReportTemplate,
    "id" | "name" | "type"
  >[];

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
      />
    </div>
  );
}
