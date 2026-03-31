import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    redirect("/dashboard");
  }

  const { data: users } = await adminClient
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("tenant_id", dbUser.tenant_id)
    .order("created_at");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">ユーザー管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          メンバーの招待・ロール変更・無効化
        </p>
      </div>
      <UserManagementClient
        users={users ?? []}
        tenantId={dbUser.tenant_id}
      />
    </div>
  );
}
