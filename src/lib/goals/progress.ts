import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal } from "@/types/database";

export interface GoalProgress {
  actualValue: number;
  progressRate: number;
}

function computeProgressFromEntries(
  goal: Goal,
  entries: { data: unknown }[]
): GoalProgress {
  let actualValue = 0;
  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    const value = Number(data[goal.kpi_field_key!]);
    if (!isNaN(value)) {
      actualValue += value;
    }
  }
  const targetValue = Number(goal.target_value);
  const progressRate =
    targetValue > 0 ? Math.round((actualValue / targetValue) * 10000) / 100 : 0;
  return { actualValue, progressRate };
}

/**
 * Compute live KPI aggregation for a list of goals without writing to
 * goal_snapshots. Groups goals by (tenant_id, template_id, period) so
 * each unique combination becomes a single report_entries query, and
 * scopes the query by tenant_id so a system template (tenant_id = null)
 * cannot accidentally sum entries from other tenants.
 */
export async function computeGoalProgressMap(
  supabase: SupabaseClient,
  goals: Goal[]
): Promise<Map<string, GoalProgress>> {
  const progressMap = new Map<string, GoalProgress>();

  const calculable = goals.filter((g) => g.kpi_field_key && g.template_id);
  const nonCalculable = goals.filter(
    (g) => !g.kpi_field_key || !g.template_id
  );

  const groupKey = (g: Goal) =>
    `${g.tenant_id}|${g.template_id}|${g.period_start}|${g.period_end}`;
  const grouped = new Map<string, Goal[]>();
  for (const goal of calculable) {
    const key = groupKey(goal);
    const group = grouped.get(key) ?? [];
    group.push(goal);
    grouped.set(key, group);
  }

  for (const [, group] of grouped) {
    const rep = group[0];
    const { data: entries } = await supabase
      .from("report_entries")
      .select("data")
      .eq("tenant_id", rep.tenant_id)
      .eq("template_id", rep.template_id!)
      .eq("status", "submitted")
      .gte("report_date", rep.period_start)
      .lte("report_date", rep.period_end)
      .limit(10000);

    for (const goal of group) {
      progressMap.set(goal.id, computeProgressFromEntries(goal, entries ?? []));
    }
  }

  for (const goal of nonCalculable) {
    progressMap.set(goal.id, { actualValue: 0, progressRate: 0 });
  }

  return progressMap;
}

/**
 * Calculate progress for a single goal by summing the kpi_field_key
 * values from report_entries in the goal's period.
 */
export async function calculateGoalProgress(
  supabase: SupabaseClient,
  goalId: string
): Promise<GoalProgress> {
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (goalError || !goal) {
    return { actualValue: 0, progressRate: 0 };
  }

  const map = await computeGoalProgressMap(supabase, [goal as Goal]);
  return map.get((goal as Goal).id) ?? { actualValue: 0, progressRate: 0 };
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
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(1000);

  if (error || !goals || goals.length === 0) {
    return 0;
  }

  const typedGoals = goals as Goal[];
  const today = new Date().toISOString().split("T")[0];

  const progressMap = await computeGoalProgressMap(supabase, typedGoals);

  const snapshots = typedGoals.map((goal) => {
    const progress = progressMap.get(goal.id) ?? {
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
