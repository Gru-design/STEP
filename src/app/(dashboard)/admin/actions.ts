"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type PlanType } from "@/lib/plan-limits";

// --------------------------------------------------------------------------
// Auth guard: ensures only super_admin can call these actions
// --------------------------------------------------------------------------
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です。" };
  }

  if (user.user_metadata?.role !== "super_admin") {
    return { error: "スーパーアドミン権限が必要です。" };
  }

  return { user };
}

// --------------------------------------------------------------------------
// List all tenants
// --------------------------------------------------------------------------
export async function listAllTenants(options?: {
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 50;
    const offset = (page - 1) * perPage;

    let query = adminClient
      .from("tenants")
      .select("*, users(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const tenants = (data ?? []).map((tenant) => ({
      ...tenant,
      user_count:
        Array.isArray(tenant.users) && tenant.users[0]
          ? (tenant.users[0] as { count: number }).count
          : 0,
    }));

    return {
      success: true,
      data: tenants,
      total: count ?? 0,
      page,
      perPage,
    };
  } catch (error) {
    console.error("[Admin] listAllTenants error:", error);
    return { success: false, error: "テナント一覧の取得に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Create tenant
// --------------------------------------------------------------------------
interface CreateTenantData {
  name: string;
  plan?: PlanType;
  adminEmail: string;
  adminName: string;
}

export async function createTenant(data: CreateTenantData) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: data.name,
        plan: data.plan || "free",
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // 2. Create admin user via Supabase Auth
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email: data.adminEmail,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenant.id,
          role: "admin",
          display_name: data.adminName,
        },
      });

    if (authError) throw authError;

    // 3. Create user record in users table
    const { error: userError } = await adminClient.from("users").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      email: data.adminEmail,
      display_name: data.adminName,
      role: "admin",
    });

    if (userError) throw userError;

    return { success: true, data: tenant };
  } catch (error) {
    console.error("[Admin] createTenant error:", error);
    return { success: false, error: "テナントの作成に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Update tenant plan
// --------------------------------------------------------------------------
export async function updateTenantPlan(tenantId: string, plan: PlanType) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("tenants")
      .update({ plan })
      .eq("id", tenantId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("[Admin] updateTenantPlan error:", error);
    return { success: false, error: "プランの更新に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Deactivate tenant (soft delete)
// --------------------------------------------------------------------------
export async function deactivateTenant(tenantId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("tenants")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("[Admin] deactivateTenant error:", error);
    return { success: false, error: "テナントの無効化に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Get admin stats
// --------------------------------------------------------------------------
export async function getAdminStats() {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const [tenantsResult, usersResult] = await Promise.all([
      adminClient
        .from("tenants")
        .select("id, plan", { count: "exact" }),
      adminClient
        .from("users")
        .select("id", { count: "exact", head: true }),
    ]);

    const tenants = tenantsResult.data ?? [];
    const totalTenants = tenantsResult.count ?? 0;
    const totalUsers = usersResult.count ?? 0;

    // Estimate MRR (Monthly Recurring Revenue)
    // This is a rough estimate - actual MRR would come from Stripe
    const planCounts = tenants.reduce(
      (acc, t) => {
        const plan = (t.plan || "free") as PlanType;
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      success: true,
      data: {
        totalTenants,
        totalUsers,
        planCounts,
      },
    };
  } catch (error) {
    console.error("[Admin] getAdminStats error:", error);
    return { success: false, error: "統計情報の取得に失敗しました。" };
  }
}
