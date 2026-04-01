import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";
import type { User, Plan } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // admin clientでユーザー取得（custom_access_token_hookが未設定でもRLSに影響されない）
  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    // usersテーブルにレコードがない場合、user_metadataから自動作成を試みる
    // RLSにINSERTポリシーがないため、admin clientを使用
    const meta = authUser.user_metadata;
    if (meta?.tenant_id && meta?.name) {
      const { data: createdUser } = await adminClient
        .from("users")
        .insert({
          id: authUser.id,
          tenant_id: meta.tenant_id,
          email: authUser.email ?? "",
          name: meta.name,
          role: meta.role ?? "member",
        })
        .select("*")
        .single();

      if (!createdUser) {
        // ユーザー作成も失敗 → セッションを破棄してからログインへ
        await supabase.auth.signOut();
        redirect("/login?error=user_setup_failed");
      }

      const user = createdUser as User;
      const { data: newTenant } = await adminClient
        .from("tenants")
        .select("plan")
        .eq("id", user.tenant_id)
        .single();
      const newPlan = (newTenant?.plan as Plan) ?? "free";
      return (
        <DashboardShell user={user} plan={newPlan}>
          {children}
          <CheckinModal userId={user.id} tenantId={user.tenant_id} />
          <NudgeTrigger />
        </DashboardShell>
      );
    }
    // tenant_id/name がメタデータにない → セッションを破棄してループを防止
    await supabase.auth.signOut();
    redirect("/login?error=no_user_record");
  }

  const user = dbUser as User;

  // Tenant info (plan + theme)
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("plan, settings")
    .eq("id", user.tenant_id)
    .single();

  const tenantPlan = (tenant?.plan as Plan) ?? "free";
  const theme = extractTheme(
    (tenant?.settings as Record<string, unknown>) ?? null
  );
  const themeStyle = themeToStyle(theme);

  return (
    <div style={themeStyle ?? undefined}>
      <DashboardShell user={user} plan={tenantPlan} appName={theme.appName} logoUrl={theme.logoUrl}>
        {children}
        <CheckinModal userId={user.id} tenantId={user.tenant_id} />
        <NudgeTrigger />
      </DashboardShell>
    </div>
  );
}
