"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createGoalSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { checkFeatureAccess } from "@/lib/plan-gate";
import { requireAuthenticated } from "@/lib/auth/require-role";
import type { Role } from "@/types/database";

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
    const { data: existing } = await adminClient
      .from("goals")
      .select("id, tenant_id, level, owner_id")
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
