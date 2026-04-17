"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createDealSchema, updateDealSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { checkFeatureAccess } from "@/lib/plan-gate";
import type { z } from "zod";

interface CreateDealInput {
  company: string;
  title?: string;
  value?: number;
  due_date?: string;
  stage_id: string;
}

type UpdateDealInput = z.input<typeof updateDealSchema>;

export async function createDeal(data: CreateDealInput) {
  const parsed = createDealSchema.safeParse(data);
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

    const gate = await checkFeatureAccess(dbUser.tenant_id, "deals");
    if (!gate.allowed) {
      return { success: false, error: gate.error };
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        tenant_id: dbUser.tenant_id,
        user_id: user.id,
        stage_id: data.stage_id,
        company: data.company,
        title: data.title || null,
        value: data.value || null,
        due_date: data.due_date || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: "案件の作成に失敗しました" };
    }

    // Insert initial deal history
    await supabase.from("deal_history").insert({
      deal_id: deal.id,
      from_stage: null,
      to_stage: data.stage_id,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "create",
      resource: "deal",
      resourceId: deal.id,
      details: { company: data.company },
    });
    await dispatchWebhook(dbUser.tenant_id, "deal.created", {
      deal_id: deal.id,
      company: data.company,
    });

    revalidatePath("/deals");
    return { success: true, data: deal };
  } catch {
    return { success: false, error: "案件の作成に失敗しました" };
  }
}

export async function updateDeal(id: string, data: UpdateDealInput) {
  // Parse at the boundary. Without this, a client could spread arbitrary
  // fields like `approval_status`, `user_id`, `tenant_id`, `stage_id` into
  // the update — RLS would still accept same-tenant rows, so a caller could
  // self-approve or seize another user's deal.
  const parsed = updateDealSchema.safeParse(data);
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

    const { error } = await supabase
      .from("deals")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "案件の更新に失敗しました" };
    }

    revalidatePath("/deals");
    revalidatePath(`/deals/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "案件の更新に失敗しました" };
  }
}

export async function moveDeal(dealId: string, newStageId: string) {
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

    // Get current stage (テナント検証付き)
    const { data: currentDeal } = await supabase
      .from("deals")
      .select("stage_id")
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!currentDeal) {
      return { success: false, error: "案件が見つかりません" };
    }

    if (currentDeal.stage_id === newStageId) {
      return { success: true };
    }

    // Update deal stage (テナント検証付き)
    const { error: updateError } = await supabase
      .from("deals")
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id);

    if (updateError) {
      return { success: false, error: "ステージの変更に失敗しました" };
    }

    // Record history
    await supabase.from("deal_history").insert({
      deal_id: dealId,
      from_stage: currentDeal.stage_id,
      to_stage: newStageId,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "update",
      resource: "deal",
      resourceId: dealId,
      details: { from_stage: currentDeal.stage_id, to_stage: newStageId },
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return { success: true };
  } catch {
    return { success: false, error: "ステージの変更に失敗しました" };
  }
}

export async function approveDeal(dealId: string, comment?: string) {
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

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "manager" && dbUser.role !== "super_admin")) {
      return { success: false, error: "承認権限がありません" };
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("id, user_id, approval_status")
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!deal) {
      return { success: false, error: "案件が見つかりません" };
    }

    if (deal.user_id === user.id) {
      return { success: false, error: "自分の案件は承認できません" };
    }

    if (deal.approval_status !== "submitted") {
      return { success: false, error: "この案件は承認待ちではありません" };
    }

    const { error } = await supabase
      .from("deals")
      .update({ approval_status: "approved", updated_at: new Date().toISOString() })
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "承認に失敗しました" };
    }

    // Record approval log
    await supabase.from("approval_logs").insert({
      tenant_id: dbUser.tenant_id,
      target_type: "deal",
      target_id: dealId,
      action: "approved",
      actor_id: user.id,
      comment: comment?.trim() || null,
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "approve",
      resource: "deal",
      resourceId: dealId,
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/approval");
    return { success: true };
  } catch {
    return { success: false, error: "承認に失敗しました" };
  }
}

export async function rejectDeal(dealId: string, comment: string) {
  if (!comment.trim()) {
    return { success: false, error: "差し戻しコメントは必須です" };
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

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "manager" && dbUser.role !== "super_admin")) {
      return { success: false, error: "差し戻し権限がありません" };
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("id, user_id, approval_status")
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!deal) {
      return { success: false, error: "案件が見つかりません" };
    }

    if (deal.user_id === user.id) {
      return { success: false, error: "自分の案件は差し戻しできません" };
    }

    const { error } = await supabase
      .from("deals")
      .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", dealId)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "差し戻しに失敗しました" };
    }

    await supabase.from("approval_logs").insert({
      tenant_id: dbUser.tenant_id,
      target_type: "deal",
      target_id: dealId,
      action: "rejected",
      actor_id: user.id,
      comment: comment.trim(),
    });

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "reject",
      resource: "deal",
      resourceId: dealId,
    });

    // Create nudge notification for the deal owner
    const { data: actor } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();
    const actorName = actor?.name ?? "マネージャー";

    await supabase.from("nudges").insert({
      tenant_id: dbUser.tenant_id,
      target_user_id: deal.user_id,
      trigger_type: "deal_rejected",
      content: `${actorName}が案件を差し戻しました: ${comment.trim()}`,
      status: "pending",
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/approval");
    return { success: true };
  } catch {
    return { success: false, error: "差し戻しに失敗しました" };
  }
}

export async function deleteDeal(id: string) {
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
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "案件の削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: user.id,
      action: "delete",
      resource: "deal",
      resourceId: id,
    });

    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "案件の削除に失敗しました" };
  }
}
