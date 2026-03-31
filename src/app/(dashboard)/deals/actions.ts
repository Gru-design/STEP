"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createDealSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";

interface CreateDealInput {
  company: string;
  title?: string;
  value?: number;
  due_date?: string;
  stage_id: string;
}

interface UpdateDealInput {
  company?: string;
  title?: string;
  value?: number;
  due_date?: string;
  status?: "active" | "won" | "lost" | "hold";
  persona?: Record<string, unknown>;
}

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
      .update({ ...data, updated_at: new Date().toISOString() })
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

    // Get current stage
    const { data: currentDeal } = await supabase
      .from("deals")
      .select("stage_id")
      .eq("id", dealId)
      .single();

    if (!currentDeal) {
      return { success: false, error: "案件が見つかりません" };
    }

    if (currentDeal.stage_id === newStageId) {
      return { success: true };
    }

    // Update deal stage
    const { error: updateError } = await supabase
      .from("deals")
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (updateError) {
      return { success: false, error: "ステージの変更に失敗しました" };
    }

    // Record history
    await supabase.from("deal_history").insert({
      deal_id: dealId,
      from_stage: currentDeal.stage_id,
      to_stage: newStageId,
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return { success: true };
  } catch {
    return { success: false, error: "ステージの変更に失敗しました" };
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

    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "案件の削除に失敗しました" };
  }
}
