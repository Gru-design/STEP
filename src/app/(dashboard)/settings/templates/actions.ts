"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { templatesCacheTag } from "@/lib/cache";
import type { TemplateSchema, TemplateType, ReportVisibility } from "@/types/database";

interface CreateTemplateData {
  name: string;
  type: TemplateType;
  targetRoles: string[];
  schema: TemplateSchema;
  visibilityOverride: ReportVisibility | null;
  isPublished: boolean;
}

interface UpdateTemplateData {
  name?: string;
  type?: TemplateType;
  targetRoles?: string[];
  schema?: TemplateSchema;
  visibilityOverride?: ReportVisibility | null;
  isPublished?: boolean;
}

/**
 * Authenticate user and verify admin role.
 * Uses createClient() for auth verification (respects session),
 * and returns createAdminClient() for data operations
 * (bypasses RLS since role is already verified in app code).
 *
 * This is necessary because RLS INSERT/UPDATE/DELETE policies check
 * auth.jwt() ->> 'role', which may not be set in the JWT token
 * if the custom_access_token_hook is not configured in Supabase.
 */
async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { admin: null as unknown as ReturnType<typeof createAdminClient>, user: null, error: "認証されていません" };
  }

  // Use admin client for DB reads to avoid RLS issues on users table too
  const admin = createAdminClient();

  const { data: dbUser } = await admin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { admin, user: null, error: "権限がありません" };
  }

  return { admin, user: dbUser, error: null };
}

export async function createTemplate(data: CreateTemplateData) {
  try {
    const { admin, user, error: authError } = await getAdminUser();

    if (!user) {
      return { success: false, error: authError };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "テンプレート名を入力してください" };
    }

    const validTypes: TemplateType[] = ["daily", "weekly", "plan", "checkin"];
    if (!validTypes.includes(data.type)) {
      return { success: false, error: "無効なテンプレート種別です" };
    }

    const { data: template, error } = await admin
      .from("report_templates")
      .insert({
        tenant_id: user.tenant_id,
        name: data.name.trim(),
        type: data.type,
        target_roles: data.targetRoles,
        schema: data.schema,
        visibility_override: data.visibilityOverride,
        is_published: data.isPublished,
        is_system: false,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("[Templates] createTemplate error:", error);
      return { success: false, error: "テンプレートの作成に失敗しました" };
    }

    await writeAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "create",
      resource: "template",
      resourceId: template.id,
    });

    revalidatePath("/settings/templates");
    revalidateTag(templatesCacheTag(user.tenant_id), "default");
    return { success: true, data: template };
  } catch (err) {
    console.error("[Templates] createTemplate unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function updateTemplate(id: string, data: UpdateTemplateData) {
  try {
    const { admin, user, error: authError } = await getAdminUser();

    if (!user) {
      return { success: false, error: authError };
    }

    // Fetch existing template to verify ownership and get current version
    const { data: existing } = await admin
      .from("report_templates")
      .select("version, tenant_id, source_template_id")
      .eq("id", id)
      .eq("tenant_id", user.tenant_id)
      .single();

    if (!existing) {
      return { success: false, error: "テンプレートが見つかりません" };
    }

    // グローバルテンプレートのコピーを編集した場合、
    // 紐付けを解除してテナント独自テンプレートに切り離す
    const detachFromGlobal = !!existing.source_template_id;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      version: existing.version + 1,
    };

    if (detachFromGlobal) {
      updateData.source_template_id = null;
      updateData.is_system = false;
    }

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetRoles !== undefined) updateData.target_roles = data.targetRoles;
    if (data.schema !== undefined) updateData.schema = data.schema;
    if (data.visibilityOverride !== undefined) updateData.visibility_override = data.visibilityOverride;
    if (data.isPublished !== undefined) updateData.is_published = data.isPublished;

    const { error } = await admin
      .from("report_templates")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", user.tenant_id);

    if (error) {
      console.error("[Templates] updateTemplate error:", error);
      return { success: false, error: "テンプレートの更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "update",
      resource: "template",
      resourceId: id,
    });

    revalidatePath("/settings/templates");
    revalidatePath(`/settings/templates/${id}`);
    revalidateTag(templatesCacheTag(user.tenant_id), "default");
    return { success: true };
  } catch (err) {
    console.error("[Templates] updateTemplate unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteTemplate(id: string) {
  try {
    const { admin, user, error: authError } = await getAdminUser();

    if (!user) {
      return { success: false, error: authError };
    }

    // Check if this is a global template copy
    const { data: templateToDelete } = await admin
      .from("report_templates")
      .select("source_template_id")
      .eq("id", id)
      .eq("tenant_id", user.tenant_id)
      .single();

    if (!templateToDelete) {
      return { success: false, error: "テンプレートが見つかりません" };
    }

    if (templateToDelete.source_template_id) {
      return { success: false, error: "共通テンプレートは削除できません。システム管理者にお問い合わせください。" };
    }

    const { error } = await admin
      .from("report_templates")
      .delete()
      .eq("id", id)
      .eq("tenant_id", user.tenant_id);

    if (error) {
      console.error("[Templates] deleteTemplate error:", error);
      return { success: false, error: "テンプレートの削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "delete",
      resource: "template",
      resourceId: id,
    });

    revalidatePath("/settings/templates");
    revalidateTag(templatesCacheTag(user.tenant_id), "default");
    return { success: true };
  } catch (err) {
    console.error("[Templates] deleteTemplate unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function publishTemplate(id: string, isPublished: boolean) {
  try {
    const { admin, user, error: authError } = await getAdminUser();

    if (!user) {
      return { success: false, error: authError };
    }

    // Check if this is a global template copy
    const { data: templateToPublish } = await admin
      .from("report_templates")
      .select("source_template_id")
      .eq("id", id)
      .eq("tenant_id", user.tenant_id)
      .single();

    if (!templateToPublish) {
      return { success: false, error: "テンプレートが見つかりません" };
    }

    if (templateToPublish.source_template_id) {
      return { success: false, error: "共通テンプレートの公開設定は変更できません。システム管理者にお問い合わせください。" };
    }

    const { error } = await admin
      .from("report_templates")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", user.tenant_id);

    if (error) {
      console.error("[Templates] publishTemplate error:", error);
      return { success: false, error: "ステータスの更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "update",
      resource: "template",
      resourceId: id,
      details: { published: isPublished },
    });

    revalidatePath("/settings/templates");
    revalidateTag(templatesCacheTag(user.tenant_id), "default");
    return { success: true };
  } catch (err) {
    console.error("[Templates] publishTemplate unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function duplicateTemplate(id: string) {
  try {
    const { admin, user, error: authError } = await getAdminUser();

    if (!user) {
      return { success: false, error: authError };
    }

    const { data: original } = await admin
      .from("report_templates")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", user.tenant_id)
      .single();

    if (!original) {
      return { success: false, error: "テンプレートが見つかりません" };
    }

    const { data: template, error } = await admin
      .from("report_templates")
      .insert({
        tenant_id: user.tenant_id,
        name: `${original.name}(コピー)`,
        type: original.type,
        target_roles: original.target_roles,
        schema: original.schema,
        visibility_override: original.visibility_override,
        is_published: false,
        is_system: false,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("[Templates] duplicateTemplate error:", error);
      return { success: false, error: "テンプレートの複製に失敗しました" };
    }

    await writeAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "create",
      resource: "template",
      resourceId: template.id,
      details: { duplicated_from: id },
    });

    revalidatePath("/settings/templates");
    revalidateTag(templatesCacheTag(user.tenant_id), "default");
    return { success: true, data: template };
  } catch (err) {
    console.error("[Templates] duplicateTemplate unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
