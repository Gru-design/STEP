import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";
import type { User } from "@/types/database";

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
      const adminClient = createAdminClient();
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
        redirect("/login");
      }

      const user = createdUser as User;
      return (
        <DashboardShell user={user}>
          {children}
          <CheckinModal userId={user.id} tenantId={user.tenant_id} />
          <NudgeTrigger />
        </DashboardShell>
      );
    }
    redirect("/login");
  }

  const user = dbUser as User;

  // Tenant theme (white-label)
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("settings")
    .eq("id", user.tenant_id)
    .single();

  const theme = extractTheme(
    (tenant?.settings as Record<string, unknown>) ?? null
  );
  const themeStyle = themeToStyle(theme);

  return (
    <div style={themeStyle ?? undefined}>
      <DashboardShell user={user} appName={theme.appName} logoUrl={theme.logoUrl}>
        {children}
        <CheckinModal userId={user.id} tenantId={user.tenant_id} />
        <NudgeTrigger />
      </DashboardShell>
    </div>
  );
}
