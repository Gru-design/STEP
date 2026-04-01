"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { TemplateSchema, TemplateType, ReportVisibility } from "@/types/database";

// --------------------------------------------------------------------------
// Auth guard: super_admin only
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
// List global templates (tenant_id IS NULL)
// --------------------------------------------------------------------------
export async function listGlobalTemplates() {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("report_templates")
      .select("*")
      .is("tenant_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("[Admin] listGlobalTemplates error:", error);
    return { success: false, error: "グローバルテンプレートの取得に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Create global template
// --------------------------------------------------------------------------
interface CreateGlobalTemplateData {
  name: string;
  type: TemplateType;
  targetRoles: string[];
  schema: TemplateSchema;
  visibilityOverride: ReportVisibility | null;
}

export async function createGlobalTemplate(data: CreateGlobalTemplateData) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: "テンプレート名を入力してください。" };
  }

  try {
    const adminClient = createAdminClient();

    const { data: template, error } = await adminClient
      .from("report_templates")
      .insert({
        tenant_id: null,
        name: data.name.trim(),
        type: data.type,
        target_roles: data.targetRoles,
        schema: data.schema,
        visibility_override: data.visibilityOverride,
        is_system: true,
        is_published: true,
        version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/global-templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("[Admin] createGlobalTemplate error:", error);
    return { success: false, error: "グローバルテンプレートの作成に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Update global template
// --------------------------------------------------------------------------
interface UpdateGlobalTemplateData {
  name?: string;
  type?: TemplateType;
  targetRoles?: string[];
  schema?: TemplateSchema;
  visibilityOverride?: ReportVisibility | null;
  isPublished?: boolean;
}

export async function updateGlobalTemplate(id: string, data: UpdateGlobalTemplateData) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // Verify it's a global template
    const { data: existing } = await adminClient
      .from("report_templates")
      .select("version, tenant_id")
      .eq("id", id)
      .is("tenant_id", null)
      .single();

    if (!existing) {
      return { success: false, error: "グローバルテンプレートが見つかりません。" };
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

    const { error } = await adminClient
      .from("report_templates")
      .update(updateData)
      .eq("id", id)
      .is("tenant_id", null);

    if (error) throw error;

    revalidatePath("/admin/global-templates");
    return { success: true };
  } catch (error) {
    console.error("[Admin] updateGlobalTemplate error:", error);
    return { success: false, error: "グローバルテンプレートの更新に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Delete global template
// --------------------------------------------------------------------------
export async function deleteGlobalTemplate(id: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("report_templates")
      .delete()
      .eq("id", id)
      .is("tenant_id", null);

    if (error) throw error;

    revalidatePath("/admin/global-templates");
    return { success: true };
  } catch (error) {
    console.error("[Admin] deleteGlobalTemplate error:", error);
    return { success: false, error: "グローバルテンプレートの削除に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Apply global templates to ALL tenants
// Copies global templates to each tenant that doesn't already have them.
// --------------------------------------------------------------------------
export async function applyGlobalTemplatesToAllTenants() {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Get all global templates
    const { data: globalTemplates, error: gtError } = await adminClient
      .from("report_templates")
      .select("*")
      .is("tenant_id", null)
      .eq("is_published", true);

    if (gtError) throw gtError;

    if (!globalTemplates || globalTemplates.length === 0) {
      return { success: true, data: { distributed: 0, skipped: 0 } };
    }

    // 2. Get all active tenants
    const { data: tenants, error: tError } = await adminClient
      .from("tenants")
      .select("id")
      .or("is_active.is.null,is_active.eq.true");

    if (tError) throw tError;

    if (!tenants || tenants.length === 0) {
      return { success: true, data: { distributed: 0, skipped: 0 } };
    }

    let distributed = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      // 3. Check which global templates already exist for this tenant
      const { data: existingCopies } = await adminClient
        .from("report_templates")
        .select("source_template_id")
        .eq("tenant_id", tenant.id)
        .not("source_template_id", "is", null);

      const existingSourceIds = new Set(
        (existingCopies ?? []).map((c: { source_template_id: string }) => c.source_template_id)
      );

      // 4. Copy missing global templates
      for (const gt of globalTemplates) {
        if (existingSourceIds.has(gt.id)) {
          skipped++;
          continue;
        }

        const { error: insertError } = await adminClient
          .from("report_templates")
          .insert({
            tenant_id: tenant.id,
            name: gt.name,
            type: gt.type,
            target_roles: gt.target_roles,
            schema: gt.schema,
            visibility_override: gt.visibility_override,
            is_system: true,
            is_published: true,
            version: 1,
            source_template_id: gt.id,
          });

        if (insertError) {
          console.error(
            `[Admin] Failed to copy template ${gt.id} to tenant ${tenant.id}:`,
            insertError
          );
        } else {
          distributed++;
        }
      }
    }

    revalidatePath("/admin/global-templates");
    return { success: true, data: { distributed, skipped } };
  } catch (error) {
    console.error("[Admin] applyGlobalTemplatesToAllTenants error:", error);
    return { success: false, error: "テンプレートの配布に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Apply global templates to a SINGLE tenant
// Used when creating a new tenant.
// --------------------------------------------------------------------------
export async function applyGlobalTemplatesToTenant(tenantId: string) {
  try {
    const adminClient = createAdminClient();

    const { data: globalTemplates, error: gtError } = await adminClient
      .from("report_templates")
      .select("*")
      .is("tenant_id", null)
      .eq("is_published", true);

    if (gtError) throw gtError;

    if (!globalTemplates || globalTemplates.length === 0) {
      return { success: true, data: { copied: 0 } };
    }

    let copied = 0;

    for (const gt of globalTemplates) {
      const { error: insertError } = await adminClient
        .from("report_templates")
        .insert({
          tenant_id: tenantId,
          name: gt.name,
          type: gt.type,
          target_roles: gt.target_roles,
          schema: gt.schema,
          visibility_override: gt.visibility_override,
          is_system: true,
          is_published: true,
          version: 1,
          source_template_id: gt.id,
        });

      if (insertError) {
        console.error(
          `[Admin] Failed to copy global template ${gt.id} to tenant ${tenantId}:`,
          insertError
        );
      } else {
        copied++;
      }
    }

    return { success: true, data: { copied } };
  } catch (error) {
    console.error("[Admin] applyGlobalTemplatesToTenant error:", error);
    return { success: false, error: "グローバルテンプレートの適用に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Get distribution status for a global template
// --------------------------------------------------------------------------
export async function getTemplateDistributionStatus(templateId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const [tenantsResult, copiesResult] = await Promise.all([
      adminClient
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .or("is_active.is.null,is_active.eq.true"),
      adminClient
        .from("report_templates")
        .select("tenant_id", { count: "exact" })
        .eq("source_template_id", templateId),
    ]);

    return {
      success: true,
      data: {
        totalTenants: tenantsResult.count ?? 0,
        distributedCount: copiesResult.count ?? 0,
      },
    };
  } catch (error) {
    console.error("[Admin] getTemplateDistributionStatus error:", error);
    return { success: false, error: "配布状況の取得に失敗しました。" };
  }
}
