import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CheckinsPageClient } from "./CheckinsPageClient";
import type { TemplateSchema } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CheckinsPage() {
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

  const adminClient = createAdminClient();

  // Fetch checkin templates for this tenant
  const { data: checkinTemplates } = await adminClient
    .from("report_templates")
    .select("id, name, schema")
    .eq("tenant_id", dbUser.tenant_id)
    .eq("type", "checkin")
    .eq("is_published", true);

  const templateIds = (checkinTemplates ?? []).map((t: { id: string }) => t.id);

  if (templateIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">チェックイン</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            毎週月曜日にチームのコンディションを確認しましょう
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            チェックインテンプレートが設定されていません。管理者に設定を依頼してください。
          </p>
        </div>
      </div>
    );
  }

  // Fetch recent checkin entries from team
  const { data: entries } = await adminClient
    .from("report_entries")
    .select("id, user_id, template_id, report_date, data, created_at")
    .eq("tenant_id", dbUser.tenant_id)
    .eq("status", "submitted")
    .in("template_id", templateIds)
    .order("report_date", { ascending: false })
    .limit(100);

  // Resolve user names
  const userIds = [...new Set((entries ?? []).map((e: { user_id: string }) => e.user_id))];
  let userMap: Record<string, { name: string; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await adminClient
      .from("users")
      .select("id, name, avatar_url")
      .in("id", userIds);
    userMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; name: string; avatar_url: string | null }) => [u.id, { name: u.name, avatar_url: u.avatar_url }])
    );
  }

  // Build template schema map
  const templateMap = Object.fromEntries(
    (checkinTemplates ?? []).map((t: { id: string; name: string; schema: unknown }) => [
      t.id,
      { name: t.name, schema: t.schema as TemplateSchema },
    ])
  );

  const checkins = (entries ?? []).map((e: { id: string; user_id: string; template_id: string; report_date: string; data: unknown; created_at: string }) => ({
    id: e.id,
    userName: userMap[e.user_id]?.name ?? "不明",
    userAvatar: userMap[e.user_id]?.avatar_url ?? null,
    reportDate: e.report_date,
    data: (e.data ?? {}) as Record<string, unknown>,
    templateId: e.template_id,
    createdAt: e.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">チェックイン</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          毎週月曜日にチームのコンディションを確認しましょう
        </p>
      </div>

      <CheckinsPageClient
        checkins={checkins}
        templateMap={templateMap}
      />
    </div>
  );
}
