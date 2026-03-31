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

  // If no kpi_field_key or template_id, we can't auto-calculate
  if (!typedGoal.kpi_field_key || !typedGoal.template_id) {
    return { actualValue: 0, progressRate: 0 };
  }

  // Fetch all submitted report_entries in the period with matching template
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

  // Sum the kpi_field_key values from the data JSONB
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
 */
export async function snapshotAllGoals(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data: goals, error } = await supabase
    .from("goals")
    .select("id")
    .eq("tenant_id", tenantId);

  if (error || !goals) {
    return 0;
  }

  let count = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const goal of goals) {
    const { actualValue, progressRate } = await calculateGoalProgress(
      supabase,
      goal.id
    );

    const { error: insertError } = await supabase
      .from("goal_snapshots")
      .insert({
        goal_id: goal.id,
        actual_value: actualValue,
        progress_rate: progressRate,
        snapshot_date: today,
      });

    if (!insertError) {
      count++;
    }
  }

  return count;
}
