import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import type { User, TenantSettings } from "@/types/database";
import { MemberDashboard } from "./MemberDashboard";
import { calculateStreak, LEVEL_THRESHOLDS } from "@/lib/gamification/level";
import { getCachedDailyTemplateIds } from "@/lib/cache";
import type { MemberStats, ManagerStats, AdminStats, ApprovalStats } from "./types";

const ManagerDashboard = dynamic(
  () => import("./ManagerDashboard").then((m) => ({ default: m.ManagerDashboard })),
  { ssr: true }
);

const AdminDashboard = dynamic(
  () => import("./AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
  { ssr: true }
);

function getNextLevelXP(level: number): number {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

// ── Fetch member stats (shared across all roles) ──

async function fetchDailyTemplateIds(
  _supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
): Promise<string[]> {
  // Delegate to request-scoped cache to deduplicate across layout + page
  return getCachedDailyTemplateIds(tenantId);
}

async function fetchMemberStats(
  supabase: ReturnType<typeof createAdminClient>,
  user: User,
  today: string,
  weekStartStr: string,
  nowMs: number,
  dailyTemplateIds: string[],
): Promise<MemberStats> {
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
    dailyTemplateIds.length > 0
      ? supabase
          .from("report_entries")
          .select("report_date")
          .eq("user_id", user.id)
          .eq("status", "submitted")
          .in("template_id", dailyTemplateIds)
          .order("report_date", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as { report_date: string }[] }),
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
      .eq("tenant_id", user.tenant_id)
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
      .select("id", { count: "exact", head: true })
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

  const recentEntries = recentEntriesResult.data ?? [];
  const submittedToday = recentEntries.length > 0 && recentEntries[0].report_date === today;
  const streak = calculateStreak(recentEntries);
  const level = userLevelResult.data?.level ?? 1;
  const xp = userLevelResult.data?.xp ?? 0;

  // Batch 2: Dependent queries
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

  // Resolve badges
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

  // Resolve goal progress
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
  if (weekEntriesResult.data && goalsWithKPI.length > 0) {
    // Pre-group entries by template_id for O(goals + entries) instead of O(goals × entries)
    const entriesByTemplate = new Map<string, { data: unknown; template_id: string }[]>();
    for (const entry of weekEntriesResult.data) {
      const existing = entriesByTemplate.get(entry.template_id);
      if (existing) {
        existing.push(entry);
      } else {
        entriesByTemplate.set(entry.template_id, [entry]);
      }
    }
    for (const goal of goalsWithKPI) {
      let weekSum = 0;
      const entries = entriesByTemplate.get(goal.template_id!) ?? [];
      for (const entry of entries) {
        const val = Number((entry.data as Record<string, unknown>)[goal.kpi_field_key!]);
        if (!isNaN(val)) weekSum += val;
      }
      weeklyContributions.set(goal.id, weekSum);
    }
  }

  const levelLabels: Record<string, string> = {
    company: "全社", department: "部門", team: "チーム", individual: "個人",
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
      id: g.id, name: g.name, level: levelLabels[g.level] ?? g.level,
      target, actual, rate: Math.round(rate), expectedRate,
      weeklyContribution: weeklyContributions.get(g.id) ?? null,
      isOnTrack: rate >= expectedRate - 5,
    };
  });

  // Resolve peer bonuses
  const senderMap = new Map((sendersResult.data ?? []).map((s) => [s.id, s.name]));
  const receivedBonuses = bonusData.map((bonus) => ({
    fromName: senderMap.get(bonus.from_user_id) ?? "不明",
    message: bonus.message,
    date: bonus.bonus_date,
  }));

  const pendingReviewPlan = pendingReviewResult.data;
  const pendingReview = pendingReviewPlan
    ? { planId: pendingReviewPlan.id, weekStart: pendingReviewPlan.week_start, executionRate: pendingReviewPlan.execution_rate as number | null }
    : null;

  return {
    submittedToday, streak, level, xp,
    xpForNextLevel: getNextLevelXP(level),
    goalsProgress, recentBadges, pendingReview,
    peerBonus: {
      totalReceived: totalReceivedResult.count ?? 0,
      sentToday: !!sentTodayResult.data,
      recentReceived: receivedBonuses,
    },
    todayReceivedBonuses: receivedBonuses.filter((b) => b.date === today),
  };
}

// ── Manager/Admin section (async server component for Suspense) ──

async function ManagerSection({
  user,
  memberStats,
  approvalStats,
  peerBonusEnabled,
}: {
  user: User;
  memberStats: MemberStats;
  approvalStats: ApprovalStats;
  peerBonusEnabled: boolean;
}) {
  const supabase = await createClient();
  const tenantId = user.tenant_id;
  const today = new Date().toISOString().split("T")[0];
  const isAdmin = user.role === "admin" || user.role === "super_admin";

  const [managedTeamsResult, nudgesResult, dailyTplIds] = await Promise.all([
    supabase.from("teams").select("id, name").eq("tenant_id", tenantId).eq("manager_id", user.id),
    supabase.from("nudges").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending"),
    fetchDailyTemplateIds(supabase, tenantId),
  ]);

  const managedTeams = managedTeamsResult.data ?? [];
  const teamIds = managedTeams.map((t) => t.id);

  let teamMembers: { id: string; name: string; submitted: boolean }[] = [];

  if (teamIds.length > 0) {
    const { data: members } = await supabase.from("team_members").select("user_id").in("team_id", teamIds);
    const memberIds = [...new Set(members?.map((m) => m.user_id) ?? [])];

    if (memberIds.length > 0) {
      const [memberUsersResult, todaySubmissionsResult] = await Promise.all([
        supabase.from("users").select("id, name").in("id", memberIds),
        dailyTplIds.length > 0
          ? supabase.from("report_entries").select("user_id").in("user_id", memberIds).eq("report_date", today).eq("status", "submitted").in("template_id", dailyTplIds)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);
      const submittedIds = new Set(todaySubmissionsResult.data?.map((s) => s.user_id) ?? []);
      teamMembers = (memberUsersResult.data ?? []).map((u) => ({
        id: u.id, name: u.name, submitted: submittedIds.has(u.id),
      }));
    }
  }

  if (isAdmin && teamMembers.length === 0) {
    // Parallel: fetch all users + today's submissions by tenant (no dependency)
    const [allUsersResult, todaySubmissionsResult] = await Promise.all([
      supabase.from("users").select("id, name").eq("tenant_id", tenantId).neq("id", user.id),
      dailyTplIds.length > 0
        ? supabase.from("report_entries").select("user_id").eq("tenant_id", tenantId).eq("report_date", today).eq("status", "submitted").in("template_id", dailyTplIds)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
    ]);
    const allUsers = allUsersResult.data ?? [];
    const submittedIds = new Set(todaySubmissionsResult.data?.map((s) => s.user_id) ?? []);
    teamMembers = allUsers.map((u) => ({
      id: u.id, name: u.name, submitted: submittedIds.has(u.id),
    }));
  }

  const submittedCount = teamMembers.filter((m) => m.submitted).length;
  const todayRate = teamMembers.length > 0 ? Math.round((submittedCount / teamMembers.length) * 100) : 0;

  // Weekly trends
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

  const weekCountResults = await Promise.all(
    weekRanges.map((wr) => {
      let query = supabase.from("report_entries").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "submitted")
        .gte("report_date", wr.start).lte("report_date", wr.end);
      if (dailyTplIds.length > 0) {
        query = query.in("template_id", dailyTplIds);
      }
      return query;
    })
  );

  const expected = Math.max(1, teamMembers.length * 5);
  const weeklyTrends = weekRanges.map((wr, i) => ({
    week: wr.label,
    rate: Math.min(100, Math.round(((weekCountResults[i].count ?? 0) / expected) * 100)),
  }));

  const managerStats: ManagerStats = {
    todaySubmissionRate: todayRate,
    weekSubmissionRate: weeklyTrends.length > 0 ? weeklyTrends[weeklyTrends.length - 1].rate : 0,
    teamMembers, weeklyTrends,
    pendingNudges: nudgesResult.count ?? 0,
  };

  if (user.role === "manager") {
    return (
      <ManagerDashboard
        user={user} role={user.role}
        memberStats={memberStats}
        managerStats={managerStats}
        approvalStats={approvalStats}
        peerBonusEnabled={peerBonusEnabled}
      />
    );
  }

  // Admin: fetch additional stats
  const nowMs = new Date().getTime();
  const [
    totalUsersRes, todaySubmittedRes, activeDealsRes,
    teamsRes, todayEntriesRes, allGoalsRes,
    ownerUsersRes, stagesRes, activeDealsStageRes,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    dailyTplIds.length > 0
      ? supabase.from("report_entries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("report_date", today).eq("status", "submitted").in("template_id", dailyTplIds)
      : Promise.resolve({ count: 0 }),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("teams").select("id, name").eq("tenant_id", tenantId),
    dailyTplIds.length > 0
      ? supabase.from("report_entries").select("user_id").eq("tenant_id", tenantId).eq("report_date", today).eq("status", "submitted").in("template_id", dailyTplIds)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    supabase.from("goals").select("id, name, target_value, period_start, period_end, owner_id").eq("tenant_id", tenantId),
    supabase.from("users").select("id, name").eq("tenant_id", tenantId),
    supabase.from("pipeline_stages").select("id, name, sort_order").eq("tenant_id", tenantId).order("sort_order", { ascending: true }),
    supabase.from("deals").select("stage_id").eq("tenant_id", tenantId).eq("status", "active"),
  ]);

  const totalUsers = totalUsersRes.count;
  const todaySubmitted = todaySubmittedRes.count;
  const submissionRate = (totalUsers ?? 0) > 0 ? Math.round(((todaySubmitted ?? 0) / (totalUsers ?? 1)) * 100) : 0;

  const allTeams = teamsRes.data ?? [];
  const teamIdsForAdmin = allTeams.map((t) => t.id);

  const { data: allMembersData } = teamIdsForAdmin.length > 0
    ? await supabase.from("team_members").select("team_id, user_id").in("team_id", teamIdsForAdmin)
    : { data: [] as { team_id: string; user_id: string }[] };

  const allMembersArr = allMembersData ?? [];
  const todayEntries = new Set((todayEntriesRes.data ?? []).map((e) => e.user_id));

  const teamsOverview = allTeams.map((team) => {
    const mems = allMembersArr.filter((m) => m.team_id === team.id);
    const sub = mems.filter((m) => todayEntries.has(m.user_id)).length;
    return { name: team.name, memberCount: mems.length, submissionRate: mems.length > 0 ? Math.round((sub / mems.length) * 100) : 0 };
  });

  // Deviation alerts
  const goals = allGoalsRes.data ?? [];
  const adminGoalIds = goals.map((g) => g.id);
  const { data: adminSnapshotsData } = adminGoalIds.length > 0
    ? await supabase.from("goal_snapshots").select("goal_id, progress_rate, snapshot_date").in("goal_id", adminGoalIds).order("snapshot_date", { ascending: false })
    : { data: [] as { goal_id: string; progress_rate: number; snapshot_date: string }[] };

  const ownerMap = new Map((ownerUsersRes.data ?? []).map((u) => [u.id, u.name]));
  const latestSnapshotMap = new Map<string, number>();
  for (const snap of adminSnapshotsData ?? []) {
    if (!latestSnapshotMap.has(snap.goal_id)) {
      latestSnapshotMap.set(snap.goal_id, Number(snap.progress_rate));
    }
  }

  const deviationAlerts: { goalName: string; deviation: number; ownerName: string }[] = [];
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
        goalName: goal.name, deviation: Math.round(deviation),
        ownerName: goal.owner_id ? ownerMap.get(goal.owner_id) ?? "不明" : "未割当",
      });
    }
  }

  const dealCountByStage = new Map<string, number>();
  for (const d of activeDealsStageRes.data ?? []) {
    dealCountByStage.set(d.stage_id, (dealCountByStage.get(d.stage_id) ?? 0) + 1);
  }

  const funnelStages = (stagesRes.data ?? []).map((ps) => ({
    name: ps.name, count: dealCountByStage.get(ps.id) ?? 0,
  }));

  const adminStats: AdminStats = {
    totalUsers: totalUsers ?? 0, submissionRate,
    activeDeals: activeDealsRes.count ?? 0,
    teamsOverview, deviationAlerts, funnelStages,
  };

  return (
    <AdminDashboard
      user={user} role={user.role}
      memberStats={memberStats}
      managerStats={managerStats}
      adminStats={adminStats}
      approvalStats={approvalStats}
      peerBonusEnabled={peerBonusEnabled}
    />
  );
}

// ── Loading skeleton for manager/admin section ──

function ManagerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-xl bg-muted" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  );
}

// ── Main Page ──

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
  const currentTime = new Date();
  const today = currentTime.toISOString().split("T")[0];
  const nowMs = currentTime.getTime();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Fetch daily template IDs + tenant settings in parallel, then member stats
  const [dailyTemplateIds, tenantSettingsResult] = await Promise.all([
    fetchDailyTemplateIds(supabase, user.tenant_id),
    supabase.from("tenants").select("settings").eq("id", user.tenant_id).single(),
  ]);
  const memberStats = await fetchMemberStats(supabase, user, today, weekStartStr, nowMs, dailyTemplateIds);

  const tenantSettings = (tenantSettingsResult.data?.settings ?? {}) as TenantSettings;
  const peerBonusEnabled = tenantSettings.peer_bonus_enabled !== false;

  // Member: render directly (no additional data needed)
  if (user.role === "member") {
    return <MemberDashboard user={user} role={user.role} memberStats={memberStats} peerBonusEnabled={peerBonusEnabled} />;
  }

  // Manager/Admin: fetch approval stats quickly, then render with Suspense for heavy sections
  const [pendingPlansResult, pendingDealsResult] = await Promise.all([
    supabase.from("weekly_plans").select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenant_id).eq("status", "submitted"),
    supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenant_id).eq("status", "submitted" as string),
  ]);

  const approvalStats: ApprovalStats = {
    pendingPlans: pendingPlansResult.count ?? 0,
    pendingDeals: pendingDealsResult.count ?? 0,
  };

  return (
    <Suspense fallback={<ManagerSkeleton />}>
      <ManagerSection
        user={user}
        memberStats={memberStats}
        approvalStats={approvalStats}
        peerBonusEnabled={peerBonusEnabled}
      />
    </Suspense>
  );
}
