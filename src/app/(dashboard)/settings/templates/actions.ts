"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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

async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { supabase, user: null, error: "認証されていません" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { supabase, user: null, error: "権限がありません" };
  }

  return { supabase, user: dbUser, error: null };
}

export async function createTemplate(data: CreateTemplateData) {
  const { supabase, user, error: authError } = await getAdminUser();

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

  const { data: template, error } = await supabase
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
    return { success: false, error: "テンプレートの作成に失敗しました" };
  }

  revalidatePath("/settings/templates");
  return { success: true, data: template };
}

export async function updateTemplate(id: string, data: UpdateTemplateData) {
  const { supabase, user, error: authError } = await getAdminUser();

  if (!user) {
    return { success: false, error: authError };
  }

  // Fetch existing template to verify ownership and get current version
  const { data: existing } = await supabase
    .from("report_templates")
    .select("version, tenant_id")
    .eq("id", id)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!existing) {
    return { success: false, error: "テンプレートが見つかりません" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    version: existing.version + 1,
  };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.targetRoles !== undefined) updateData.target_roles = data.targetRoles;
  if (data.schema !== undefined) updateData.schema = data.schema;
  if (data.visibilityOverride !== undefined) updateData.visibility_override = data.visibilityOverride;
  if (data.isPublished !== undefined) updateData.is_published = data.isPublished;

  const { error } = await supabase
    .from("report_templates")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", user.tenant_id);

  if (error) {
    return { success: false, error: "テンプレートの更新に失敗しました" };
  }

  revalidatePath("/settings/templates");
  revalidatePath(`/settings/templates/${id}`);
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const { supabase, user, error: authError } = await getAdminUser();

  if (!user) {
    return { success: false, error: authError };
  }

  const { error } = await supabase
    .from("report_templates")
    .delete()
    .eq("id", id)
    .eq("tenant_id", user.tenant_id);

  if (error) {
    return { success: false, error: "テンプレートの削除に失敗しました" };
  }

  revalidatePath("/settings/templates");
  return { success: true };
}

export async function publishTemplate(id: string, isPublished: boolean) {
  const { supabase, user, error: authError } = await getAdminUser();

  if (!user) {
    return { success: false, error: authError };
  }

  const { error } = await supabase
    .from("report_templates")
    .update({
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", user.tenant_id);

  if (error) {
    return { success: false, error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/settings/templates");
  return { success: true };
}

export async function duplicateTemplate(id: string) {
  const { supabase, user, error: authError } = await getAdminUser();

  if (!user) {
    return { success: false, error: authError };
  }

  const { data: original } = await supabase
    .from("report_templates")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!original) {
    return { success: false, error: "テンプレートが見つかりません" };
  }

  const { data: template, error } = await supabase
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
    return { success: false, error: "テンプレートの複製に失敗しました" };
  }

  revalidatePath("/settings/templates");
  return { success: true, data: template };
}
