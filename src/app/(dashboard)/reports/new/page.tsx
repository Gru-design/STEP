import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewReportForm } from "./NewReportForm";
import { SocialProofBanner } from "@/components/reports/SocialProofBanner";
import type { ReportTemplate, TenantSettings } from "@/types/database";

export default async function NewReportPage() {
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

  // Fetch published templates for this tenant
  const today = new Date().toISOString().split("T")[0];

  const [templatesResult, totalMembersResult, submittedTodayResult, teamMembersResult, peerBonusSentResult, tenantResult] =
    await Promise.all([
      supabase
        .from("report_templates")
        .select("id, tenant_id, name, type, target_roles, schema, is_published, visibility_override")
        .eq("tenant_id", dbUser.tenant_id)
        .eq("is_published", true)
        .in("type", ["daily", "weekly"])
        .order("name"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", dbUser.tenant_id),
      supabase
        .from("report_entries")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", dbUser.tenant_id)
        .eq("report_date", today)
        .eq("status", "submitted"),
      // Fetch team members for peer bonus (exclude self)
      supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("tenant_id", dbUser.tenant_id)
        .neq("id", dbUser.id)
        .order("name"),
      // Check if peer bonus already sent today
      supabase
        .from("peer_bonuses")
        .select("id")
        .eq("from_user_id", dbUser.id)
        .eq("bonus_date", today)
        .single(),
      // Fetch tenant settings for peer bonus toggle
      supabase
        .from("tenants")
        .select("settings")
        .eq("id", dbUser.tenant_id)
        .single(),
    ]);

  const teamSubmissionRate =
    (totalMembersResult.count ?? 0) > 0
      ? ((submittedTodayResult.count ?? 0) / (totalMembersResult.count ?? 1)) * 100
      : 0;

  const teamMembers = (teamMembersResult.data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    avatar_url: m.avatar_url,
  }));

  const tenantSettings = (tenantResult.data?.settings ?? {}) as TenantSettings;
  const peerBonusEnabled = tenantSettings.peer_bonus_enabled !== false;
  const peerBonusAvailable = peerBonusEnabled && !peerBonusSentResult.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">日報を書く</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          </p>
        </div>
      </div>

      <SocialProofBanner teamSubmissionRate={teamSubmissionRate} />

      <NewReportForm
        templates={(templatesResult.data as ReportTemplate[]) ?? []}
        teamMembers={peerBonusEnabled ? teamMembers : []}
        peerBonusAvailable={peerBonusAvailable}
      />
    </div>
  );
}
