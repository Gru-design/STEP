import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    // usersテーブルにレコードがない場合、user_metadataから自動作成を試みる
    const meta = authUser.user_metadata;
    if (meta?.tenant_id && meta?.name) {
      const { data: createdUser } = await supabase
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

  return (
    <DashboardShell user={user}>
      {children}
      <CheckinModal userId={user.id} tenantId={user.tenant_id} />
      <NudgeTrigger />
    </DashboardShell>
  );
}
