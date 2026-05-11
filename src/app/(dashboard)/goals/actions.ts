"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  bulkCreateGoalsFromPresetSchema,
  createGoalSchema,
} from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { checkFeatureAccess } from "@/lib/plan-gate";
import { requireAuthenticated } from "@/lib/auth/require-role";
import { getKpiCandidateFields } from "@/lib/templates/fields";
import type { Role, TemplateSchema } from "@/types/database";

/**
 * Verify that a goal's kpi_field_key actually exists as a numeric/rating
 * field in the linked template's schema. This guards against the common
 * sync bug where a free-text key was typed but didn't match any real
 * field — leaving the goal silently unable to aggregate progress.
 */
async function validateKpiFieldKey(
  adminClient: ReturnType<typeof createAdminClient>,
  tenantId: string,
  templateId: string,
  kpiFieldKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: template, error } = await adminClient
    .from("report_templates")
    .select("schema, tenant_id")
    .eq("id", templateId)
    .single();
  if (error || !template) {
    return { ok: false, error: "テンプレートが見つかりません" };
  }
  // Allow the global system template (tenant_id = null) plus the caller's
  // own tenant; reject any other tenant's template (would leak across).
  if (template.tenant_id && template.tenant_id !== tenantId) {
    return { ok: false, error: "テンプレートが見つかりません" };
  }
  const candidates = getKpiCandidateFields(template.schema as TemplateSchema);
  const exists = candidates.some((c) => c.key === kpiFieldKey);
  if (!exists) {
    return {
      ok: false,
      error:
        "選択したテンプレートに該当するKPIフィールドが見つかりません。テンプレート編集画面で確認してください。",
    };
  }
  return { ok: true };
}

interface GoalInput {
  name: string;
  level: "company" | "department" | "team" | "individual";
  target_value: number;
  kpi_field_key?: string;
  template_id?: string;
  period_start: string;
  period_end: string;
  owner_id?: string;
  team_id?: string;
  parent_id?: string;
}

// Levels above "individual" are organisation-wide objectives that only
// managers, admins, and super_admins may create or mutate. A plain member
// must not be able to publish a "company" goal that would appear on every
// teammate's dashboard.
const MANAGER_LEVELS: ReadonlySet<GoalInput["level"]> = new Set([
  "company",
  "department",
  "team",
]);

function isManager(role: Role): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}

export async function createGoal(input: GoalInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    if (MANAGER_LEVELS.has(input.level) && !isManager(dbUser.role)) {
      return {
        success: false,
        error: "組織レベルの目標を作成する権限がありません",
      };
    }

    // An individual goal owned by someone other than the creator is an
    // assignment — only managers can hand out goals to other users.
    if (
      input.level === "individual" &&
      input.owner_id &&
      input.owner_id !== user.id &&
      !isManager(dbUser.role)
    ) {
      return {
        success: false,
        error: "他のメンバーの目標を作成する権限がありません",
      };
    }

    if (
      input.period_start &&
      input.period_end &&
      new Date(input.period_start) > new Date(input.period_end)
    ) {
      return { success: false, error: "開始日は終了日より前に設定してください" };
    }

    const gate = await checkFeatureAccess(dbUser.tenant_id, "goals");
    if (!gate.allowed) {
      console.error("[Goals] Feature access denied:", {
        tenantId: dbUser.tenant_id,
        error: gate.error,
      });
      return { success: false, error: gate.error };
    }

    const adminClient = createAdminClient();

    // If the caller references an owner / team / parent, verify each belongs
    // to the same tenant. The admin client bypasses RLS so this check has to
    // happen explicitly — otherwise a crafted payload could link a goal to a
    // row in another tenant.
    if (input.owner_id) {
      const { data: owner } = await adminClient
        .from("users")
        .select("id, tenant_id")
        .eq("id", input.owner_id)
        .single();
      if (!owner || owner.tenant_id !== dbUser.tenant_id) {
        return { success: false, error: "担当者が見つかりません" };
      }
    }
    if (input.team_id) {
      const { data: team } = await adminClient
        .from("teams")
        .select("id, tenant_id")
        .eq("id", input.team_id)
        .single();
      if (!team || team.tenant_id !== dbUser.tenant_id) {
        return { success: false, error: "チームが見つかりません" };
      }
    }
    if (input.parent_id) {
      const { data: parent } = await adminClient
        .from("goals")
        .select("id, tenant_id")
        .eq("id", input.parent_id)
        .single();
      if (!parent || parent.tenant_id !== dbUser.tenant_id) {
        return { success: false, error: "親目標が見つかりません" };
      }
    }

    if (input.template_id && input.kpi_field_key) {
      const validation = await validateKpiFieldKey(
        adminClient,
        dbUser.tenant_id,
        input.template_id,
        input.kpi_field_key
      );
      if (!validation.ok) {
        return { success: false, error: validation.error };
      }
    }

    const { error } = await adminClient.from("goals").insert({
      tenant_id: dbUser.tenant_id,
      name: input.name,
      level: input.level,
      target_value: input.target_value,
      kpi_field_key: input.kpi_field_key || null,
      template_id: input.template_id || null,
      period_start: input.period_start,
      period_end: input.period_end,
      owner_id: input.owner_id || null,
      team_id: input.team_id || null,
      parent_id: input.parent_id || null,
    });

    if (error) {
      console.error("[Goals] Insert failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        tenantId: dbUser.tenant_id,
      });
      return { success: false, error: "目標の作成に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "create",
      resource: "goal",
      details: { name: input.name, level: input.level },
    });

    revalidatePath("/goals");
    return { success: true };
  } catch (err) {
    console.error("[Goals] createGoal unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function updateGoal(
  goalId: string,
  input: Partial<GoalInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    const adminClient = createAdminClient();

    // Fetch the existing goal for authorization decisions. We need both the
    // current level and the owner_id so a member can edit their own
    // individual goal but cannot escalate it to "team"/"company".
    // Also pull the existing template_id / kpi_field_key so we can
    // validate the KPI link even when only one side is being changed.
    const { data: existing } = await adminClient
      .from("goals")
      .select("id, tenant_id, level, owner_id, template_id, kpi_field_key")
      .eq("id", goalId)
      .single();

    if (!existing || existing.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "目標が見つかりません" };
    }

    const existingLevel = existing.level as GoalInput["level"];
    const targetLevel = (input.level ?? existingLevel) as GoalInput["level"];
    const touchesManagerLevel =
      MANAGER_LEVELS.has(existingLevel) || MANAGER_LEVELS.has(targetLevel);

    if (touchesManagerLevel && !isManager(dbUser.role)) {
      return {
        success: false,
        error: "組織レベルの目標を変更する権限がありません",
      };
    }

    if (
      !touchesManagerLevel &&
      existing.owner_id &&
      existing.owner_id !== user.id &&
      !isManager(dbUser.role)
    ) {
      return {
        success: false,
        error: "他のメンバーの目標を変更する権限がありません",
      };
    }

    if (input.owner_id && input.owner_id !== existing.owner_id) {
      if (!isManager(dbUser.role)) {
        return {
          success: false,
          error: "担当者を変更する権限がありません",
        };
      }
      const { data: owner } = await adminClient
        .from("users")
        .select("id, tenant_id")
        .eq("id", input.owner_id)
        .single();
      if (!owner || owner.tenant_id !== dbUser.tenant_id) {
        return { success: false, error: "担当者が見つかりません" };
      }
    }

    // Resolve the post-update (template_id, kpi_field_key) pair, then
    // validate that the key actually exists in the template's schema.
    // Empty string is the form's "clear" sentinel; undefined means
    // "leave unchanged".
    const resolvedTemplateId =
      input.template_id === undefined
        ? (existing.template_id as string | null)
        : input.template_id || null;
    const resolvedKpiFieldKey =
      input.kpi_field_key === undefined
        ? (existing.kpi_field_key as string | null)
        : input.kpi_field_key || null;
    if (resolvedTemplateId && resolvedKpiFieldKey) {
      const validation = await validateKpiFieldKey(
        adminClient,
        dbUser.tenant_id,
        resolvedTemplateId,
        resolvedKpiFieldKey
      );
      if (!validation.ok) {
        return { success: false, error: validation.error };
      }
    }

    const { error } = await adminClient
      .from("goals")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.level !== undefined && { level: input.level }),
        ...(input.target_value !== undefined && {
          target_value: input.target_value,
        }),
        ...(input.kpi_field_key !== undefined && {
          kpi_field_key: input.kpi_field_key || null,
        }),
        ...(input.template_id !== undefined && {
          template_id: input.template_id || null,
        }),
        ...(input.period_start !== undefined && {
          period_start: input.period_start,
        }),
        ...(input.period_end !== undefined && {
          period_end: input.period_end,
        }),
        ...(input.owner_id !== undefined && {
          owner_id: input.owner_id || null,
        }),
        ...(input.team_id !== undefined && {
          team_id: input.team_id || null,
        }),
        ...(input.parent_id !== undefined && {
          parent_id: input.parent_id || null,
        }),
      })
      .eq("id", goalId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      console.error("[Goals] Update failed:", {
        goalId,
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return { success: false, error: "目標の更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "update",
      resource: "goal",
      resourceId: goalId,
      details: input,
    });

    revalidatePath("/goals");
    return { success: true };
  } catch (err) {
    console.error("[Goals] updateGoal unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteGoal(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("goals")
      .select("id, tenant_id, level, owner_id")
      .eq("id", goalId)
      .single();

    if (!existing || existing.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "目標が見つかりません" };
    }

    const existingLevel = existing.level as GoalInput["level"];
    if (MANAGER_LEVELS.has(existingLevel) && !isManager(dbUser.role)) {
      return {
        success: false,
        error: "組織レベルの目標を削除する権限がありません",
      };
    }

    if (
      existingLevel === "individual" &&
      existing.owner_id &&
      existing.owner_id !== user.id &&
      !isManager(dbUser.role)
    ) {
      return {
        success: false,
        error: "他のメンバーの目標を削除する権限がありません",
      };
    }

    const { data: children } = await adminClient
      .from("goals")
      .select("id")
      .eq("parent_id", goalId)
      .limit(1);

    if (children && children.length > 0) {
      return {
        success: false,
        error: "子目標が存在するため削除できません。先に子目標を削除してください。",
      };
    }

    const { error } = await adminClient
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      console.error("[Goals] Delete failed:", {
        goalId,
        code: error.code,
        message: error.message,
      });
      return { success: false, error: "目標の削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "delete",
      resource: "goal",
      resourceId: goalId,
    });

    revalidatePath("/goals");
    return { success: true };
  } catch (err) {
    console.error("[Goals] deleteGoal unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

// ── Bulk creation from a preset ──

interface BulkAssignmentInput {
  owner_id?: string | null;
  team_id?: string | null;
  targets: Record<string, number>;
}

interface BulkCreateInput {
  preset_id: string;
  period_start: string;
  period_end: string;
  parent_id?: string | null;
  assignments: BulkAssignmentInput[];
}

interface BulkCreateResult {
  success: boolean;
  createdCount?: number;
  error?: string;
}

function isManagerRole(role: Role): boolean {
  return role === "manager" || role === "admin" || role === "super_admin";
}

/**
 * Create N (assignments) × M (preset items) goals in one transaction.
 *
 * The preset itself stores only the structure (item names + KPI bindings +
 * default targets); per-assignment targets can be overridden in the
 * grid UI before submit. KPI bindings on each item are re-validated against
 * the linked template's schema so a stale preset cannot silently insert
 * goals that fail to aggregate.
 */
export async function bulkCreateGoalsFromPreset(
  input: BulkCreateInput
): Promise<BulkCreateResult> {
  const parsed = bulkCreateGoalsFromPresetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const auth = await requireAuthenticated();
    if (!auth.ok) return { success: false, error: auth.error };
    const { dbUser, user } = auth;

    if (!isManagerRole(dbUser.role)) {
      return {
        success: false,
        error: "目標を一括作成する権限がありません",
      };
    }

    if (new Date(input.period_start) > new Date(input.period_end)) {
      return { success: false, error: "開始日は終了日より前に設定してください" };
    }

    const gate = await checkFeatureAccess(dbUser.tenant_id, "goals");
    if (!gate.allowed) {
      return { success: false, error: gate.error };
    }

    const adminClient = createAdminClient();

    // Load preset + items (tenant-scoped)
    const { data: preset, error: presetError } = await adminClient
      .from("goal_presets")
      .select("id, tenant_id, default_level")
      .eq("id", input.preset_id)
      .single();
    if (presetError || !preset || preset.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "プリセットが見つかりません" };
    }

    const presetLevel = preset.default_level as
      | "company"
      | "department"
      | "team"
      | "individual";

    const { data: items, error: itemsError } = await adminClient
      .from("goal_preset_items")
      .select(
        "id, name, report_template_id, kpi_field_key, default_target_value, sort_order"
      )
      .eq("preset_id", input.preset_id)
      .order("sort_order", { ascending: true });
    if (itemsError || !items || items.length === 0) {
      return { success: false, error: "プリセットの項目が空です" };
    }

    // Re-validate KPI bindings against current template schemas
    const templateIds = Array.from(
      new Set(
        items
          .map((i) => i.report_template_id)
          .filter((v): v is string => !!v)
      )
    );
    const templateSchemaMap = new Map<string, TemplateSchema | null>();
    if (templateIds.length > 0) {
      const { data: templates } = await adminClient
        .from("report_templates")
        .select("id, tenant_id, schema")
        .in("id", templateIds);
      for (const t of templates ?? []) {
        if (t.tenant_id && t.tenant_id !== dbUser.tenant_id) continue;
        templateSchemaMap.set(t.id, t.schema as TemplateSchema | null);
      }
    }
    for (const item of items) {
      if (!item.report_template_id || !item.kpi_field_key) continue;
      const schema = templateSchemaMap.get(item.report_template_id);
      if (schema === undefined) {
        return {
          success: false,
          error: `項目「${item.name}」のテンプレートが見つかりません`,
        };
      }
      const candidates = getKpiCandidateFields(schema);
      if (!candidates.some((c) => c.key === item.kpi_field_key)) {
        return {
          success: false,
          error: `項目「${item.name}」のKPIフィールドがテンプレートで見つかりません`,
        };
      }
    }

    // Validate parent_id is same-tenant
    if (input.parent_id) {
      const { data: parent } = await adminClient
        .from("goals")
        .select("id, tenant_id")
        .eq("id", input.parent_id)
        .single();
      if (!parent || parent.tenant_id !== dbUser.tenant_id) {
        return { success: false, error: "親目標が見つかりません" };
      }
    }

    // Validate owner_id / team_id same-tenant in bulk
    const ownerIds = Array.from(
      new Set(
        input.assignments
          .map((a) => a.owner_id)
          .filter((v): v is string => !!v)
      )
    );
    const teamIds = Array.from(
      new Set(
        input.assignments
          .map((a) => a.team_id)
          .filter((v): v is string => !!v)
      )
    );
    if (ownerIds.length > 0) {
      const { data: owners } = await adminClient
        .from("users")
        .select("id, tenant_id")
        .in("id", ownerIds);
      const valid = new Set(
        (owners ?? [])
          .filter((u) => u.tenant_id === dbUser.tenant_id)
          .map((u) => u.id)
      );
      if (valid.size !== ownerIds.length) {
        return { success: false, error: "担当者の一部が見つかりません" };
      }
    }
    if (teamIds.length > 0) {
      const { data: teams } = await adminClient
        .from("teams")
        .select("id, tenant_id")
        .in("id", teamIds);
      const valid = new Set(
        (teams ?? [])
          .filter((t) => t.tenant_id === dbUser.tenant_id)
          .map((t) => t.id)
      );
      if (valid.size !== teamIds.length) {
        return { success: false, error: "チームの一部が見つかりません" };
      }
    }

    // Build goal rows
    const rows: Array<Record<string, unknown>> = [];
    for (const assignment of input.assignments) {
      for (const item of items) {
        const overridden = assignment.targets[item.id];
        const target =
          overridden !== undefined
            ? overridden
            : Number(item.default_target_value);
        if (!(target > 0)) {
          // Skip non-positive targets — they would fail createGoalSchema
          // anyway and tend to mean "not assigned to this person".
          continue;
        }
        rows.push({
          tenant_id: dbUser.tenant_id,
          parent_id: input.parent_id ?? null,
          level: presetLevel,
          name: item.name,
          target_value: target,
          kpi_field_key: item.kpi_field_key ?? null,
          template_id: item.report_template_id ?? null,
          period_start: input.period_start,
          period_end: input.period_end,
          owner_id: assignment.owner_id ?? null,
          team_id: assignment.team_id ?? null,
        });
      }
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: "作成する目標がありません。各担当に目標値を設定してください。",
      };
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("goals")
      .insert(rows)
      .select("id");
    if (insertError) {
      console.error("[Goals] Bulk insert failed:", insertError);
      return { success: false, error: "目標の一括作成に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "create",
      resource: "goal",
      details: {
        preset_id: input.preset_id,
        bulk: true,
        count: inserted?.length ?? rows.length,
        period_start: input.period_start,
        period_end: input.period_end,
      },
    });

    revalidatePath("/goals");
    return { success: true, createdCount: inserted?.length ?? rows.length };
  } catch (err) {
    console.error("[Goals] bulkCreateGoalsFromPreset unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
