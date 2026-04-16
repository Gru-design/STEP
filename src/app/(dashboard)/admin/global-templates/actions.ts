"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import type { TemplateSchema, TemplateType, ReportVisibility } from "@/types/database";
import { writeAuditLog } from "@/lib/audit";
import { templatesCacheTag } from "@/lib/cache";
import { requireSuperAdmin } from "@/lib/auth/require-role";

/**
 * Invalidate template caches for all active tenants.
 * Called when global templates are modified (create/update/delete/sync).
 */
async function invalidateAllTenantTemplateCaches() {
  const adminClient = createAdminClient();
  const { data: tenants } = await adminClient
    .from("tenants")
    .select("id")
    .or("is_active.is.null,is_active.eq.true");

  for (const tenant of tenants ?? []) {
    revalidateTag(templatesCacheTag(tenant.id), "default");
  }
}

// --------------------------------------------------------------------------
// List global templates (tenant_id IS NULL)
// --------------------------------------------------------------------------
export async function listGlobalTemplates() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("report_templates")
      .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
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
  if (!auth.ok) {
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

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "create",
      resource: "global_template",
      resourceId: template.id,
      details: { name: data.name.trim(), type: data.type },
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
    return { success: true, data: template };
  } catch (error: unknown) {
    const supaErr = error as { code?: string; message?: string; details?: string; hint?: string };
    console.error("[Admin] createGlobalTemplate error:", {
      code: supaErr.code,
      message: supaErr.message,
      details: supaErr.details,
      hint: supaErr.hint,
    });
    return { success: false, error: "グローバルテンプレートの作成に失敗しました" };
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
  if (!auth.ok) {
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

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "update",
      resource: "global_template",
      resourceId: id,
      details: { updatedFields: Object.keys(updateData).filter((k) => k !== "updated_at" && k !== "version") },
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
    return { success: true };
  } catch (error: unknown) {
    const supaErr = error as { code?: string; message?: string; details?: string; hint?: string };
    console.error("[Admin] updateGlobalTemplate error:", {
      code: supaErr.code,
      message: supaErr.message,
      details: supaErr.details,
      hint: supaErr.hint,
    });
    return { success: false, error: "グローバルテンプレートの更新に失敗しました" };
  }
}

// --------------------------------------------------------------------------
// Delete global template
// --------------------------------------------------------------------------
export async function deleteGlobalTemplate(id: string) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
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

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "delete",
      resource: "global_template",
      resourceId: id,
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
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
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Get all global templates
    const { data: globalTemplates, error: gtError } = await adminClient
      .from("report_templates")
      .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
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

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "create",
      resource: "global_template",
      details: { operation: "apply_to_all_tenants", distributed, skipped },
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
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
      .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
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

    revalidateTag(templatesCacheTag(tenantId), "default");
    return { success: true, data: { copied } };
  } catch (error) {
    console.error("[Admin] applyGlobalTemplatesToTenant error:", error);
    return { success: false, error: "グローバルテンプレートの適用に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Sync a global template to ALL existing tenant copies
// Updates name, type, schema, target_roles, visibility for all copies.
// --------------------------------------------------------------------------
export async function syncGlobalTemplateToTenants(globalTemplateId: string) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Get the global template
    const { data: globalTemplate, error: gtError } = await adminClient
      .from("report_templates")
      .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
      .eq("id", globalTemplateId)
      .is("tenant_id", null)
      .single();

    if (gtError || !globalTemplate) {
      return { success: false, error: "グローバルテンプレートが見つかりません。" };
    }

    // 2. Find all tenant copies
    const { data: copies, error: copyError } = await adminClient
      .from("report_templates")
      .select("id, tenant_id")
      .eq("source_template_id", globalTemplateId);

    if (copyError) throw copyError;

    if (!copies || copies.length === 0) {
      return { success: true, data: { updated: 0, created: 0 } };
    }

    // 3. Update each copy with the global template's current state
    let updated = 0;
    for (const copy of copies) {
      const { error: updateError } = await adminClient
        .from("report_templates")
        .update({
          name: globalTemplate.name,
          type: globalTemplate.type,
          target_roles: globalTemplate.target_roles,
          schema: globalTemplate.schema,
          visibility_override: globalTemplate.visibility_override,
          version: globalTemplate.version,
          updated_at: new Date().toISOString(),
        })
        .eq("id", copy.id);

      if (updateError) {
        console.error(
          `[Admin] Failed to sync template ${copy.id} in tenant ${copy.tenant_id}:`,
          updateError
        );
      } else {
        updated++;
      }
    }

    // 4. Also distribute to tenants that don't have a copy yet
    const copiedTenantIds = new Set(copies.map((c: { id: string; tenant_id: string }) => c.tenant_id));

    const { data: allTenants } = await adminClient
      .from("tenants")
      .select("id")
      .or("is_active.is.null,is_active.eq.true");

    let created = 0;
    for (const tenant of allTenants ?? []) {
      if (copiedTenantIds.has(tenant.id)) continue;

      const { error: insertError } = await adminClient
        .from("report_templates")
        .insert({
          tenant_id: tenant.id,
          name: globalTemplate.name,
          type: globalTemplate.type,
          target_roles: globalTemplate.target_roles,
          schema: globalTemplate.schema,
          visibility_override: globalTemplate.visibility_override,
          is_system: true,
          is_published: true,
          version: globalTemplate.version,
          source_template_id: globalTemplate.id,
        });

      if (!insertError) created++;
    }

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "update",
      resource: "global_template",
      resourceId: globalTemplateId,
      details: { operation: "sync_to_tenants", updated, created },
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
    return { success: true, data: { updated, created } };
  } catch (error) {
    console.error("[Admin] syncGlobalTemplateToTenants error:", error);
    return { success: false, error: "テンプレートの同期に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Promote a tenant template to a global template
// Copies the tenant template as a new global template (tenant_id = NULL).
// --------------------------------------------------------------------------
export async function promoteToGlobalTemplate(tenantTemplateId: string) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Fetch the tenant template
    const { data: source, error: fetchError } = await adminClient
      .from("report_templates")
      .select("*, tenants!inner(name)")
      .eq("id", tenantTemplateId)
      .not("tenant_id", "is", null)
      .single();

    if (fetchError || !source) {
      return { success: false, error: "テンプレートが見つかりません。" };
    }

    const tenantName = (source.tenants as { name: string })?.name ?? "";

    // 2. Create the global copy
    const { data: globalTemplate, error: insertError } = await adminClient
      .from("report_templates")
      .insert({
        tenant_id: null,
        name: source.name,
        type: source.type,
        target_roles: source.target_roles,
        schema: source.schema,
        visibility_override: source.visibility_override,
        is_system: true,
        is_published: true,
        version: 1,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Link the original as a copy of this new global template
    await adminClient
      .from("report_templates")
      .update({ source_template_id: globalTemplate.id })
      .eq("id", tenantTemplateId);

    await writeAuditLog({
      tenantId: auth.dbUser.tenant_id,
      userId: auth.user.id,
      action: "create",
      resource: "global_template",
      resourceId: globalTemplate.id,
      details: { operation: "promote_from_tenant", sourceTenantTemplateId: tenantTemplateId, sourceTenantName: tenantName },
    });

    revalidatePath("/admin/global-templates");
    await invalidateAllTenantTemplateCaches();
    return {
      success: true,
      data: {
        globalTemplateId: globalTemplate.id,
        sourceTenantName: tenantName,
      },
    };
  } catch (error) {
    console.error("[Admin] promoteToGlobalTemplate error:", error);
    return { success: false, error: "グローバルテンプレートへの昇格に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// List all tenant templates (for the promote picker)
// --------------------------------------------------------------------------
export async function listAllTenantTemplates(options?: {
  search?: string;
  type?: TemplateType;
}) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from("report_templates")
      .select("*, tenants!inner(name)")
      .not("tenant_id", "is", null)
      .is("source_template_id", null) // Exclude copies of global templates
      .order("updated_at", { ascending: false })
      .limit(50);

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }
    if (options?.type) {
      query = query.eq("type", options.type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("[Admin] listAllTenantTemplates error:", error);
    return { success: false, error: "テナントテンプレートの取得に失敗しました。" };
  }
}

// --------------------------------------------------------------------------
// Get distribution status for a global template
// --------------------------------------------------------------------------
export async function getTemplateDistributionStatus(templateId: string) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
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
