"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type PlanType } from "@/lib/plan-limits";
import { writeAuditLog } from "@/lib/audit";
import { applyGlobalTemplatesToTenant } from "./global-templates/actions";

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
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email: data.adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenant.id,
          role: "admin",
          name: data.adminName,
        },
      });

    if (authError) throw authError;

    // 3. handle_new_user trigger may have already created the user record
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("id", authUser.user.id)
      .single();

    if (existingUser) {
      // Trigger created it — ensure role is correct
      await adminClient
        .from("users")
        .update({ role: "admin", name: data.adminName })
        .eq("id", authUser.user.id);
    } else {
      const { error: userError } = await adminClient.from("users").insert({
        id: authUser.user.id,
        tenant_id: tenant.id,
        email: data.adminEmail,
        name: data.adminName,
        role: "admin",
      });

      if (userError) throw userError;
    }

    // 4. Auto-apply global templates to the new tenant
    const templateResult = await applyGlobalTemplatesToTenant(tenant.id);
    if (!templateResult.success) {
      console.error("[Admin] Failed to apply global templates:", templateResult.error);
    }

    await writeAuditLog({
      tenantId: tenant.id,
      userId: auth.user!.id,
      action: "create",
      resource: "tenant",
      resourceId: tenant.id,
      details: { name: data.name, globalTemplatesCopied: templateResult.data?.copied ?? 0 },
    });

    return { success: true, data: { ...tenant, tempPassword } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] createTenant error:", message, error);
    return { success: false, error: `テナントの作成に失敗しました: ${message}` };
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

    await writeAuditLog({
      tenantId,
      userId: auth.user!.id,
      action: "update",
      resource: "tenant_plan",
      resourceId: tenantId,
      details: { plan },
    });

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

    await writeAuditLog({
      tenantId,
      userId: auth.user!.id,
      action: "delete",
      resource: "tenant",
      resourceId: tenantId,
    });

    return { success: true };
  } catch (error) {
    console.error("[Admin] deactivateTenant error:", error);
    return { success: false, error: "テナントの無効化に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Delete tenant (hard delete — removes all data and auth users)
// --------------------------------------------------------------------------
export async function deleteTenant(tenantId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // Prevent deleting the STEP運営 tenant
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    if (tenant?.name === "STEP運営") {
      return { success: false, error: "運営テナントは削除できません。" };
    }

    // 1. Get all users belonging to this tenant
    const { data: tenantUsers } = await adminClient
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId);

    // 2. Delete auth users (users table records cascade-delete from auth.users)
    for (const u of tenantUsers ?? []) {
      await adminClient.auth.admin.deleteUser(u.id);
    }

    // 3. Delete tenant (CASCADE removes teams, team_members, etc.)
    const { error } = await adminClient
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    if (error) throw error;

    await writeAuditLog({
      tenantId,
      userId: auth.user!.id,
      action: "delete",
      resource: "tenant",
      resourceId: tenantId,
      details: { hard_delete: true },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] deleteTenant error:", message, error);
    return { success: false, error: `テナントの削除に失敗しました: ${message}` };
  }
}

// --------------------------------------------------------------------------
// List users for a specific tenant
// --------------------------------------------------------------------------
export async function listTenantUsers(tenantId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("users")
      .select("id, email, name, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("[Admin] listTenantUsers error:", error);
    return { success: false, error: "ユーザー一覧の取得に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Delete a specific user (super_admin only)
// --------------------------------------------------------------------------
export async function deleteUser(userId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // Prevent deleting yourself
    if (userId === auth.user!.id) {
      return { success: false, error: "自分自身は削除できません。" };
    }

    // Prevent deleting other super_admins
    const { data: targetUser } = await adminClient
      .from("users")
      .select("role, tenant_id")
      .eq("id", userId)
      .single();

    if (targetUser?.role === "super_admin") {
      return { success: false, error: "スーパーアドミンは削除できません。" };
    }

    // Delete auth user (cascade deletes users table record)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    await writeAuditLog({
      tenantId: targetUser?.tenant_id ?? "",
      userId: auth.user!.id,
      action: "delete",
      resource: "user",
      resourceId: userId,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] deleteUser error:", message, error);
    return { success: false, error: `ユーザーの削除に失敗しました: ${message}` };
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
