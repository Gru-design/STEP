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
 */
export async function generateDeviationAlerts(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error || !goals) {
    return 0;
  }

  let alertCount = 0;

  for (const goal of goals) {
    const typedGoal = goal as Goal;

    // Get latest snapshot for actual value
    const { data: snapshot } = await supabase
      .from("goal_snapshots")
      .select("actual_value")
      .eq("goal_id", typedGoal.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    const actualValue = snapshot ? Number(snapshot.actual_value) : 0;
    const { deviationRate, isAlert } = checkDeviation(typedGoal, actualValue);

    if (isAlert) {
      // Determine target user: owner_id or skip if no owner
      const targetUserId = typedGoal.owner_id;
      if (!targetUserId) continue;

      const content = `目標「${typedGoal.name}」の進捗が計画ペースから${deviationRate.toFixed(1)}%乖離しています。現在の実績: ${actualValue} / 目標: ${typedGoal.target_value}`;

      // Create nudge for the owner
      await supabase.from("nudges").insert({
        tenant_id: tenantId,
        target_user_id: targetUserId,
        trigger_type: "goal_deviation",
        content,
      });

      // If the goal has a team, also notify the team manager
      if (typedGoal.team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("manager_id")
          .eq("id", typedGoal.team_id)
          .single();

        if (team?.manager_id && team.manager_id !== targetUserId) {
          await supabase.from("nudges").insert({
            tenant_id: tenantId,
            target_user_id: team.manager_id,
            trigger_type: "goal_deviation",
            content: `[マネージャー通知] ${content}`,
          });
        }
      }

      alertCount++;
    }
  }

  return alertCount;
}
