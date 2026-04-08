import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { NewReportForm } from "../../new/NewReportForm";
import type { ReportTemplate } from "@/types/database";

export const dynamic = "force-dynamic";

interface EditReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReportPage({ params }: EditReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Fetch the report entry
  const adminClient = createAdminClient();
  const { data: entry, error: entryError } = await adminClient
    .from("report_entries")
    .select("id, user_id, template_id, report_date, data, status, submitted_at, created_at")
    .eq("id", id)
    .single();

  if (!entry || entryError) {
    notFound();
  }

  // Only the author can edit, and only drafts
  if (entry.user_id !== authUser.id || entry.status !== "draft") {
    redirect(`/reports/${id}`);
  }

  // Get dbUser for tenant info
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch template, team members, and peer bonus status in parallel
  const [templateResult, teamMembersResult, peerBonusSentResult] =
    await Promise.all([
      adminClient
        .from("report_templates")
        .select("id, tenant_id, name, type, target_roles, schema, is_published, visibility_override")
        .eq("id", entry.template_id)
        .single(),
      supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("tenant_id", dbUser.tenant_id)
        .neq("id", dbUser.id)
        .order("name"),
      supabase
        .from("peer_bonuses")
        .select("id")
        .eq("from_user_id", dbUser.id)
        .eq("bonus_date", today)
        .single(),
    ]);

  if (!templateResult.data) {
    notFound();
  }

  const teamMembers = (teamMembersResult.data ?? []).map((m: { id: string; name: string; avatar_url: string | null }) => ({
    id: m.id,
    name: m.name,
    avatar_url: m.avatar_url,
  }));

  const peerBonusAvailable = !peerBonusSentResult.data;

  const entryData: Record<string, unknown> =
    entry.data && typeof entry.data === "object" && !Array.isArray(entry.data)
      ? (entry.data as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          下書きを編集
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {entry.report_date as string}
        </p>
      </div>

      <NewReportForm
        templates={[templateResult.data as ReportTemplate]}
        teamMembers={teamMembers}
        peerBonusAvailable={peerBonusAvailable}
        initialData={{
          entryId: entry.id,
          templateId: entry.template_id,
          reportDate: entry.report_date as string,
          formValues: entryData,
        }}
      />
    </div>
  );
}
