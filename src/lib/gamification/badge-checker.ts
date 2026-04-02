import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedBadgeDefinitions } from "@/lib/cache";

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  condition: BadgeCondition;
  rarity: string;
}

type BadgeCondition =
  | { type: "first_report" }
  | { type: "streak"; days: number }
  | { type: "monthly_goal" }
  | { type: "first_knowledge" }
  | { type: "reaction_count"; count: number }
  | { type: "all_reactions" }
  | { type: "quarterly_mvp" };

interface EarnedBadge {
  badge: Badge;
  earned_at: string;
}

/**
 * Check all badge conditions for a user and award any newly earned badges.
 * Returns the list of newly earned badges.
 */
export async function checkBadges(userId: string): Promise<EarnedBadge[]> {
  const supabase = createAdminClient();

  // Fetch all badges (cross-request cached)
  const allBadges = await getCachedBadgeDefinitions();
  if (!allBadges || allBadges.length === 0) return [];

  // Fetch already earned badges
  const { data: earnedBadgeRows } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedBadgeIds = new Set(
    (earnedBadgeRows ?? []).map((r: { badge_id: string }) => r.badge_id)
  );

  // Filter to unearned badges
  const unearnedBadges = (allBadges as Badge[]).filter(
    (b) => !earnedBadgeIds.has(b.id)
  );

  if (unearnedBadges.length === 0) return [];

  // Gather user stats
  const stats = await getUserStats(supabase, userId);

  const newlyEarned: EarnedBadge[] = [];

  for (const badge of unearnedBadges) {
    const condition = badge.condition as BadgeCondition;
    let earned = false;

    switch (condition.type) {
      case "first_report":
        earned = stats.reportCount >= 1;
        break;

      case "streak":
        earned = stats.currentStreak >= condition.days;
        break;

      case "monthly_goal":
        earned = stats.monthlyGoalAchieved;
        break;

      case "first_knowledge":
        earned = stats.knowledgeCount >= 1;
        break;

      case "reaction_count":
        earned = stats.reactionsSentCount >= condition.count;
        break;

      case "all_reactions":
        earned = stats.hasAllReactionTypes;
        break;

      case "quarterly_mvp":
        // Quarterly MVP is awarded externally (by admin action)
        // Cannot be auto-checked here
        earned = false;
        break;
    }

    if (earned) {
      const { error } = await supabase.from("user_badges").insert({
        user_id: userId,
        badge_id: badge.id,
      });

      if (!error) {
        newlyEarned.push({
          badge,
          earned_at: new Date().toISOString(),
        });
      }
    }
  }

  return newlyEarned;
}

interface UserStats {
  reportCount: number;
  currentStreak: number;
  monthlyGoalAchieved: boolean;
  knowledgeCount: number;
  reactionsSentCount: number;
  hasAllReactionTypes: boolean;
}

async function getUserStats(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<UserStats> {
  // Count submitted reports
  const { count: reportCount } = await supabase
    .from("report_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "submitted");

  // Calculate current streak (consecutive days with a submitted report)
  const { data: recentReports } = await supabase
    .from("report_entries")
    .select("report_date")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("report_date", { ascending: false })
    .limit(200);

  let currentStreak = 0;
  if (recentReports && recentReports.length > 0) {
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    today.setHours(0, 0, 0, 0);

    const reportDates = new Set(
      recentReports.map((r: { report_date: string }) => r.report_date)
    );

    // Count backwards from today (or yesterday if no report today)
    const checkDate = new Date(today);
    // If no report today, start from yesterday
    const todayStr = checkDate.toISOString().split("T")[0];
    if (!reportDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (reportDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Count reactions sent by this user
  const { count: reactionsSentCount } = await supabase
    .from("reactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Check if user has sent all reaction types
  const { data: reactionTypes } = await supabase
    .from("reactions")
    .select("type")
    .eq("user_id", userId);

  const uniqueTypes = new Set(
    (reactionTypes ?? []).map((r: { type: string }) => r.type)
  );
  const allTypes = ["like", "fire", "clap", "heart", "eyes"];
  const hasAllReactionTypes = allTypes.every((t) => uniqueTypes.has(t));

  // Knowledge count - placeholder (knowledge table TBD in later phases)
  // For now, return 0
  const knowledgeCount = 0;

  // Monthly goal achieved - placeholder (goals table TBD in Phase 4)
  const monthlyGoalAchieved = false;

  return {
    reportCount: reportCount ?? 0,
    currentStreak,
    monthlyGoalAchieved,
    knowledgeCount,
    reactionsSentCount: reactionsSentCount ?? 0,
    hasAllReactionTypes,
  };
}
