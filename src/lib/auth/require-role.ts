import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/types/database";

export type AuthGuardError = { ok: false; error: string };
export type AuthGuardSuccess = {
  ok: true;
  user: User;
  dbUser: { id: string; tenant_id: string; role: Role };
};
export type AuthGuardResult = AuthGuardSuccess | AuthGuardError;

/**
 * Fetch the authenticated user + DB-backed role/tenant_id.
 *
 * SECURITY: always reads `role` and `tenant_id` from `public.users`, NEVER
 * from `user_metadata` (which is user-modifiable via `supabase.auth.updateUser`).
 */
async function resolveAuthUser(): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "認証が必要です。" };
  }

  const admin = createAdminClient();
  const { data: dbUser, error } = await admin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", user.id)
    .single();

  if (error || !dbUser) {
    return { ok: false, error: "ユーザーが見つかりません。" };
  }

  return { ok: true, user, dbUser: dbUser as AuthGuardSuccess["dbUser"] };
}

/**
 * Guard: require super_admin role (sourced from DB, not JWT metadata).
 */
export async function requireSuperAdmin(): Promise<AuthGuardResult> {
  const result = await resolveAuthUser();
  if (!result.ok) return result;
  if (result.dbUser.role !== "super_admin") {
    return { ok: false, error: "スーパーアドミン権限が必要です。" };
  }
  return result;
}

/**
 * Guard: require admin or super_admin role (tenant-admin level).
 */
export async function requireTenantAdmin(): Promise<AuthGuardResult> {
  const result = await resolveAuthUser();
  if (!result.ok) return result;
  if (!["admin", "super_admin"].includes(result.dbUser.role)) {
    return { ok: false, error: "管理者権限が必要です。" };
  }
  return result;
}

/**
 * Guard: require manager/admin/super_admin role.
 */
export async function requireManager(): Promise<AuthGuardResult> {
  const result = await resolveAuthUser();
  if (!result.ok) return result;
  if (!["manager", "admin", "super_admin"].includes(result.dbUser.role)) {
    return { ok: false, error: "マネージャー権限が必要です。" };
  }
  return result;
}

/**
 * Guard: require authenticated user (any role).
 */
export async function requireAuthenticated(): Promise<AuthGuardResult> {
  return resolveAuthUser();
}
