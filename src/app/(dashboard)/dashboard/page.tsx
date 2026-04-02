import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import type { User } from "@/types/database";
import { MemberDashboard } from "./MemberDashboard";
import type { MemberStats, ManagerStats, AdminStats, ApprovalStats } from "./types";

const ManagerDashboard = dynamic(
  () => import("./ManagerDashboard").then((m) => ({ default: m.ManagerDashboard })),
  { ssr: true }
);

const AdminDashboard = dynamic(
  () => import("./AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
  { ssr: true }
);

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

function getNextLevelXP(level: number): number {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

function calculateStreak(entries: { report_date: string }[]): number {
  if (entries.length === 0) return 0;
  const today = new Date().toISOString().split("T")[0];
  const dates = new Set(entries.map((e) => e.report_date));
  const submittedToday = entries[0].report_date === today;
  const checkDate = new Date();
  if (!submittedToday) checkDate.setDate(checkDate.getDate() - 1);
  let streak = 0;
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
  return streak;
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
    .select("id, name, email, role, tenant_id, avatar_url")
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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // ── Batch 1: All independent queries in parallel ──
  const [
    recentEntriesResult,
    userLevelResult,
    userBadgesResult,
    teamMembershipsResult,
    activeGoalsResult,
    receivedBonusesResult,
    sentTodayResult,
    totalReceivedResult,
    pendingReviewResult,
  ] = await Promise.all([
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
    supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("id, name, target_value, kpi_field_key, template_id, period_start, period_end, level, owner_id, team_id")
      .eq("tenant_id", tenantId)
      .lte("period_start", today)
      .gte("period_end", today)
      .order("level", { ascending: false }),
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
    supabase
      .from("weekly_plans")
      .select("id, week_start, execution_rate")
      .eq("user_id", user.id)
      .eq("status", "review_pending")
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),
  ]);

  // ── Process streak & today check ──
  const recentEntries = recentEntriesResult.data ?? [];
  const submittedToday =
    recentEntries.length > 0 && recentEntries[0].report_date === today;
  const streak = calculateStreak(recentEntries);
  const level = userLevelResult.data?.level ?? 1;
  const xp = userLevelResult.data?.xp ?? 0;

  // ── Batch 2: Dependent queries (badges, goals, bonus senders) in parallel ──
  const userBadges = userBadgesResult.data;
  const badgeIds = userBadges?.map((ub) => ub.badge_id) ?? [];
  const userTeamIds = (teamMembershipsResult.data ?? []).map((m) => m.team_id);

  const relevantGoals = (activeGoalsResult.data ?? []).filter((g) => {
    if (g.level === "individual" && g.owner_id === user.id) return true;
    if (g.level === "team" && g.team_id && userTeamIds.includes(g.team_id)) return true;
    if (g.level === "company" || g.level === "department") return true;
    return false;
  }).slice(0, 6);

  const goalIds = relevantGoals.map((g) => g.id);
  const goalsWithKPI = relevantGoals.filter((g) => g.kpi_field_key && g.template_id);
  const bonusData = receivedBonusesResult.data ?? [];
  const senderIds = bonusData.length > 0
    ? [...new Set(bonusData.map((b) => b.from_user_id))]
    : [];

  const [badgesResult, snapshotsResult, weekEntriesResult, sendersResult] = await Promise.all([
    badgeIds.length > 0
      ? supabase.from("badges").select("id, name, icon").in("id", badgeIds)
      : Promise.resolve({ data: [] as { id: string; name: string; icon: string }[] }),
    goalIds.length > 0
      ? supabase
          .from("goal_snapshots")
          .select("goal_id, actual_value, progress_rate, snapshot_date")
          .in("goal_id", goalIds)
          .order("snapshot_date", { ascending: false })
      : Promise.resolve({ data: [] as { goal_id: string; actual_value: number; progress_rate: number; snapshot_date: string }[] }),
    goalsWithKPI.length > 0
      ? supabase
          .from("report_entries")
          .select("data, template_id")
          .eq("user_id", user.id)
          .eq("status", "submitted")
          .gte("report_date", weekStartStr)
      : Promise.resolve({ data: [] as { data: unknown; template_id: string }[] }),
    senderIds.length > 0
      ? supabase.from("users").select("id, name").in("id", senderIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  // ── Resolve badges ──
  let recentBadges: { name: string; icon: string; earnedAt: string }[] = [];
  if (userBadges && badgesResult.data) {
    const badgeMap = new Map((badgesResult.data).map((b) => [b.id, b]));
    recentBadges = userBadges
      .map((ub) => {
        const badge = badgeMap.get(ub.badge_id);
        if (!badge) return null;
        return { name: badge.name, icon: badge.icon, earnedAt: ub.earned_at };
      })
      .filter(Boolean) as typeof recentBadges;
  }

  // ── Resolve goal progress ──
  const latestSnapshots = new Map<string, { actual: number; rate: number }>();
  for (const snap of snapshotsResult.data ?? []) {
    if (!latestSnapshots.has(snap.goal_id)) {
      latestSnapshots.set(snap.goal_id, {
        actual: Number(snap.actual_value),
        rate: Number(snap.progress_rate),
      });
    }
  }

  const weeklyContributions = new Map<string, number>();
  if (weekEntriesResult.data) {
    for (const goal of goalsWithKPI) {
      let weekSum = 0;
      for (const entry of weekEntriesResult.data) {
        if (entry.template_id === goal.template_id) {
          const val = Number((entry.data as Record<string, unknown>)[goal.kpi_field_key!]);
          if (!isNaN(val)) weekSum += val;
        }
      }
      weeklyContributions.set(goal.id, weekSum);
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

  // ── Resolve peer bonuses ──
  const senderMap = new Map((sendersResult.data ?? []).map((s) => [s.id, s.name]));
  const receivedBonuses = bonusData.map((bonus) => ({
    fromName: senderMap.get(bonus.from_user_id) ?? "不明",
    message: bonus.message,
    date: bonus.bonus_date,
  }));
  const todayReceivedBonuses = receivedBonuses.filter((b) => b.date === today);

  const pendingReviewPlan = pendingReviewResult.data;
  const pendingReview = pendingReviewPlan
    ? {
        planId: pendingReviewPlan.id,
        weekStart: pendingReviewPlan.week_start,
        executionRate: pendingReviewPlan.execution_rate as number | null,
      }
    : null;

  const memberStats: MemberStats = {
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
    todayReceivedBonuses,
  };

  // ── Member role: render MemberDashboard directly ──
  if (role === "member") {
    return (
      <MemberDashboard
        user={user}
        role={role}
        memberStats={memberStats}
      />
    );
  }

  // ── Manager + Admin + Approval Stats (fetched in parallel) ──
  const isAdmin = role === "admin" || role === "super_admin";

  // Manager base queries + admin queries in a single parallel batch
  const [managedTeamsResult, nudgesResult] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("manager_id", user.id),
    supabase
      .from("nudges")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending"),
  ]);

  // Admin-specific queries in parallel (only executed for admin role)
  const adminResults = isAdmin
    ? await Promise.all([
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
        supabase
          .from("goals")
          .select("id, name, target_value, period_start, period_end, owner_id")
          .eq("tenant_id", tenantId),
        supabase
          .from("users")
          .select("id, name")
          .eq("tenant_id", tenantId),
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
      ])
    : null;

  // ── Build Manager Stats ──
  const managedTeams = managedTeamsResult.data ?? [];
  const teamIds = managedTeams.map((t) => t.id);

  let teamMembers: { id: string; name: string; submitted: boolean }[] = [];

  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .in("team_id", teamIds);

    const memberIds = [...new Set(members?.map((m) => m.user_id) ?? [])];

    if (memberIds.length > 0) {
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
  if (isAdmin && teamMembers.length === 0) {
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

  // Weekly trends + approval stats in parallel
  const weekRanges = [3, 2, 1, 0].map((w) => {
    const wStart = new Date();
    wStart.setDate(wStart.getDate() - wStart.getDay() + 1 - w * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 4);
    return {
      label: `${wStart.getMonth() + 1}/${wStart.getDate()}`,
      start: wStart.toISOString().split("T")[0],
      end: wEnd.toISOString().split("T")[0],
    };
  });

  const [weekCountResults, pendingPlansResult, pendingDealsResult] = await Promise.all([
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

  const expected = Math.max(1, teamMembers.length * 5);
  const weeklyTrends = weekRanges.map((wr, i) => ({
    week: wr.label,
    rate: Math.min(
      100,
      Math.round(((weekCountResults[i].count ?? 0) / expected) * 100)
    ),
  }));

  const managerStats: ManagerStats = {
    todaySubmissionRate: todayRate,
    weekSubmissionRate:
      weeklyTrends.length > 0
        ? weeklyTrends[weeklyTrends.length - 1].rate
        : 0,
    teamMembers,
    weeklyTrends,
    pendingNudges: nudgesResult.count ?? 0,
  };

  const approvalStats: ApprovalStats = {
    pendingPlans: pendingPlansResult.count ?? 0,
    pendingDeals: pendingDealsResult.count ?? 0,
  };

  // ── Manager role: render ManagerDashboard ──
  if (role === "manager") {
    return (
      <ManagerDashboard
        user={user}
        role={role}
        memberStats={memberStats}
        managerStats={managerStats}
        approvalStats={approvalStats}
      />
    );
  }

  // ── Admin / Super Admin: Build admin stats ──
  let adminStats: AdminStats | undefined;

  if (isAdmin && adminResults) {
    const [
      totalUsersRes, todaySubmittedRes, activeDealsRes,
      teamsRes, todayEntriesRes, allGoalsRes,
      ownerUsersRes, stagesRes, activeDealsStageRes,
    ] = adminResults;

    const totalUsers = totalUsersRes.count;
    const todaySubmitted = todaySubmittedRes.count;
    const activeDeals = activeDealsRes.count;
    const submissionRate =
      (totalUsers ?? 0) > 0
        ? Math.round(((todaySubmitted ?? 0) / (totalUsers ?? 1)) * 100)
        : 0;

    const allTeams = teamsRes.data ?? [];
    const teamIdsForAdmin = allTeams.map((t) => t.id);

    const { data: allMembersData } = teamIdsForAdmin.length > 0
      ? await supabase
          .from("team_members")
          .select("team_id, user_id")
          .in("team_id", teamIdsForAdmin)
      : { data: [] as { team_id: string; user_id: string }[] };

    const allMembers = allMembersData ?? [];
    const todayEntries = new Set(
      (todayEntriesRes.data ?? []).map((e) => e.user_id)
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

    // Deviation alerts — snapshots for all goals
    const goals = allGoalsRes.data ?? [];
    const adminGoalIds = goals.map((g) => g.id);

    const { data: adminSnapshotsData } = adminGoalIds.length > 0
      ? await supabase
          .from("goal_snapshots")
          .select("goal_id, progress_rate, snapshot_date")
          .in("goal_id", adminGoalIds)
          .order("snapshot_date", { ascending: false })
      : { data: [] as { goal_id: string; progress_rate: number; snapshot_date: string }[] };

    const ownerMap = new Map(
      (ownerUsersRes.data ?? []).map((u) => [u.id, u.name])
    );

    const latestSnapshotMap = new Map<string, number>();
    for (const snap of adminSnapshotsData ?? []) {
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

    const dealCountByStage = new Map<string, number>();
    for (const d of activeDealsStageRes.data ?? []) {
      dealCountByStage.set(d.stage_id, (dealCountByStage.get(d.stage_id) ?? 0) + 1);
    }

    const funnelStages = (stagesRes.data ?? []).map((ps) => ({
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

  // ── Admin / Super Admin: render AdminDashboard ──
  if (adminStats) {
    return (
      <AdminDashboard
        user={user}
        role={role}
        memberStats={memberStats}
        managerStats={managerStats}
        adminStats={adminStats}
        approvalStats={approvalStats}
      />
    );
  }

  // Fallback (shouldn't reach here, but safe default)
  return (
    <MemberDashboard
      user={user}
      role={role}
      memberStats={memberStats}
    />
  );
}
