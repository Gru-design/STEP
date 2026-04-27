"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { inviteUserSchema } from "@/lib/validations";
import type { Role } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) return null;
  return dbUser;
}

export async function inviteUser(
  email: string,
  name: string,
  role: Role
): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; name: string; email: string; role: string; created_at: string; tempPassword: string };
}> {
  // Validate at the boundary. `role: Role` is a compile-time type that a
  // client cannot rely on — the Server Action is reachable from anywhere, so
  // we must reject super_admin here (only `updateUserRole` previously did).
  const parsed = inviteUserSchema.safeParse({ email, name, role });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const input = parsed.data;

  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: "権限がありません" };

    // テナントIDは認証済み管理者から取得（クライアント入力は使わない）
    const tenantId = admin.tenant_id;
    const supabase = createAdminClient();

    // Create auth user with temporary password
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

    // Do NOT put tenant_id or role in user_metadata — public.users is the
    // single source of truth that the JWT hook reads from. See 00034.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: input.name },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return { success: false, error: "このメールアドレスは既に登録されています" };
      }
      return { success: false, error: "ユーザーの作成に失敗しました" };
    }

    if (!authData.user) {
      return { success: false, error: "ユーザーの作成に失敗しました" };
    }

    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      tenant_id: tenantId,
      email: input.email,
      name: input.name,
      role: input.role,
    });

    if (userError) {
      // Roll the auth user back so the next invite attempt with the same
      // email is not blocked by a half-created account.
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackErr) {
        console.error("[Users] Rollback: failed to delete auth user:", rollbackErr);
      }
      return { success: false, error: "ユーザーの作成に失敗しました" };
    }

    await writeAuditLog({
      tenantId: admin.tenant_id,
      userId: admin.id,
      action: "create",
      resource: "user",
      resourceId: authData.user.id,
      details: { email: input.email, role: input.role },
    });

    return {
      success: true,
      user: {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role: input.role,
        created_at: new Date().toISOString(),
        tempPassword,
      },
    };
  } catch (err) {
    console.error("[Users] inviteUser unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: "権限がありません" };

    // super_admin のロール変更を禁止
    const supabase = createAdminClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .eq("tenant_id", admin.tenant_id)
      .single();

    if (!targetUser) {
      return { success: false, error: "対象ユーザーが見つかりません" };
    }

    if (targetUser.role === "super_admin") {
      return { success: false, error: "スーパーアドミンのロールは変更できません" };
    }

    // super_admin への昇格も禁止 (CLIまたはSQL Editorからのみ)
    if (newRole === "super_admin") {
      return { success: false, error: "スーパーアドミンへの昇格はできません" };
    }

    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId)
      .eq("tenant_id", admin.tenant_id);

    if (error) return { success: false, error: "ロールの更新に失敗しました" };

    // Do not mirror role into auth.user_metadata. The JWT hook reads role
    // from public.users, and user_metadata is mutable by the user, so
    // writing it would only create a misleading second copy.

    await writeAuditLog({
      tenantId: admin.tenant_id,
      userId: admin.id,
      action: "update",
      resource: "user",
      resourceId: userId,
      details: { new_role: newRole },
    });

    return { success: true };
  } catch (err) {
    console.error("[Users] updateUserRole unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: "権限がありません" };

    if (userId === admin.id) {
      return { success: false, error: "自分自身を無効化することはできません" };
    }

    const supabase = createAdminClient();

    // テナント検証 + super_admin の削除を禁止
    const { data: targetUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .eq("tenant_id", admin.tenant_id)
      .single();

    if (!targetUser) {
      return { success: false, error: "対象ユーザーが見つかりません" };
    }

    if (targetUser.role === "super_admin") {
      return { success: false, error: "スーパーアドミンは無効化できません" };
    }

    // Delete from users table (cascade will clean up team_members etc.)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("tenant_id", admin.tenant_id);

    if (error) return { success: false, error: "ユーザーの無効化に失敗しました" };

    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);

    await writeAuditLog({
      tenantId: admin.tenant_id,
      userId: admin.id,
      action: "delete",
      resource: "user",
      resourceId: userId,
    });

    return { success: true };
  } catch (err) {
    console.error("[Users] deactivateUser unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
