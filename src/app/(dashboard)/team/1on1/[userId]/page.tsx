import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User, PlanReview } from "@/types/database";
import { OneOnOneClient } from "./OneOnOneClient";

interface KpiSummaryItem {
  label: string;
  key: string;
  value: number;
  unit?: string;
}

interface ApprovalHistoryItem {
  id: string;
  type: "plan" | "deal";
  title: string;
  status: string;
  date: string;
  comment?: string;
}

interface MotivationPoint {
  date: string;
  individual: number;
  teamAvg: number;
}

export default async function OneOnOnePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const currentUser = dbUser as User;

  // Only managers, admins, and super_admins can access 1on1 pages
  if (!["admin", "manager", "super_admin"].includes(currentUser.role)) {
    redirect("/team");
  }

  // Fetch the target user
  const { data: targetUserData } = await supabase
    .from("users")
    .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
    .eq("id", userId)
    .eq("tenant_id", currentUser.tenant_id)
    .single();

  if (!targetUserData) {
    redirect("/team");
  }

  const targetUser = targetUserData as User;

  // Get team membership for the target user
  const { data: teamMembership } = await supabase
    .from("team_members")
    .select("teams(name)")
    .eq("user_id", targetUser.id)
    .limit(1)
    .single();

  const teamName =
    (teamMembership as unknown as { teams: { name: string } } | null)?.teams
      ?.name ?? undefined;

  // Calculate date ranges
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  thisWeekStart.setHours(0, 0, 0, 0);

  const fourWeeksAgo = new Date(thisWeekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // Fetch report entries for the target user (this week) — exclude checkins
  const { data: weekReports } = await supabase
    .from("report_entries")
    .select("*, report_templates!inner(name, schema, type)")
    .eq("user_id", targetUser.id)
    .eq("tenant_id", currentUser.tenant_id)
    .eq("report_templates.type", "daily")
    .gte("report_date", thisWeekStart.toISOString().split("T")[0])
    .order("report_date", { ascending: true });

  // Fetch report entries for the last 4 weeks (for motivation chart) — exclude checkins
  const { data: recentReports } = await supabase
    .from("report_entries")
    .select("report_date, data, report_templates!inner(type)")
    .eq("user_id", targetUser.id)
    .eq("tenant_id", currentUser.tenant_id)
    .eq("report_templates.type", "daily")
    .gte("report_date", fourWeeksAgo.toISOString().split("T")[0])
    .order("report_date", { ascending: true });

  // Fetch all team reports for team avg calculation
  let teamMemberIds: string[] = [];
  if (teamMembership) {
    const { data: teamMemberRecords } = await supabase
      .from("team_members")
      .select("user_id")
      .eq(
        "team_id",
        (teamMembership as unknown as { teams: { name: string }; team_id?: string })
          ?.team_id ?? ""
      );
    teamMemberIds = (teamMemberRecords ?? []).map(
      (m: { user_id: string }) => m.user_id
    );
  }

  const { data: teamReports } = await supabase
    .from("report_entries")
    .select("report_date, data, user_id, report_templates!inner(type)")
    .eq("tenant_id", currentUser.tenant_id)
    .eq("report_templates.type", "daily")
    .in("user_id", teamMemberIds.length > 0 ? teamMemberIds : ["_none_"])
    .gte("report_date", fourWeeksAgo.toISOString().split("T")[0])
    .order("report_date", { ascending: true });

  // Extract KPI summary from week reports
  const kpiSummary: KpiSummaryItem[] = [];
  const seenKeys = new Set<string>();

  for (const report of weekReports ?? []) {
    const schema = (
      report.report_templates as unknown as {
        schema: {
          sections: Array<{
            fields: Array<{
              key: string;
              type: string;
              label: string;
              unit?: string;
            }>;
          }>;
        };
      }
    )?.schema;

    if (!schema?.sections) continue;

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type === "number" && !seenKeys.has(field.key)) {
          seenKeys.add(field.key);
          // Sum this field across all reports this week
          let total = 0;
          for (const r of weekReports ?? []) {
            const rd = r.data as Record<string, unknown>;
            const val = Number(rd[field.key]);
            if (!isNaN(val)) total += val;
          }
          kpiSummary.push({
            label: field.label,
            key: field.key,
            value: total,
            unit: field.unit,
          });
        }
      }
    }
  }

  // Calculate submission rate
  const daysSoFar = Math.min(
    Math.ceil(
      (now.getTime() - thisWeekStart.getTime()) / (1000 * 60 * 60 * 24)
    ),
    5
  );
  const submittedDays = new Set(
    (weekReports ?? [])
      .filter((r) => r.status === "submitted")
      .map((r) => r.report_date)
  ).size;
  const submissionRate = daysSoFar > 0 ? submittedDays / daysSoFar : 0;

  // Extract motivation data
  function extractRating(data: Record<string, unknown>): number | null {
    for (const [key, val] of Object.entries(data)) {
      if (
        (key.includes("rating") ||
          key.includes("motivation") ||
          key.includes("condition") ||
          key.includes("morale")) &&
        typeof val === "number"
      ) {
        return val;
      }
    }
    return null;
  }

  // Group reports by date for individual ratings
  const individualRatings: Record<string, number[]> = {};
  for (const r of recentReports ?? []) {
    const rating = extractRating(r.data as Record<string, unknown>);
    if (rating != null) {
      if (!individualRatings[r.report_date]) {
        individualRatings[r.report_date] = [];
      }
      individualRatings[r.report_date].push(rating);
    }
  }

  // Group team reports by date for team avg
  const teamRatings: Record<string, number[]> = {};
  for (const r of teamReports ?? []) {
    const rating = extractRating(r.data as Record<string, unknown>);
    if (rating != null) {
      if (!teamRatings[r.report_date]) {
        teamRatings[r.report_date] = [];
      }
      teamRatings[r.report_date].push(rating);
    }
  }

  // Build motivation chart data
  const allDates = [
    ...new Set([
      ...Object.keys(individualRatings),
      ...Object.keys(teamRatings),
    ]),
  ].sort();
  const motivationData: MotivationPoint[] = allDates.map((date) => {
    const indRatings = individualRatings[date] ?? [];
    const teamRats = teamRatings[date] ?? [];
    const indAvg =
      indRatings.length > 0
        ? indRatings.reduce((a, b) => a + b, 0) / indRatings.length
        : 3;
    const teamAvg =
      teamRats.length > 0
        ? teamRats.reduce((a, b) => a + b, 0) / teamRats.length
        : 3;
    const d = new Date(date);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      individual: Math.round(indAvg * 10) / 10,
      teamAvg: Math.round(teamAvg * 10) / 10,
    };
  });

  // Fetch approval history
  const approvalHistory: ApprovalHistoryItem[] = [];

  // Weekly plans approvals
  const { data: plans } = await supabase
    .from("weekly_plans")
    .select("id, title, approval_status, updated_at")
    .eq("user_id", targetUser.id)
    .eq("tenant_id", currentUser.tenant_id)
    .in("approval_status", ["submitted", "approved", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(5);

  for (const plan of plans ?? []) {
    approvalHistory.push({
      id: plan.id,
      type: "plan",
      title: plan.title ?? "週次計画",
      status: plan.approval_status,
      date: plan.updated_at,
    });
  }

  // Deals approvals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, company, approval_status, updated_at")
    .eq("user_id", targetUser.id)
    .eq("tenant_id", currentUser.tenant_id)
    .in("approval_status", ["submitted", "approved", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(5);

  for (const deal of deals ?? []) {
    approvalHistory.push({
      id: deal.id,
      type: "deal",
      title: deal.title ?? deal.company ?? "案件",
      status: deal.approval_status,
      date: deal.updated_at,
    });
  }

  // Sort by date descending
  approvalHistory.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Fetch user level
  const { data: userLevel } = await supabase
    .from("user_levels")
    .select("level, xp")
    .eq("user_id", targetUser.id)
    .single();

  // Fetch latest plan reviews for the target user (recent 3)
  const { data: recentPlansForReview } = await supabase
    .from("weekly_plans")
    .select("id, week_start, execution_rate, status")
    .eq("user_id", targetUser.id)
    .eq("tenant_id", currentUser.tenant_id)
    .in("status", ["review_pending", "reviewed"])
    .order("week_start", { ascending: false })
    .limit(3);

  const reviewPlanIds = (recentPlansForReview ?? []).map((p) => p.id);
  let planReviews: PlanReview[] = [];

  if (reviewPlanIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from("plan_reviews")
      .select("id, tenant_id, plan_id, user_id, self_rating, went_well, to_improve, next_actions, manager_id, manager_comment, manager_reviewed_at, created_at, updated_at")
      .in("plan_id", reviewPlanIds);

    planReviews = (reviewsData ?? []) as PlanReview[];
  }

  // Build review data for the client
  const weeklyReviews = (recentPlansForReview ?? []).map((plan) => {
    const review = planReviews.find((r) => r.plan_id === plan.id);
    return {
      planId: plan.id,
      weekStart: plan.week_start,
      executionRate: plan.execution_rate as number | null,
      status: plan.status as string,
      review: review ?? null,
    };
  });

  return (
    <OneOnOneClient
      targetUser={targetUser}
      teamName={teamName}
      kpiSummary={kpiSummary}
      submissionRate={submissionRate}
      submittedDays={submittedDays}
      expectedDays={daysSoFar}
      motivationData={motivationData}
      approvalHistory={approvalHistory}
      level={userLevel?.level ?? 1}
      xp={userLevel?.xp ?? 0}
      weeklyReviews={weeklyReviews}
    />
  );
}
