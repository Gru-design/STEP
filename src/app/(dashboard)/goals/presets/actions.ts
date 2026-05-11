"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticated } from "@/lib/auth/require-role";
import { writeAuditLog } from "@/lib/audit";
import { checkFeatureAccess } from "@/lib/plan-gate";
import { getKpiCandidateFields } from "@/lib/templates/fields";
import { upsertGoalPresetSchema } from "@/lib/validations";
import type { Role, TemplateSchema } from "@/types/database";

function isManager(role: Role): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}

interface PresetItemInput {
  id?: string;
  name: string;
  report_template_id?: string | null;
  kpi_field_key?: string | null;
  default_target_value: number;
  sort_order?: number;
}

interface UpsertPresetInput {
  name: string;
  description?: string | null;
  default_level: "company" | "department" | "team" | "individual";
  items: PresetItemInput[];
}

/**
 * Validate that every (report_template_id, kpi_field_key) pair in the
 * items refers to a real numeric/rating field in the template's schema
 * and that the template belongs to this tenant (or is system-owned).
 */
async function validatePresetItems(
  adminClient: ReturnType<typeof createAdminClient>,
  tenantId: string,
  items: PresetItemInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const templateIds = Array.from(
    new Set(
      items
        .map((i) => i.report_template_id)
        .filter((v): v is string => !!v)
    )
  );
  if (templateIds.length === 0) return { ok: true };

  const { data: templates, error } = await adminClient
    .from("report_templates")
    .select("id, tenant_id, schema")
    .in("id", templateIds);
  if (error || !templates) {
    return { ok: false, error: "テンプレートの取得に失敗しました" };
  }

  const templateMap = new Map(templates.map((t) => [t.id, t]));

  for (const item of items) {
    if (!item.report_template_id) continue;
    const template = templateMap.get(item.report_template_id);
    if (!template) {
      return {
        ok: false,
        error: `項目「${item.name}」のテンプレートが見つかりません`,
      };
    }
    if (template.tenant_id && template.tenant_id !== tenantId) {
      return {
        ok: false,
        error: `項目「${item.name}」のテンプレートが見つかりません`,
      };
    }
    if (item.kpi_field_key) {
      const candidates = getKpiCandidateFields(
        template.schema as TemplateSchema
      );
      const exists = candidates.some((c) => c.key === item.kpi_field_key);
      if (!exists) {
        return {
          ok: false,
          error: `項目「${item.name}」のKPIフィールドがテンプレートに存在しません`,
        };
      }
    }
  }
  return { ok: true };
}

export async function createGoalPreset(input: UpsertPresetInput): Promise<{
  success: boolean;
  presetId?: string;
  error?: string;
}> {
  const parsed = upsertGoalPresetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    if (!isManager(dbUser.role)) {
      return {
        success: false,
        error: "プリセットを作成する権限がありません",
      };
    }

    const gate = await checkFeatureAccess(dbUser.tenant_id, "goals");
    if (!gate.allowed) {
      return { success: false, error: gate.error };
    }

    const adminClient = createAdminClient();
    const validation = await validatePresetItems(
      adminClient,
      dbUser.tenant_id,
      input.items
    );
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const { data: presetRow, error: presetError } = await adminClient
      .from("goal_presets")
      .insert({
        tenant_id: dbUser.tenant_id,
        name: input.name,
        description: input.description ?? null,
        default_level: input.default_level,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (presetError || !presetRow) {
      console.error("[GoalPresets] Insert failed:", presetError);
      return { success: false, error: "プリセットの作成に失敗しました" };
    }

    const itemsToInsert = input.items.map((item, idx) => ({
      preset_id: presetRow.id,
      name: item.name,
      report_template_id: item.report_template_id ?? null,
      kpi_field_key: item.kpi_field_key ?? null,
      default_target_value: item.default_target_value,
      sort_order: item.sort_order ?? idx,
    }));

    const { error: itemsError } = await adminClient
      .from("goal_preset_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("[GoalPresets] Item insert failed:", itemsError);
      await adminClient.from("goal_presets").delete().eq("id", presetRow.id);
      return { success: false, error: "プリセット項目の作成に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "create",
      resource: "goal_preset",
      resourceId: presetRow.id,
      details: { name: input.name, itemCount: input.items.length },
    });

    revalidatePath("/goals");
    revalidatePath("/goals/presets");
    return { success: true, presetId: presetRow.id };
  } catch (err) {
    console.error("[GoalPresets] createGoalPreset unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function updateGoalPreset(
  presetId: string,
  input: UpsertPresetInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = upsertGoalPresetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    if (!isManager(dbUser.role)) {
      return {
        success: false,
        error: "プリセットを更新する権限がありません",
      };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("goal_presets")
      .select("id, tenant_id")
      .eq("id", presetId)
      .single();
    if (!existing || existing.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "プリセットが見つかりません" };
    }

    const validation = await validatePresetItems(
      adminClient,
      dbUser.tenant_id,
      input.items
    );
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const { error: updateError } = await adminClient
      .from("goal_presets")
      .update({
        name: input.name,
        description: input.description ?? null,
        default_level: input.default_level,
      })
      .eq("id", presetId)
      .eq("tenant_id", dbUser.tenant_id);
    if (updateError) {
      console.error("[GoalPresets] Update failed:", updateError);
      return { success: false, error: "プリセットの更新に失敗しました" };
    }

    // Replace the item set wholesale — preset edit happens infrequently
    // and the simpler delete+insert avoids reconciling diffs by ID.
    const { error: deleteError } = await adminClient
      .from("goal_preset_items")
      .delete()
      .eq("preset_id", presetId);
    if (deleteError) {
      console.error("[GoalPresets] Item delete failed:", deleteError);
      return { success: false, error: "プリセット項目の更新に失敗しました" };
    }

    const itemsToInsert = input.items.map((item, idx) => ({
      preset_id: presetId,
      name: item.name,
      report_template_id: item.report_template_id ?? null,
      kpi_field_key: item.kpi_field_key ?? null,
      default_target_value: item.default_target_value,
      sort_order: item.sort_order ?? idx,
    }));
    const { error: insertError } = await adminClient
      .from("goal_preset_items")
      .insert(itemsToInsert);
    if (insertError) {
      console.error("[GoalPresets] Item insert failed:", insertError);
      return { success: false, error: "プリセット項目の更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "update",
      resource: "goal_preset",
      resourceId: presetId,
      details: { name: input.name, itemCount: input.items.length },
    });

    revalidatePath("/goals");
    revalidatePath("/goals/presets");
    return { success: true };
  } catch (err) {
    console.error("[GoalPresets] updateGoalPreset unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteGoalPreset(
  presetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    if (!isManager(dbUser.role)) {
      return {
        success: false,
        error: "プリセットを削除する権限がありません",
      };
    }

    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from("goal_presets")
      .select("id, tenant_id")
      .eq("id", presetId)
      .single();
    if (!existing || existing.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "プリセットが見つかりません" };
    }

    const { error } = await adminClient
      .from("goal_presets")
      .delete()
      .eq("id", presetId)
      .eq("tenant_id", dbUser.tenant_id);
    if (error) {
      console.error("[GoalPresets] Delete failed:", error);
      return { success: false, error: "プリセットの削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "delete",
      resource: "goal_preset",
      resourceId: presetId,
    });

    revalidatePath("/goals");
    revalidatePath("/goals/presets");
    return { success: true };
  } catch (err) {
    console.error("[GoalPresets] deleteGoalPreset unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
