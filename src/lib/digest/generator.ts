import type { SupabaseClient } from "@supabase/supabase-js";

interface UserSubmissionCount {
  user_id: string;
  user_name: string;
  count: number;
}

interface RankingEntry {
  user_id: string;
  user_name: string;
  value: number;
}

/**
 * Generate the weekly digest ("週刊STEP") for a tenant.
 * Aggregates submission stats, rankings, MVP, badges, and checkin recommendations.
 */
export async function generateWeeklyDigest(
  supabase: SupabaseClient,
  tenantId: string,
  weekStart: string
): Promise<void> {
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const weekStartStr = weekStartDate.toISOString().split("T")[0];
  const weekEndStr = weekEndDate.toISOString().split("T")[0];

  // ── 1. Report submissions this week ──
  const { data: entries } = await supabase
    .from("report_entries")
    .select("id, user_id, template_id, data, status, submitted_at")
    .eq("tenant_id", tenantId)
    .eq("status", "submitted")
    .gte("report_date", weekStartStr)
    .lte("report_date", weekEndStr)
    .limit(10000);

  const reportEntries = entries ?? [];

  // ── 2. Get tenant users for name lookups ──
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .limit(5000);

  const users = usersData ?? [];
  const userNameMap = new Map(users.map((u) => [u.id, u.name as string]));

  // ── 3. Submission counts per user ──
  const submissionMap = new Map<string, number>();
  for (const entry of reportEntries) {
    submissionMap.set(
      entry.user_id,
      (submissionMap.get(entry.user_id) ?? 0) + 1
    );
  }

  const topSubmitters: UserSubmissionCount[] = Array.from(submissionMap.entries())
    .map(([userId, count]) => ({
      user_id: userId,
      user_name: userNameMap.get(userId) ?? "Unknown",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── 4. Top reaction receivers ──
  const entryIds = reportEntries.map((e) => e.id);
  let topReactionReceivers: RankingEntry[] = [];

  if (entryIds.length > 0) {
    const { data: reactions } = await supabase
      .from("reactions")
      .select("entry_id")
      .in("entry_id", entryIds)
      .limit(10000);

    if (reactions && reactions.length > 0) {
      // Map entry_id -> user_id
      const entryUserMap = new Map(
        reportEntries.map((e) => [e.id, e.user_id])
      );
      const reactionCountMap = new Map<string, number>();

      for (const r of reactions) {
        const userId = entryUserMap.get(r.entry_id);
        if (userId) {
          reactionCountMap.set(
            userId,
            (reactionCountMap.get(userId) ?? 0) + 1
          );
        }
      }

      topReactionReceivers = Array.from(reactionCountMap.entries())
        .map(([userId, value]) => ({
          user_id: userId,
          user_name: userNameMap.get(userId) ?? "Unknown",
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }
  }

  // ── 5. Top XP earners ──
  const { data: levelData } = await supabase
    .from("user_levels")
    .select("user_id, xp")
    .in(
      "user_id",
      users.map((u) => u.id)
    )
    .order("xp", { ascending: false })
    .limit(5);

  const topXpEarners: RankingEntry[] = (levelData ?? []).map((l) => ({
    user_id: l.user_id,
    user_name: userNameMap.get(l.user_id) ?? "Unknown",
    value: l.xp as number,
  }));

  // ── 6. MVP calculation ──
  // Number MVP: highest KPI sum from report data (sum numeric fields)
  let numberMvp: RankingEntry | null = null;
  const kpiSumMap = new Map<string, number>();

  for (const entry of reportEntries) {
    const data = entry.data as Record<string, unknown>;
    let sum = 0;
    for (const value of Object.values(data)) {
      if (typeof value === "number") {
        sum += value;
      }
    }
    kpiSumMap.set(entry.user_id, (kpiSumMap.get(entry.user_id) ?? 0) + sum);
  }

  if (kpiSumMap.size > 0) {
    const topKpi = Array.from(kpiSumMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    numberMvp = {
      user_id: topKpi[0],
      user_name: userNameMap.get(topKpi[0]) ?? "Unknown",
      value: topKpi[1],
    };
  }

  // Process MVP: most XP this week (approximate via top XP earner)
  const processMvp = topXpEarners.length > 0 ? topXpEarners[0] : null;

  // ── 7. Badges earned this week ──
  const { data: badgesData } = await supabase
    .from("user_badges")
    .select("user_id, badge_id, earned_at")
    .in(
      "user_id",
      users.map((u) => u.id)
    )
    .gte("earned_at", weekStartStr)
    .lte("earned_at", weekEndStr + "T23:59:59Z");

  const badgesEarned = (badgesData ?? []).map((b) => ({
    user_id: b.user_id,
    user_name: userNameMap.get(b.user_id) ?? "Unknown",
    badge_id: b.badge_id,
    earned_at: b.earned_at,
  }));

  // ── 8. Checkin recommendations ──
  // Fetch checkin template entries for the week
  const { data: checkinTemplates } = await supabase
    .from("report_templates")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", "checkin");

  let recommendations: Record<string, unknown>[] = [];

  if (checkinTemplates && checkinTemplates.length > 0) {
    const checkinTemplateIds = checkinTemplates.map((t) => t.id);
    const checkinEntries = reportEntries.filter((e) =>
      checkinTemplateIds.includes(e.template_id)
    );

    recommendations = checkinEntries.map((e) => ({
      user_id: e.user_id,
      user_name: userNameMap.get(e.user_id) ?? "Unknown",
      data: e.data,
      submitted_at: e.submitted_at,
    }));
  }

  // ── 9. Aggregate stats ──
  const stats = {
    total_submissions: reportEntries.length,
    unique_submitters: new Set(reportEntries.map((e) => e.user_id)).size,
    total_users: users.length,
    submission_rate:
      users.length > 0
        ? Math.round(
            (new Set(reportEntries.map((e) => e.user_id)).size / users.length) *
              100
          )
        : 0,
  };

  // ── 10. Upsert digest ──
  const digest = {
    tenant_id: tenantId,
    week_start: weekStartStr,
    rankings: {
      top_submitters: topSubmitters,
      top_reaction_receivers: topReactionReceivers,
      top_xp_earners: topXpEarners,
    },
    mvp: {
      number_mvp: numberMvp,
      process_mvp: processMvp,
    },
    stats,
    badges_earned: badgesEarned,
    recommendations,
  };

  const { error } = await supabase.from("weekly_digests").upsert(digest, {
    onConflict: "tenant_id,week_start",
  });

  if (error) {
    console.error(
      `Failed to upsert weekly digest for tenant ${tenantId}:`,
      error
    );
    throw error;
  }
}
