import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { User } from "@/types/database";
import { DashboardClient } from "./DashboardClient";

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

function getNextLevelXP(level: number): number {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const user = dbUser as User;
  const role = user.role;
  const tenantId = user.tenant_id;
  const currentTime = new Date();
  const today = currentTime.toISOString().split("T")[0];
  const nowMs = currentTime.getTime();

  // ── Member Stats (always fetched) ──
  // Parallel fetch: streak entries, user level, badges, weekly KPIs
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const [recentEntriesResult, userLevelResult, userBadgesResult] =
    await Promise.all([
      // Single query for both today-check and streak calculation
      supabase
        .from("report_entries")
        .select("report_date")
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .order("report_date", { ascending: false })
        .limit(60),
      supabase
        .from("user_levels")
        .select("level, xp")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_badges")
        .select("earned_at, badge_id")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false })
        .limit(5),
    ]);

  const recentEntries = recentEntriesResult.data;
  const submittedToday =
    recentEntries != null &&
    recentEntries.length > 0 &&
    recentEntries[0].report_date === today;

  // Calculate streak from the same result set
  let streak = 0;
  if (recentEntries && recentEntries.length > 0) {
    const dates = new Set(recentEntries.map((e) => e.report_date));
    const checkDate = new Date();
    if (!submittedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      if (dates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const level = userLevelResult.data?.level ?? 1;
  const xp = userLevelResult.data?.xp ?? 0;

  // Resolve badge details
  const userBadges = userBadgesResult.data;
  let recentBadges: { name: string; icon: string; earnedAt: string }[] = [];
  if (userBadges && userBadges.length > 0) {
    const badgeIds = userBadges.map((ub) => ub.badge_id);
    const { data: badges } = await supabase
      .from("badges")
      .select("id, name, icon")
      .in("id", badgeIds);

    if (badges) {
      const badgeMap = new Map(badges.map((b) => [b.id, b]));
      recentBadges = userBadges
        .map((ub) => {
          const badge = badgeMap.get(ub.badge_id);
          if (!badge) return null;
          return {
            name: badge.name,
            icon: badge.icon,
            earnedAt: ub.earned_at,
          };
        })
        .filter(Boolean) as typeof recentBadges;
    }
  }

  // ── Goals with Progress ──
  // Fetch active goals relevant to this user (individual goals owned by user,
  // team goals for user's teams, or company/department goals)
  const { data: userTeamMemberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  const userTeamIds = (userTeamMemberships ?? []).map((m) => m.team_id);

  // Build goal query: individual goals owned by user OR team goals for user's teams
  let goalsQuery = supabase
    .from("goals")
    .select("id, name, target_value, kpi_field_key, template_id, period_start, period_end, level, owner_id, team_id")
    .eq("tenant_id", tenantId)
    .lte("period_start", today)
    .gte("period_end", today)
    .order("level", { ascending: false }); // individual first

  const { data: allActiveGoals } = await goalsQuery;

  // Filter to goals relevant to this user
  const relevantGoals = (allActiveGoals ?? []).filter((g) => {
    if (g.level === "individual" && g.owner_id === user.id) return true;
    if (g.level === "team" && g.team_id && userTeamIds.includes(g.team_id)) return true;
    if (g.level === "company" || g.level === "department") return true;
    return false;
  }).slice(0, 6);

  // Fetch latest snapshots for these goals
  const goalIds = relevantGoals.map((g) => g.id);
  const { data: snapshotsData } = goalIds.length > 0
    ? await supabase
        .from("goal_snapshots")
        .select("goal_id, actual_value, progress_rate, snapshot_date")
        .in("goal_id", goalIds)
        .order("snapshot_date", { ascending: false })
    : { data: [] as { goal_id: string; actual_value: number; progress_rate: number; snapshot_date: string }[] };

  const latestSnapshots = new Map<string, { actual: number; rate: number }>();
  for (const snap of snapshotsData ?? []) {
    if (!latestSnapshots.has(snap.goal_id)) {
      latestSnapshots.set(snap.goal_id, {
        actual: Number(snap.actual_value),
        rate: Number(snap.progress_rate),
      });
    }
  }

  // Also calculate this week's contribution for goals with kpi_field_key
  const goalsWithKPI = relevantGoals.filter((g) => g.kpi_field_key && g.template_id);
  let weeklyContributions = new Map<string, number>();

  if (goalsWithKPI.length > 0) {
    // Fetch this week's report entries for this user
    const { data: weekEntries } = await supabase
      .from("report_entries")
      .select("data, template_id")
      .eq("user_id", user.id)
      .eq("status", "submitted")
      .gte("report_date", weekStartStr);

    if (weekEntries) {
      for (const goal of goalsWithKPI) {
        let weekSum = 0;
        for (const entry of weekEntries) {
          if (entry.template_id === goal.template_id) {
            const val = Number((entry.data as Record<string, unknown>)[goal.kpi_field_key!]);
            if (!isNaN(val)) weekSum += val;
          }
        }
        weeklyContributions.set(goal.id, weekSum);
      }
    }
  }

  const levelLabels: Record<string, string> = {
    company: "全社",
    department: "部門",
    team: "チーム",
    individual: "個人",
  };

  const goalsProgress = relevantGoals.map((g) => {
    const snapshot = latestSnapshots.get(g.id);
    const target = Number(g.target_value);
    const actual = snapshot?.actual ?? 0;
    const rate = snapshot?.rate ?? 0;

    // Calculate expected progress based on elapsed time
    const start = new Date(g.period_start).getTime();
    const end = new Date(g.period_end).getTime();
    const elapsed = Math.max(0, Math.min(1, (nowMs - start) / (end - start)));
    const expectedRate = Math.round(elapsed * 100);

    return {
      id: g.id,
      name: g.name,
      level: levelLabels[g.level] ?? g.level,
      target,
      actual,
      rate: Math.round(rate),
      expectedRate,
      weeklyContribution: weeklyContributions.get(g.id) ?? null,
      isOnTrack: rate >= expectedRate - 5,
    };
  });

  // ── Peer Bonus Stats ──
  const [receivedBonusesResult, sentTodayResult, totalReceivedResult] = await Promise.all([
    supabase
      .from("peer_bonuses")
      .select("id, from_user_id, message, bonus_date")
      .eq("to_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("peer_bonuses")
      .select("id")
      .eq("from_user_id", user.id)
      .eq("bonus_date", today)
      .single(),
    supabase
      .from("peer_bonuses")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id),
  ]);

  // Resolve sender names for received bonuses
  const receivedBonuses: { fromName: string; message: string; date: string }[] = [];
  const bonusData = receivedBonusesResult.data ?? [];
  if (bonusData.length > 0) {
    const senderIds = [...new Set(bonusData.map((b) => b.from_user_id))];
    const { data: senders } = await supabase
      .from("users")
      .select("id, name")
      .in("id", senderIds);
    const senderMap = new Map((senders ?? []).map((s) => [s.id, s.name]));

    for (const bonus of bonusData) {
      receivedBonuses.push({
        fromName: senderMap.get(bonus.from_user_id) ?? "不明",
        message: bonus.message,
        date: bonus.bonus_date,
      });
    }
  }

  // ── Pending Review Check ──
  const { data: pendingReviewPlan } = await supabase
    .from("weekly_plans")
    .select("id, week_start, execution_rate")
    .eq("user_id", user.id)
    .eq("status", "review_pending")
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  const pendingReview = pendingReviewPlan
    ? {
        planId: pendingReviewPlan.id,
        weekStart: pendingReviewPlan.week_start,
        executionRate: pendingReviewPlan.execution_rate as number | null,
      }
    : null;

  const memberStats = {
    submittedToday,
    streak,
    level,
    xp,
    xpForNextLevel: getNextLevelXP(level),
    goalsProgress,
    recentBadges,
    pendingReview,
    peerBonus: {
      totalReceived: totalReceivedResult.count ?? 0,
      sentToday: !!sentTodayResult.data,
      recentReceived: receivedBonuses,
    },
  };

  // ── Manager Stats ──
  let managerStats = undefined;
  if (role === "manager" || role === "admin" || role === "super_admin") {
    // Get teams managed by this user
    const { data: managedTeams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("manager_id", user.id);

    const teamIds = managedTeams?.map((t) => t.id) ?? [];

    let teamMembers: { id: string; name: string; submitted: boolean }[] = [];

    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", teamIds);

      const memberIds = [...new Set(members?.map((m) => m.user_id) ?? [])];

      if (memberIds.length > 0) {
        // Parallel: fetch member details and today's submissions
        const [memberUsersResult, todaySubmissionsResult] = await Promise.all([
          supabase.from("users").select("id, name").in("id", memberIds),
          supabase
            .from("report_entries")
            .select("user_id")
            .in("user_id", memberIds)
            .eq("report_date", today)
            .eq("status", "submitted"),
        ]);

        const submittedIds = new Set(
          todaySubmissionsResult.data?.map((s) => s.user_id) ?? []
        );

        teamMembers = (memberUsersResult.data ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          submitted: submittedIds.has(u.id),
        }));
      }
    }

    // For admin, show all tenant members if no managed teams
    if (
      (role === "admin" || role === "super_admin") &&
      teamMembers.length === 0
    ) {
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .neq("id", user.id);

      const allUserIds = allUsers?.map((u) => u.id) ?? [];

      if (allUserIds.length > 0) {
        const { data: todaySubmissions } = await supabase
          .from("report_entries")
          .select("user_id")
          .in("user_id", allUserIds)
          .eq("report_date", today)
          .eq("status", "submitted");

        const submittedIds = new Set(
          todaySubmissions?.map((s) => s.user_id) ?? []
        );

        teamMembers = (allUsers ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          submitted: submittedIds.has(u.id),
        }));
      }
    }

    const submittedCount = teamMembers.filter((m) => m.submitted).length;
    const todayRate =
      teamMembers.length > 0
        ? Math.round((submittedCount / teamMembers.length) * 100)
        : 0;

    // Weekly trends (last 4 weeks) - parallel count queries
    const weekRanges = [3, 2, 1, 0].map((w) => {
      const wStart = new Date();
      wStart.setDate(wStart.getDate() - wStart.getDay() + 1 - w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 4); // Mon-Fri
      return {
        label: `${wStart.getMonth() + 1}/${wStart.getDate()}`,
        start: wStart.toISOString().split("T")[0],
        end: wEnd.toISOString().split("T")[0],
      };
    });

    const [weekCountResults, nudgesResult] = await Promise.all([
      Promise.all(
        weekRanges.map((wr) =>
          supabase
            .from("report_entries")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("status", "submitted")
            .gte("report_date", wr.start)
            .lte("report_date", wr.end)
        )
      ),
      supabase
        .from("nudges")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "pending"),
    ]);

    const expected = Math.max(1, teamMembers.length * 5);
    const weeklyTrends = weekRanges.map((wr, i) => ({
      week: wr.label,
      rate: Math.min(
        100,
        Math.round(((weekCountResults[i].count ?? 0) / expected) * 100)
      ),
    }));

    const pendingNudges = nudgesResult.count;

    managerStats = {
      todaySubmissionRate: todayRate,
      weekSubmissionRate:
        weeklyTrends.length > 0
          ? weeklyTrends[weeklyTrends.length - 1].rate
          : 0,
      teamMembers,
      weeklyTrends,
      pendingNudges: pendingNudges ?? 0,
    };
  }

  // ── Admin Stats ──
  let adminStats = undefined;
  if (role === "admin" || role === "super_admin") {
    // Parallel: totalUsers, todaySubmitted, activeDeals, teams overview
    const [
      totalUsersResult,
      todaySubmittedResult,
      activeDealsResult_admin,
      teamsResult,
      todayEntriesResult,
    ] = await Promise.all([
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabase
        .from("report_entries")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("report_date", today)
        .eq("status", "submitted"),
      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("teams")
        .select("id, name")
        .eq("tenant_id", tenantId),
      supabase
        .from("report_entries")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("report_date", today)
        .eq("status", "submitted"),
    ]);

    const totalUsers = totalUsersResult.count;
    const todaySubmitted = todaySubmittedResult.count;
    const activeDeals = activeDealsResult_admin.count;
    const submissionRate =
      (totalUsers ?? 0) > 0
        ? Math.round(((todaySubmitted ?? 0) / (totalUsers ?? 1)) * 100)
        : 0;

    const allTeams = teamsResult.data ?? [];
    const teamIdsForAdmin = allTeams.map((t) => t.id);

    // Fetch team_members filtered by tenant's teams
    const { data: allMembersData } = teamIdsForAdmin.length > 0
      ? await supabase
          .from("team_members")
          .select("team_id, user_id")
          .in("team_id", teamIdsForAdmin)
      : { data: [] as { team_id: string; user_id: string }[] };

    const allMembers = allMembersData ?? [];
    const todayEntries = new Set(
      (todayEntriesResult.data ?? []).map((e) => e.user_id)
    );

    const teamsOverview = allTeams.map((team) => {
      const members = allMembers.filter((m) => m.team_id === team.id);
      const submitted = members.filter((m) => todayEntries.has(m.user_id)).length;
      return {
        name: team.name,
        memberCount: members.length,
        submissionRate:
          members.length > 0 ? Math.round((submitted / members.length) * 100) : 0,
      };
    });

    // Deviation alerts — fetch goals first, then snapshots filtered by goal IDs
    const { data: goalsData } = await supabase
      .from("goals")
      .select("id, name, target_value, period_start, period_end, owner_id")
      .eq("tenant_id", tenantId);

    const goals = goalsData ?? [];
    const goalIds = goals.map((g) => g.id);

    // ownerUsersResult already fetched above (skip duplicate), reuse existing data
    // Fetch snapshots only for this tenant's goals
    const { data: snapshotsData } = goalIds.length > 0
      ? await supabase
          .from("goal_snapshots")
          .select("goal_id, progress_rate, snapshot_date")
          .in("goal_id", goalIds)
          .order("snapshot_date", { ascending: false })
      : { data: [] as { goal_id: string; progress_rate: number; snapshot_date: string }[] };

    const { data: ownerUsersData } = await supabase
      .from("users")
      .select("id, name")
      .eq("tenant_id", tenantId);

    const ownerMap = new Map(
      (ownerUsersData ?? []).map((u) => [u.id, u.name])
    );

    // Get latest snapshot per goal
    const latestSnapshotMap = new Map<string, number>();
    for (const snap of snapshotsData ?? []) {
      if (!latestSnapshotMap.has(snap.goal_id)) {
        latestSnapshotMap.set(snap.goal_id, Number(snap.progress_rate));
      }
    }

    const deviationAlerts: {
      goalName: string;
      deviation: number;
      ownerName: string;
    }[] = [];

    for (const goal of goals) {
      const actualRate = latestSnapshotMap.get(goal.id);
      if (actualRate === undefined) continue;

      const start = new Date(goal.period_start).getTime();
      const end = new Date(goal.period_end).getTime();
      const elapsed = Math.max(0, Math.min(1, (nowMs - start) / (end - start)));
      const expectedRate = Math.round(elapsed * 100);
      const deviation = expectedRate - actualRate;

      if (deviation >= 5) {
        deviationAlerts.push({
          goalName: goal.name,
          deviation: Math.round(deviation),
          ownerName: goal.owner_id
            ? ownerMap.get(goal.owner_id) ?? "不明"
            : "未割当",
        });
      }
    }

    // Funnel stages — single batch query
    const [stagesResult, activeDealsResult] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, sort_order")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("deals")
        .select("stage_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
    ]);

    const dealCountByStage = new Map<string, number>();
    for (const d of activeDealsResult.data ?? []) {
      dealCountByStage.set(d.stage_id, (dealCountByStage.get(d.stage_id) ?? 0) + 1);
    }

    const funnelStages = (stagesResult.data ?? []).map((ps) => ({
      name: ps.name,
      count: dealCountByStage.get(ps.id) ?? 0,
    }));

    adminStats = {
      totalUsers: totalUsers ?? 0,
      submissionRate,
      activeDeals: activeDeals ?? 0,
      teamsOverview,
      deviationAlerts,
      funnelStages,
    };
  }

  // ── Approval Stats (for managers) ──
  let approvalStats = undefined;
  if (role === "manager" || role === "admin" || role === "super_admin") {
    const [pendingPlansResult, pendingDealsResult] = await Promise.all([
      supabase
        .from("weekly_plans")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "submitted"),
      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "submitted" as string),
    ]);

    approvalStats = {
      pendingPlans: pendingPlansResult.count ?? 0,
      pendingDeals: pendingDealsResult.count ?? 0,
    };
  }

  return (
    <DashboardClient
      user={user}
      role={role}
      memberStats={memberStats}
      managerStats={managerStats}
      adminStats={adminStats}
      approvalStats={approvalStats}
    />
  );
}
