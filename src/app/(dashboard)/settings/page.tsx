import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { User, Tenant } from "@/types/database";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
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

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, plan, domain, settings, report_visibility, created_at, updated_at")
    .eq("id", user.tenant_id)
    .single();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-danger">
          テナント情報の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">テナント設定</h1>
      <SettingsForm tenant={tenant as Tenant} />

      <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">その他の設定</h2>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href="/settings/pipeline"
              className="text-sm text-primary hover:underline"
            >
              パイプラインステージ設定
            </Link>
            <p className="text-xs text-muted-foreground">
              案件管理で使用するステージの追加・編集・並び替え
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
