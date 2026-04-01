"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createGoalSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { checkFeatureAccess } from "@/lib/plan-gate";

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

export async function createGoal(input: GoalInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const gate = await checkFeatureAccess(dbUser.tenant_id, "goals");
    if (!gate.allowed) {
      return { success: false, error: gate.error };
    }

    const { error } = await supabase.from("goals").insert({
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
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function updateGoal(
  goalId: string,
  input: Partial<GoalInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const { error } = await supabase
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
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteGoal(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Check if goal has children
    const { data: children } = await supabase
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

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
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
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
