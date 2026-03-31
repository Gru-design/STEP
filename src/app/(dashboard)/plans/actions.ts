"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { createPlanSchema } from "@/lib/validations";

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createOrUpdatePlan(data: {
  weekStart: string;
  templateId: string;
  items: Record<string, unknown>;
  status: "draft" | "submitted";
}): Promise<ActionResult> {
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

    const { data: plan, error } = await supabase
      .from("weekly_plans")
      .upsert(
        {
          tenant_id: dbUser.tenant_id,
          user_id: user.id,
          week_start: data.weekStart,
          template_id: data.templateId,
          items: data.items,
          status: data.status,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,week_start",
        }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: "週次計画の保存に失敗しました" };
    }

    // If submitting, also create an approval_log entry
    if (data.status === "submitted") {
      await supabase.from("approval_logs").insert({
        target_type: "weekly_plan",
        target_id: plan.id,
        action: "submitted",
        actor_id: user.id,
      });
    }

    revalidatePath("/plans");
    return { success: true, data: plan };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function submitPlan(planId: string): Promise<ActionResult> {
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
      .from("weekly_plans")
      .update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "提出に失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      target_type: "weekly_plan",
      target_id: planId,
      action: "submitted",
      actor_id: user.id,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "submit",
      resource: "weekly_plan",
      resourceId: planId,
    });

    await dispatchWebhook(dbUser.tenant_id, "plan.submitted", {
      plan_id: planId,
      user_id: user.id,
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function approvePlan(planId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Verify manager/admin role
    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
      return { success: false, error: "承認権限がありません" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (error) {
      return { success: false, error: "承認に失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      target_type: "weekly_plan",
      target_id: planId,
      action: "approved",
      actor_id: user.id,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "approve",
      resource: "weekly_plan",
      resourceId: planId,
    });

    await dispatchWebhook(dbUser.tenant_id, "plan.approved", {
      plan_id: planId,
      approved_by: user.id,
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function rejectPlan(
  planId: string,
  comment: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    if (!comment || comment.trim().length === 0) {
      return { success: false, error: "差し戻しコメントは必須です" };
    }

    // Verify manager/admin role
    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
      return { success: false, error: "承認権限がありません" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (error) {
      return { success: false, error: "差し戻しに失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      target_type: "weekly_plan",
      target_id: planId,
      action: "rejected",
      actor_id: user.id,
      comment: comment.trim(),
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "reject",
      resource: "weekly_plan",
      resourceId: planId,
      details: { comment: comment.trim() },
    });

    await dispatchWebhook(dbUser.tenant_id, "plan.rejected", {
      plan_id: planId,
      rejected_by: user.id,
      comment: comment.trim(),
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
