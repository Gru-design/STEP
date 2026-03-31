"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
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
  tenantId: string,
  email: string,
  name: string,
  role: Role
): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; name: string; email: string; role: string; created_at: string };
}> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "権限がありません" };

  const supabase = createAdminClient();

  // Create auth user with temporary password
  const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { tenant_id: tenantId, name, role },
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

  // Check if handle_new_user trigger already created the record
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", authData.user.id)
    .single();

  if (!existingUser) {
    await supabase.from("users").insert({
      id: authData.user.id,
      tenant_id: tenantId,
      email,
      name,
      role,
    });
  } else {
    // Update role if trigger set default
    await supabase
      .from("users")
      .update({ role })
      .eq("id", authData.user.id);
  }

  await writeAuditLog({
    tenantId: admin.tenant_id,
    userId: admin.id,
    action: "create",
    resource: "user",
    resourceId: authData.user.id,
    details: { email, role },
  });

  return {
    success: true,
    user: {
      id: authData.user.id,
      name,
      email,
      role,
      created_at: new Date().toISOString(),
    },
  };
}

export async function updateUserRole(
  userId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "権限がありません" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("tenant_id", admin.tenant_id);

  if (error) return { success: false, error: "ロールの更新に失敗しました" };

  // Update auth metadata too
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole },
  });

  await writeAuditLog({
    tenantId: admin.tenant_id,
    userId: admin.id,
    action: "update",
    resource: "user",
    resourceId: userId,
    details: { new_role: newRole },
  });

  return { success: true };
}

export async function deactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "権限がありません" };

  if (userId === admin.id) {
    return { success: false, error: "自分自身を無効化することはできません" };
  }

  const supabase = createAdminClient();

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
}
