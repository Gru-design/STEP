"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { checkFeatureAccess } from "@/lib/plan-gate";


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

    const gate = await checkFeatureAccess(dbUser.tenant_id, "weekly_plan");
    if (!gate.allowed) {
      return { success: false, error: gate.error };
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

export async function approvePlan(planId: string, comment?: string): Promise<ActionResult> {
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

    // Prevent self-approval and ensure tenant isolation
    const { data: targetPlan } = await supabase
      .from("weekly_plans")
      .select("tenant_id, user_id")
      .eq("id", planId)
      .single();

    if (!targetPlan || targetPlan.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "対象の計画が見つかりません" };
    }

    if (targetPlan.user_id === user.id) {
      return { success: false, error: "自分の計画は承認できません" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "承認に失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      target_type: "weekly_plan",
      target_id: planId,
      action: "approved",
      actor_id: user.id,
      comment: comment?.trim() || null,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "approve",
      resource: "weekly_plan",
      resourceId: planId,
      details: comment?.trim() ? { comment: comment.trim() } : undefined,
    });

    await dispatchWebhook(dbUser.tenant_id, "plan.approved", {
      plan_id: planId,
      approved_by: user.id,
      comment: comment?.trim() || null,
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

    // Prevent self-rejection and ensure tenant isolation
    const { data: targetPlan } = await supabase
      .from("weekly_plans")
      .select("tenant_id, user_id")
      .eq("id", planId)
      .single();

    if (!targetPlan || targetPlan.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "対象の計画が見つかりません" };
    }

    if (targetPlan.user_id === user.id) {
      return { success: false, error: "自分の計画は差し戻しできません" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("tenant_id", dbUser.tenant_id);

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

// ── Delete Weekly Plan ──

export async function deleteWeeklyPlan(
  planId: string
): Promise<ActionResult> {
  if (!planId || typeof planId !== "string") {
    return { success: false, error: "無効なIDです" };
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
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Fetch the plan to check ownership and tenant
    const { data: plan } = await supabase
      .from("weekly_plans")
      .select("user_id, status, tenant_id")
      .eq("id", planId)
      .single();

    if (!plan || plan.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "計画が見つかりません" };
    }

    const isOwner = plan.user_id === user.id;
    const isAdmin = ["admin", "super_admin"].includes(dbUser.role);

    // Owner can only delete drafts; admin can delete any status
    if (isOwner && plan.status !== "draft" && !isAdmin) {
      return { success: false, error: "提出済みの計画は削除できません" };
    }

    if (!isOwner && !isAdmin) {
      return { success: false, error: "削除権限がありません" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .delete()
      .eq("id", planId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "delete",
      resource: "weekly_plan",
      resourceId: planId,
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

// ── Weekly Review ──

export async function submitReview(data: {
  planId: string;
  selfRating: number;
  wentWell: string;
  toImprove: string;
  nextActions: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    if (data.selfRating < 1 || data.selfRating > 5) {
      return { success: false, error: "自己評価は1〜5で入力してください" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Verify plan belongs to user and is review_pending or approved
    const { data: plan } = await supabase
      .from("weekly_plans")
      .select("id, user_id, status, tenant_id")
      .eq("id", data.planId)
      .single();

    if (!plan || plan.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "対象の計画が見つかりません" };
    }

    if (plan.user_id !== user.id) {
      return { success: false, error: "自分の計画のみ振り返りできます" };
    }

    if (plan.status !== "review_pending" && plan.status !== "approved") {
      return { success: false, error: "この計画は振り返り対象ではありません" };
    }

    // Insert review
    const { error: reviewError } = await supabase.from("plan_reviews").insert({
      tenant_id: dbUser.tenant_id,
      plan_id: data.planId,
      user_id: user.id,
      self_rating: data.selfRating,
      went_well: data.wentWell.trim() || null,
      to_improve: data.toImprove.trim() || null,
      next_actions: data.nextActions.trim() || null,
    });

    if (reviewError) {
      if (reviewError.code === "23505") {
        return { success: false, error: "この計画の振り返りは既に提出済みです" };
      }
      return { success: false, error: "振り返りの保存に失敗しました" };
    }

    // Update plan status to reviewed
    await supabase
      .from("weekly_plans")
      .update({ status: "reviewed", updated_at: new Date().toISOString() })
      .eq("id", data.planId);

    // Award XP
    const { awardXP } = await import("@/lib/gamification/xp");
    await awardXP(user.id, "weekly_review");

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "create",
      resource: "plan_review",
      resourceId: data.planId,
    });

    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function addManagerFeedback(data: {
  planId: string;
  comment: string;
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
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
      return { success: false, error: "マネージャー権限が必要です" };
    }

    const { data: review } = await supabase
      .from("plan_reviews")
      .select("id, tenant_id")
      .eq("plan_id", data.planId)
      .single();

    if (!review || review.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "振り返りが見つかりません" };
    }

    const { error } = await supabase
      .from("plan_reviews")
      .update({
        manager_id: user.id,
        manager_comment: data.comment.trim(),
        manager_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    if (error) {
      return { success: false, error: "フィードバックの保存に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "update",
      resource: "plan_review",
      resourceId: review.id,
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
