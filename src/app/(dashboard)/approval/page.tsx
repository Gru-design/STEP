import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ApprovalDashboardClient } from "./ApprovalDashboardClient";

export default async function ApprovalPage() {
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
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  if (dbUser.role === "member") {
    redirect("/dashboard");
  }

  const tenantId = dbUser.tenant_id;

  // Fetch pending plans + pending deals + approval logs in parallel
  const [pendingPlansResult, pendingDealsResult, recentLogsResult] = await Promise.all([
    adminClient
      .from("weekly_plans")
      .select("id, user_id, week_start, items, status, created_at, template_id")
      .eq("tenant_id", tenantId)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(50),
    adminClient
      .from("deals")
      .select("id, user_id, company, title, value, stage_id, approval_status, created_at")
      .eq("tenant_id", tenantId)
      .eq("approval_status", "submitted")
      .order("created_at", { ascending: false })
      .limit(50),
    adminClient
      .from("approval_logs")
      .select("id, target_type, target_id, action, actor_id, comment, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pendingPlans = pendingPlansResult.data ?? [];
  const pendingDeals = pendingDealsResult.data ?? [];

  // Resolve user names for all involved users
  const userIds = new Set<string>();
  for (const p of pendingPlans) userIds.add(p.user_id);
  for (const d of pendingDeals) userIds.add(d.user_id);
  for (const l of recentLogsResult.data ?? []) userIds.add(l.actor_id);

  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: users } = await adminClient
      .from("users")
      .select("id, name")
      .in("id", [...userIds]);
    userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]));
  }

  // Resolve pipeline stages for deals
  let stageMap: Record<string, string> = {};
  const stageIds = [...new Set(pendingDeals.map((d) => d.stage_id))];
  if (stageIds.length > 0) {
    const { data: stages } = await adminClient
      .from("pipeline_stages")
      .select("id, name")
      .in("id", stageIds);
    stageMap = Object.fromEntries((stages ?? []).map((s) => [s.id, s.name]));
  }

  const recentLogs = (recentLogsResult.data ?? []).map((l) => ({
    ...l,
    actor_name: userMap[l.actor_id] ?? "不明",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">承認ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          週次計画・案件の承認待ち一覧
        </p>
      </div>
      <ApprovalDashboardClient
        pendingPlans={pendingPlans}
        pendingDeals={pendingDeals}
        recentLogs={recentLogs}
        userMap={userMap}
        stageMap={stageMap}
        currentUserId={dbUser.id}
      />
    </div>
  );
}
