import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WeeklyPlan, ReportTemplate, ApprovalLog } from "@/types/database";
import { PlansPageClient } from "./PlansPageClient";

export default async function PlansPage() {
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

    approvalLogs = (logsData ?? []).map(
      (log: Record<string, unknown>) => {
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
      }
    );
  }

  const isManager = ["admin", "manager", "super_admin"].includes(dbUser.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0C025F]">週次計画</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          今週の行動計画を立て、提出・承認を受けましょう
        </p>
      </div>

      <PlansPageClient
        plans={plans}
        templates={templates}
        approvalLogs={approvalLogs}
        isManager={isManager}
        userId={dbUser.id}
      />
    </div>
  );
}
