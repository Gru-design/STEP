import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@/types/database";
import type { Integration } from "@/types/database";
import { IntegrationsClient } from "./IntegrationsClient";

export default async function IntegrationsPage() {
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

  const user = dbUser as User;

  if (!["admin", "super_admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-danger font-medium">
          アクセス権限がありません
        </p>
      </div>
    );
  }

  const { data: integrations } = await supabase
    .from("integrations")
    .select("id, tenant_id, provider, credentials, settings, status, created_at")
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">外部連携</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          外部サービスとの連携を設定します。通知の送信やデータの自動取得が可能になります。
        </p>
      </div>
      <IntegrationsClient integrations={(integrations as Integration[]) || []} />
    </div>
  );
}
