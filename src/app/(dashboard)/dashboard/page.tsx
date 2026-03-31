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
  const today = new Date().toISOString().split("T")[0];

  // ── Member Stats (always fetched) ──

  // Check today's submission
  const { data: todayEntry } = await supabase
    .from("report_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .eq("status", "submitted")
    .limit(1);

  const submittedToday = (todayEntry?.length ?? 0) > 0;

  // Calculate streak: count consecutive days with submissions going backward
  const { data: recentEntries } = await supabase
    .from("report_entries")
    .select("report_date")
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .order("report_date", { ascending: false })
    .limit(60);

  let streak = 0;
  if (recentEntries && recentEntries.length > 0) {
    const dates = new Set(recentEntries.map((e) => e.report_date));
    const checkDate = new Date();
    // If not submitted today, start checking from yesterday
    if (!submittedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayOfWeek = checkDate.getDay();
      // Skip weekends
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

  // User level/XP
  const { data: userLevel } = await supabase
    .from("user_levels")
    .select("level, xp")
    .eq("user_id", user.id)
    .single();

  const level = userLevel?.level ?? 1;
  const xp = userLevel?.xp ?? 0;

  // Recent badges
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("earned_at, badge_id")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false })
    .limit(5);

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

  // Weekly KPIs from latest report
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: weeklyReports } = await supabase
    .from("report_entries")
    .select("data")
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .gte("report_date", weekStartStr)
    .order("report_date", { ascending: false })
    .limit(1);

  const weeklyKPIs: { label: string; value: string }[] = [];
  if (weeklyReports && weeklyReports.length > 0) {
    const reportData = weeklyReports[0].data as Record<string, unknown>;
    for (const [key, val] of Object.entries(reportData)) {
      if (typeof val === "number") {
        weeklyKPIs.push({ label: key, value: String(val) });
      }
    }
  }

  const memberStats = {
    submittedToday,
    streak,
    level,
    xp,
    xpForNextLevel: getNextLevelXP(level),
    weeklyKPIs: weeklyKPIs.slice(0, 5),
    recentBadges,
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
        const { data: memberUsers } = await supabase
          .from("users")
          .select("id, name")
          .in("id", memberIds);

        const { data: todaySubmissions } = await supabase
          .from("report_entries")
          .select("user_id")
          .in("user_id", memberIds)
          .eq("report_date", today)
          .eq("status", "submitted");

        const submittedIds = new Set(
          todaySubmissions?.map((s) => s.user_id) ?? []
        );

        teamMembers = (memberUsers ?? []).map((u) => ({
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

    // Weekly trends (last 4 weeks) - simplified calculation
    const weeklyTrends: { week: string; rate: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const wStart = new Date();
      wStart.setDate(wStart.getDate() - wStart.getDay() + 1 - w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 4); // Mon-Fri

      const wStartStr = wStart.toISOString().split("T")[0];
      const wEndStr = wEnd.toISOString().split("T")[0];

      const { count } = await supabase
        .from("report_entries")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "submitted")
        .gte("report_date", wStartStr)
        .lte("report_date", wEndStr);

      // Approximate: entries / (team members * 5 weekdays)
      const expected = Math.max(1, teamMembers.length * 5);
      const rate = Math.min(100, Math.round(((count ?? 0) / expected) * 100));

      weeklyTrends.push({
        week: `${wStart.getMonth() + 1}/${wStart.getDate()}`,
        rate,
      });
    }

    // Pending nudges
    const { count: pendingNudges } = await supabase
      .from("nudges")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending");

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
    // Total users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Today's submission rate
    const { count: todaySubmitted } = await supabase
      .from("report_entries")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("report_date", today)
      .eq("status", "submitted");

    const submissionRate =
      (totalUsers ?? 0) > 0
        ? Math.round(((todaySubmitted ?? 0) / (totalUsers ?? 1)) * 100)
        : 0;

    // Active deals
    const { count: activeDeals } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    // Teams overview
    const { data: allTeams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tenant_id", tenantId);

    const teamsOverview: {
      name: string;
      memberCount: number;
      submissionRate: number;
    }[] = [];

    for (const team of allTeams ?? []) {
      const { count: memberCount } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id);

      const { data: tmMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id);

      const tmIds = tmMembers?.map((m) => m.user_id) ?? [];
      let teamRate = 0;

      if (tmIds.length > 0) {
        const { count: submitted } = await supabase
          .from("report_entries")
          .select("*", { count: "exact", head: true })
          .in("user_id", tmIds)
          .eq("report_date", today)
          .eq("status", "submitted");

        teamRate = Math.round(((submitted ?? 0) / tmIds.length) * 100);
      }

      teamsOverview.push({
        name: team.name,
        memberCount: memberCount ?? 0,
        submissionRate: teamRate,
      });
    }

    // Deviation alerts from goal_snapshots
    const { data: goalsWithSnapshots } = await supabase
      .from("goals")
      .select("id, name, target_value, period_start, period_end, owner_id")
      .eq("tenant_id", tenantId);

    const deviationAlerts: {
      goalName: string;
      deviation: number;
      ownerName: string;
    }[] = [];

    for (const goal of goalsWithSnapshots ?? []) {
      const { data: snapshot } = await supabase
        .from("goal_snapshots")
        .select("progress_rate")
        .eq("goal_id", goal.id)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (snapshot && snapshot.length > 0) {
        // Calculate expected progress based on time elapsed
        const start = new Date(goal.period_start).getTime();
        const end = new Date(goal.period_end).getTime();
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(1, (now - start) / (end - start)));
        const expectedRate = Math.round(elapsed * 100);
        const actualRate = Number(snapshot[0].progress_rate);
        const deviation = expectedRate - actualRate;

        if (deviation >= 5) {
          let ownerName = "未割当";
          if (goal.owner_id) {
            const { data: owner } = await supabase
              .from("users")
              .select("name")
              .eq("id", goal.owner_id)
              .single();
            ownerName = owner?.name ?? "不明";
          }
          deviationAlerts.push({
            goalName: goal.name,
            deviation: Math.round(deviation),
            ownerName,
          });
        }
      }
    }

    // Funnel stages
    const { data: pStages } = await supabase
      .from("pipeline_stages")
      .select("id, name, sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    const funnelStages: { name: string; count: number }[] = [];
    for (const ps of pStages ?? []) {
      const { count } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("stage_id", ps.id)
        .eq("status", "active");

      funnelStages.push({ name: ps.name, count: count ?? 0 });
    }

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
    const { count: pendingPlans } = await supabase
      .from("weekly_plans")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "submitted");

    const { count: pendingDeals } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "submitted" as string);

    approvalStats = {
      pendingPlans: pendingPlans ?? 0,
      pendingDeals: pendingDeals ?? 0,
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
