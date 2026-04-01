import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WeeklyPlan, ReportTemplate, ApprovalLog, PlanReview } from "@/types/database";
import { PlansPageClient } from "./PlansPageClient";
import { ApprovalQueueClient } from "./ApprovalQueueClient";
import { ApprovedPlansClient } from "./ApprovedPlansClient";

export interface PlanWithUser extends WeeklyPlan {
  user_name: string;
  user_email: string;
}

function parseApprovalLogs(
  logsData: Record<string, unknown>[]
): (ApprovalLog & { actor_name?: string })[] {
  return logsData.map((log) => {
    const actor = log.users as Record<string, unknown> | null;
    return {
      id: log.id as string,
      target_type: log.target_type as "weekly_plan",
      target_id: log.target_id as string,
      action: log.action as "submitted" | "approved" | "rejected",
      actor_id: log.actor_id as string,
      comment: log.comment as string | null,
      created_at: log.created_at as string,
      actor_name: (actor?.name as string) ?? "",
    };
  });
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab ?? "my";

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

  const isManager = ["admin", "manager", "super_admin"].includes(dbUser.role);

  // Fetch plan templates
  const { data: templatesData } = await supabase
    .from("report_templates")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .eq("type", "plan")
    .eq("is_published", true);

  const templates = (templatesData ?? []) as ReportTemplate[];

  // Fetch user's weekly plans (most recent first)
  const { data: plansData } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", dbUser.id)
    .order("week_start", { ascending: false })
    .limit(20);

  const plans = (plansData ?? []) as WeeklyPlan[];

  // Fetch approval logs for user's plans
  const planIds = plans.map((p) => p.id);
  let approvalLogs: (ApprovalLog & { actor_name?: string })[] = [];

  if (planIds.length > 0) {
    const { data: logsData } = await supabase
      .from("approval_logs")
      .select("*, users!inner(name)")
      .eq("target_type", "weekly_plan")
      .in("target_id", planIds)
      .order("created_at", { ascending: true });

    approvalLogs = parseApprovalLogs(
      (logsData ?? []) as Record<string, unknown>[]
    );
  }

  // Fetch plan reviews for user's plans
  let planReviews: PlanReview[] = [];
  if (planIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from("plan_reviews")
      .select("*")
      .in("plan_id", planIds);

    planReviews = (reviewsData ?? []) as PlanReview[];
  }

  // For managers: fetch submitted plans from the same tenant (excluding own)
  let pendingPlans: PlanWithUser[] = [];
  let pendingApprovalLogs: (ApprovalLog & { actor_name?: string })[] = [];
  let approvedPlans: PlanWithUser[] = [];
  let approvedPlanLogs: (ApprovalLog & { actor_name?: string })[] = [];

  function mapPlanRows(
    rows: Record<string, unknown>[],
    statusType?: string
  ): PlanWithUser[] {
    return rows.map((row) => {
      const user = row.users as Record<string, unknown>;
      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        user_id: row.user_id as string,
        week_start: row.week_start as string,
        template_id: row.template_id as string | null,
        items: row.items as Record<string, unknown>,
        status: (statusType ?? row.status) as "submitted",
        approved_by: row.approved_by as string | null,
        approved_at: row.approved_at as string | null,
        execution_rate: row.execution_rate as number | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        user_name: (user?.name as string) ?? "",
        user_email: (user?.email as string) ?? "",
      };
    });
  }

  if (isManager) {
    const { data: pendingData } = await supabase
      .from("weekly_plans")
      .select("*, users!weekly_plans_user_id_fkey(name, email)")
      .eq("tenant_id", dbUser.tenant_id)
      .eq("status", "submitted")
      .neq("user_id", dbUser.id)
      .order("updated_at", { ascending: false });

    pendingPlans = mapPlanRows(
      (pendingData ?? []) as Record<string, unknown>[]
    );

    // Fetch approval logs for pending plans
    const pendingPlanIds = pendingPlans.map((p) => p.id);
    if (pendingPlanIds.length > 0) {
      const { data: pendingLogsData } = await supabase
        .from("approval_logs")
        .select("*, users!inner(name)")
        .eq("target_type", "weekly_plan")
        .in("target_id", pendingPlanIds)
        .order("created_at", { ascending: true });

      pendingApprovalLogs = parseApprovalLogs(
        (pendingLogsData ?? []) as Record<string, unknown>[]
      );
    }

    // Fetch approved/rejected plans (recent 20, excluding own)
    const { data: approvedData } = await supabase
      .from("weekly_plans")
      .select("*, users!weekly_plans_user_id_fkey(name, email)")
      .eq("tenant_id", dbUser.tenant_id)
      .in("status", ["approved", "rejected", "review_pending", "reviewed"])
      .neq("user_id", dbUser.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    approvedPlans = mapPlanRows(
      (approvedData ?? []) as Record<string, unknown>[]
    );

    // Fetch approval logs for approved plans
    const approvedPlanIds = approvedPlans.map((p) => p.id);
    if (approvedPlanIds.length > 0) {
      const { data: approvedLogsData } = await supabase
        .from("approval_logs")
        .select("*, users!inner(name)")
        .eq("target_type", "weekly_plan")
        .in("target_id", approvedPlanIds)
        .order("created_at", { ascending: true });

      approvedPlanLogs = parseApprovalLogs(
        (approvedLogsData ?? []) as Record<string, unknown>[]
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">週次計画</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager
            ? "チームの週次計画を管理・承認しましょう"
            : "今週の行動計画を立て、提出・承認を受けましょう"}
        </p>
      </div>

      {/* Tab navigation for managers */}
      {isManager && (
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          <a
            href="/plans?tab=my"
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            自分の計画
          </a>
          <a
            href="/plans?tab=approval"
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === "approval"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            承認待ち
            {pendingPlans.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-color text-xs font-bold text-white">
                {pendingPlans.length}
              </span>
            )}
          </a>
          <a
            href="/plans?tab=approved"
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === "approved"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            承認済み
          </a>
        </div>
      )}

      {activeTab === "approval" && isManager ? (
        <ApprovalQueueClient
          pendingPlans={pendingPlans}
          templates={templates}
          approvalLogs={pendingApprovalLogs}
        />
      ) : activeTab === "approved" && isManager ? (
        <ApprovedPlansClient
          plans={approvedPlans}
          templates={templates}
          approvalLogs={approvedPlanLogs}
        />
      ) : (
        <PlansPageClient
          plans={plans}
          templates={templates}
          approvalLogs={approvalLogs}
          planReviews={planReviews}
          isManager={isManager}
          userId={dbUser.id}
        />
      )}
    </div>
  );
}
