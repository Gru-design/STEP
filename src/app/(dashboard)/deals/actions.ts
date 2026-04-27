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

    // Atomic: state update + approval_log + activity_log all happen in
    // one PL/pgSQL function = one transaction. Role and tenant checks
    // run inside the function from public.users (never JWT metadata).
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "approve_deal_atomic",
      { p_deal_id: dealId, p_comment: comment ?? null }
    );

    if (rpcError) {
      console.error("[Deals] approve_deal_atomic rpc error:", rpcError.message);
      return { success: false, error: "承認に失敗しました" };
    }

    const result = rpcResult as
      | { success: true; tenant_id: string; deal_id: string; deal_owner: string; deal_company: string; comment: string | null }
      | { success: false; error: string };

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/approval");
    return { success: true };
  } catch {
    return { success: false, error: "承認に失敗しました" };
  }
}

export async function rejectDeal(dealId: string, comment: string) {
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
      "reject_deal_atomic",
      { p_deal_id: dealId, p_comment: comment }
    );

    if (rpcError) {
      console.error("[Deals] reject_deal_atomic rpc error:", rpcError.message);
      return { success: false, error: "差し戻しに失敗しました" };
    }

    const result = rpcResult as
      | { success: true; tenant_id: string; deal_id: string; deal_owner: string; deal_company: string; comment: string }
      | { success: false; error: string };

    if (!result.success) {
      return { success: false, error: result.error };
    }

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
