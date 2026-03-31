import { createAdminClient } from "@/lib/supabase/admin";
import { calculateLevel } from "./level";

export type XPAction =
  | "daily_report"
  | "weekly_plan"
  | "checkin"
  | "reaction"
  | "knowledge"
  | "goal_achieved";

export const XP_VALUES: Record<XPAction, number> = {
  daily_report: 10,
  weekly_plan: 15,
  checkin: 5,
  reaction: 2,
  knowledge: 20,
  goal_achieved: 50,
};

/**
 * Award XP to a user for a given action.
 * UPSERTS user_levels row, adding XP and recalculating level.
 * Returns the new total XP, or null on error.
 */
export async function awardXP(
  userId: string,
  action: XPAction
): Promise<number | null> {
  const supabase = createAdminClient();
  const xpToAdd = XP_VALUES[action];

  // Get current user level record
  const { data: existing } = await supabase
    .from("user_levels")
    .select("id, xp, level")
    .eq("user_id", userId)
    .single();

  const currentXp = existing?.xp ?? 0;
  const newXp = currentXp + xpToAdd;
  const newLevel = calculateLevel(newXp);

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("user_levels")
      .update({
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update user XP:", error);
      return null;
    }
  } else {
    // Insert new record
    const { error } = await supabase.from("user_levels").insert({
      user_id: userId,
      xp: newXp,
      level: newLevel,
    });

    if (error) {
      console.error("Failed to insert user XP:", error);
      return null;
    }
  }

  return newXp;
}
