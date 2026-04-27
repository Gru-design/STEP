"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { checkFeatureAccess } from "@/lib/plan-gate";
import { upsertPlanSchema } from "@/lib/validations";
import type { z } from "zod";


interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type UpsertPlanInput = z.input<typeof upsertPlanSchema>;

export async function createOrUpdatePlan(input: UpsertPlanInput): Promise<ActionResult> {
  // Validate at the boundary. Without this, a client could set
  // `status: "approved"` and self-approve — TypeScript's union type is
  // erased at runtime and Supabase RLS allows owner-scoped updates.
  const parsed = upsertPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

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
        tenant_id: dbUser.tenant_id,
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
      tenant_id: dbUser.tenant_id,
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

    // Atomic: state update + approval_log + activity_log all happen in
    // one PL/pgSQL function = one transaction. Role and tenant checks
    // run inside the function from public.users (never JWT metadata).
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "approve_plan_atomic",
      { p_plan_id: planId, p_comment: comment ?? null }
    );

    if (rpcError) {
      console.error("[Plans] approve_plan_atomic rpc error:", rpcError.message);
      return { success: false, error: "承認に失敗しました" };
    }

    const result = rpcResult as
      | { success: true; tenant_id: string; plan_id: string; plan_owner: string; comment: string | null }
      | { success: false; error: string };

    if (!result.success) {
      return { success: false, error: result.error };
    }

    await dispatchWebhook(result.tenant_id, "plan.approved", {
      plan_id: result.plan_id,
      approved_by: user.id,
      comment: result.comment,
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

    // Atomic: state update + approval_log + activity_log + nudge all in
    // one transaction. Comment-required validation runs inside the
    // function so the contract is enforced even if a future caller
    // forgets the client-side check.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "reject_plan_atomic",
      { p_plan_id: planId, p_comment: comment }
    );

    if (rpcError) {
      console.error("[Plans] reject_plan_atomic rpc error:", rpcError.message);
      return { success: false, error: "差し戻しに失敗しました" };
    }

    const result = rpcResult as
      | { success: true; tenant_id: string; plan_id: string; plan_owner: string; comment: string }
      | { success: false; error: string };

    if (!result.success) {
      return { success: false, error: result.error };
    }

    await dispatchWebhook(result.tenant_id, "plan.rejected", {
      plan_id: result.plan_id,
      rejected_by: user.id,
      comment: result.comment,
    });

    revalidatePath("/plans");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

// ── Reopen Approved Plan ──

export async function reopenPlan(planId: string): Promise<ActionResult> {
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

    // Verify the plan belongs to the user and is approved
    const { data: plan } = await supabase
      .from("weekly_plans")
      .select("id, status, user_id")
      .eq("id", planId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!plan) {
      return { success: false, error: "計画が見つかりません" };
    }

    if (plan.user_id !== user.id) {
      return { success: false, error: "自分の計画のみ再編集できます" };
    }

    if (plan.status !== "approved" && plan.status !== "review_pending") {
      return { success: false, error: "承認済みの計画のみ再編集できます" };
    }

    const { error } = await supabase
      .from("weekly_plans")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "再編集に失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      tenant_id: dbUser.tenant_id,
      target_type: "weekly_plan",
      target_id: planId,
      action: "reopened",
      actor_id: user.id,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "reopen",
      resource: "weekly_plan",
      resourceId: planId,
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

    // Use admin client to bypass RLS - permission already checked above
    const adminClient = createAdminClient();
    const { error } = await adminClient
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
