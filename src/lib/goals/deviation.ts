import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal } from "@/types/database";

interface DeviationResult {
  deviationRate: number;
  isAlert: boolean;
}

/**
 * Calculate deviation between planned pace and actual value.
 * planned pace = target_value * (elapsed_days / total_days)
 * deviation = (planned - actual) / planned * 100
 */
export function checkDeviation(
  goal: Goal,
  actualValue: number
): DeviationResult {
  const now = new Date();
  const start = new Date(goal.period_start);
  const end = new Date(goal.period_end);

  const totalDays = Math.max(
    1,
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const elapsedDays = Math.max(
    0,
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  const targetValue = Number(goal.target_value);
  const plannedPace = targetValue * (elapsedDays / totalDays);

  if (plannedPace <= 0) {
    return { deviationRate: 0, isAlert: false };
  }

  const deviationRate =
    Math.round(((plannedPace - actualValue) / plannedPace) * 10000) / 100;

  return {
    deviationRate,
    isAlert: deviationRate >= 5,
  };
}

/**
 * Check all goals in a tenant for deviation and create nudges for >= 5%.
 *
 * Optimized: batch-fetches all latest snapshots via a single query with
 * DISTINCT ON, batch-fetches all teams, and batch-inserts all nudges.
 */
export async function generateDeviationAlerts(
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
  const goalIds = typedGoals.map((g) => g.id);

  // Batch: fetch latest snapshot for all goals at once
  // We fetch all snapshots ordered by date desc, then pick the latest per goal in JS
  const { data: allSnapshots } = await supabase
    .from("goal_snapshots")
    .select("goal_id, actual_value, snapshot_date")
    .in("goal_id", goalIds)
    .order("snapshot_date", { ascending: false })
    .limit(5000);

  const latestSnapshotMap = new Map<string, number>();
  for (const snapshot of allSnapshots ?? []) {
    // First occurrence per goal_id is the latest (ordered desc)
    if (!latestSnapshotMap.has(snapshot.goal_id)) {
      latestSnapshotMap.set(snapshot.goal_id, Number(snapshot.actual_value));
    }
  }

  // Batch: fetch all teams that any goal references
  const teamIds = [
    ...new Set(typedGoals.filter((g) => g.team_id).map((g) => g.team_id!)),
  ];
  const teamManagerMap = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, manager_id")
      .in("id", teamIds);

    for (const team of teams ?? []) {
      if (team.manager_id) {
        teamManagerMap.set(team.id, team.manager_id);
      }
    }
  }

  // Build all nudges
  const allNudges: Array<{
    tenant_id: string;
    target_user_id: string;
    trigger_type: string;
    content: string;
  }> = [];

  let alertCount = 0;

  for (const goal of typedGoals) {
    const actualValue = latestSnapshotMap.get(goal.id) ?? 0;
    const { deviationRate, isAlert } = checkDeviation(goal, actualValue);

    if (!isAlert) continue;

    const targetUserId = goal.owner_id;
    if (!targetUserId) continue;

    const content = `目標「${goal.name}」の進捗が計画ペースから${deviationRate.toFixed(1)}%乖離しています。現在の実績: ${actualValue} / 目標: ${goal.target_value}`;

    // Nudge for the owner
    allNudges.push({
      tenant_id: tenantId,
      target_user_id: targetUserId,
      trigger_type: "goal_deviation",
      content,
    });

    // Nudge for the team manager (if different from owner)
    if (goal.team_id) {
      const managerId = teamManagerMap.get(goal.team_id);
      if (managerId && managerId !== targetUserId) {
        allNudges.push({
          tenant_id: tenantId,
          target_user_id: managerId,
          trigger_type: "goal_deviation",
          content: `[マネージャー通知] ${content}`,
        });
      }
    }

    alertCount++;
  }

  if (allNudges.length === 0) return 0;

  // Batch insert all nudges at once
  const { error: insertError } = await supabase
    .from("nudges")
    .insert(allNudges);

  if (insertError) {
    console.error("Failed to batch-insert deviation nudges:", insertError);
    return 0;
  }

  return alertCount;
}
