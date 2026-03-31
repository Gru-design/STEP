import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listAllTenants, getAdminStats } from "./actions";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Only super_admin can access - verify from database, not user_metadata
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "super_admin") {
    redirect("/");
  }

  // Fetch initial data
  const [tenantsResult, statsResult] = await Promise.all([
    listAllTenants({ page: 1, perPage: 50 }),
    getAdminStats(),
  ]);

  const tenants = tenantsResult.success ? tenantsResult.data ?? [] : [];
  const totalTenants = tenantsResult.success
    ? (tenantsResult as { total?: number }).total ?? 0
    : 0;
  const stats = statsResult.success ? statsResult.data ?? null : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy mb-2">
        スーパーアドミン
      </h1>
      <p className="text-gray mb-8">
        全テナントの管理・監視ダッシュボード
      </p>

      <AdminDashboard
        initialTenants={tenants}
        totalTenants={totalTenants}
        stats={stats}
      />
    </div>
  );
}
