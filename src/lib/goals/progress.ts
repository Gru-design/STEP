import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal } from "@/types/database";

interface GoalProgress {
  actualValue: number;
  progressRate: number;
}

/**
 * Calculate progress for a single goal by summing the kpi_field_key
 * values from report_entries in the goal's period.
 */
export async function calculateGoalProgress(
  supabase: SupabaseClient,
  goalId: string
): Promise<GoalProgress> {
  // Fetch goal
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (goalError || !goal) {
    return { actualValue: 0, progressRate: 0 };
  }

  const typedGoal = goal as Goal;

  if (!typedGoal.kpi_field_key || !typedGoal.template_id) {
    return { actualValue: 0, progressRate: 0 };
  }

  const { data: entries, error: entriesError } = await supabase
    .from("report_entries")
    .select("data")
    .eq("template_id", typedGoal.template_id)
    .eq("status", "submitted")
    .gte("report_date", typedGoal.period_start)
    .lte("report_date", typedGoal.period_end);

  if (entriesError || !entries) {
    return { actualValue: 0, progressRate: 0 };
  }

  let actualValue = 0;
  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    const value = Number(data[typedGoal.kpi_field_key]);
    if (!isNaN(value)) {
      actualValue += value;
    }
  }

  const targetValue = Number(typedGoal.target_value);
  const progressRate =
    targetValue > 0 ? Math.round((actualValue / targetValue) * 10000) / 100 : 0;

  return { actualValue, progressRate };
}

/**
 * Snapshot all goals for a tenant: calculate progress and insert into goal_snapshots.
 *
 * Optimized: fetches all goals with full data in one query, groups by
 * (template_id, period) to batch-fetch report entries, then batch-inserts snapshots.
 */
export async function snapshotAllGoals(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(1000);

  if (error || !goals || goals.length === 0) {
    return 0;
  }

  const typedGoals = goals as Goal[];
  const today = new Date().toISOString().split("T")[0];

  // Separate goals that can be auto-calculated from those that can't
  const calculableGoals = typedGoals.filter(
    (g) => g.kpi_field_key && g.template_id
  );
  const nonCalculableGoals = typedGoals.filter(
    (g) => !g.kpi_field_key || !g.template_id
  );

  // Group calculable goals by (template_id, period_start, period_end) to batch queries
  const groupKey = (g: Goal) => `${g.template_id}|${g.period_start}|${g.period_end}`;
  const groupedGoals = new Map<string, Goal[]>();
  for (const goal of calculableGoals) {
    const key = groupKey(goal);
    const group = groupedGoals.get(key) ?? [];
    group.push(goal);
    groupedGoals.set(key, group);
  }

  // Batch-fetch report entries per group (one query per unique template+period combo)
  const goalProgressMap = new Map<string, GoalProgress>();

  for (const [, group] of groupedGoals) {
    const representative = group[0];
    const { data: entries } = await supabase
      .from("report_entries")
      .select("data")
      .eq("template_id", representative.template_id!)
      .eq("status", "submitted")
      .gte("report_date", representative.period_start)
      .lte("report_date", representative.period_end)
      .limit(10000);

    // Calculate progress for each goal in this group from the shared entries
    for (const goal of group) {
      let actualValue = 0;
      for (const entry of entries ?? []) {
        const data = entry.data as Record<string, unknown>;
        const value = Number(data[goal.kpi_field_key!]);
        if (!isNaN(value)) {
          actualValue += value;
        }
      }

      const targetValue = Number(goal.target_value);
      const progressRate =
        targetValue > 0
          ? Math.round((actualValue / targetValue) * 10000) / 100
          : 0;

      goalProgressMap.set(goal.id, { actualValue, progressRate });
    }
  }

  // Non-calculable goals get zero progress
  for (const goal of nonCalculableGoals) {
    goalProgressMap.set(goal.id, { actualValue: 0, progressRate: 0 });
  }

  // Batch insert all snapshots at once
  const snapshots = typedGoals.map((goal) => {
    const progress = goalProgressMap.get(goal.id) ?? {
      actualValue: 0,
      progressRate: 0,
    };
    return {
      goal_id: goal.id,
      actual_value: progress.actualValue,
      progress_rate: progress.progressRate,
      snapshot_date: today,
    };
  });

  const { error: insertError, data: inserted } = await supabase
    .from("goal_snapshots")
    .insert(snapshots)
    .select("id");

  if (insertError) {
    console.error("Failed to batch-insert goal snapshots:", insertError);
    return 0;
  }

  return inserted?.length ?? 0;
}
