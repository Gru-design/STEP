import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const user = dbUser as User;

  if (!["admin", "super_admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#DC2626] font-medium">
          アクセス権限がありません
        </p>
      </div>
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", user.tenant_id)
    .single();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#DC2626]">
          テナント情報の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#0C025F]">テナント設定</h1>
      <SettingsForm tenant={tenant as Tenant} />
    </div>
  );
}
