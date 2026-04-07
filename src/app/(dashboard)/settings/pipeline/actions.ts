"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { pipelineStagesCacheTag } from "@/lib/cache";
import { z } from "zod";

const stageNameSchema = z
  .string()
  .min(1, "ステージ名を入力してください")
  .max(50, "ステージ名は50文字以内で入力してください");

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) return null;

  return { supabase: adminClient, authUser, dbUser };
}

export async function getPipelineStages() {
  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, dbUser } = ctx;
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .order("sort_order", { ascending: true });

  if (error) {
    return { success: false, error: "ステージの取得に失敗しました" };
  }

  return { success: true, data: data ?? [] };
}

export async function addPipelineStage(name: string) {
  const parsed = stageNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, authUser, dbUser } = ctx;

  try {
    // Get current max sort_order
    const { data: existing } = await supabase
      .from("pipeline_stages")
      .select("sort_order")
      .eq("tenant_id", dbUser.tenant_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    const { error } = await supabase.from("pipeline_stages").insert({
      tenant_id: dbUser.tenant_id,
      name: parsed.data.trim(),
      sort_order: nextOrder,
    });

    if (error) {
      return { success: false, error: "ステージの追加に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "create",
      resource: "pipeline_stage",
      resourceId: dbUser.tenant_id,
      details: { name: parsed.data.trim() },
    });

    revalidatePath("/settings/pipeline");
    revalidatePath("/deals");
    revalidateTag(pipelineStagesCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch {
    return { success: false, error: "ステージの追加に失敗しました" };
  }
}

export async function updatePipelineStage(id: string, name: string) {
  const parsed = stageNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, authUser, dbUser } = ctx;

  try {
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ name: parsed.data.trim() })
      .eq("id", id)
      .eq("tenant_id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "ステージの更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "update",
      resource: "pipeline_stage",
      resourceId: id,
      details: { name: parsed.data.trim() },
    });

    revalidatePath("/settings/pipeline");
    revalidatePath("/deals");
    revalidateTag(pipelineStagesCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch {
    return { success: false, error: "ステージの更新に失敗しました" };
  }
}

export async function deletePipelineStage(id: string) {
  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, authUser, dbUser } = ctx;

  try {
    // Check if there are deals using this stage
    const { data: deals } = await supabase
      .from("deals")
      .select("id")
      .eq("stage_id", id)
      .eq("tenant_id", dbUser.tenant_id)
      .limit(1);

    if (deals && deals.length > 0) {
      return {
        success: false,
        error: "このステージに紐づく案件があるため削除できません。先に案件を別のステージに移動してください。",
      };
    }

    const { data: deleted, error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", id)
      .eq("tenant_id", dbUser.tenant_id)
      .select("id");

    if (error) {
      return { success: false, error: "ステージの削除に失敗しました" };
    }

    if (!deleted || deleted.length === 0) {
      return { success: false, error: "ステージの削除に失敗しました。対象が見つかりません。" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "delete",
      resource: "pipeline_stage",
      resourceId: id,
    });

    revalidatePath("/settings/pipeline");
    revalidatePath("/deals");
    revalidateTag(pipelineStagesCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch {
    return { success: false, error: "ステージの削除に失敗しました" };
  }
}

export async function reorderPipelineStages(orderedIds: string[]) {
  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, authUser, dbUser } = ctx;

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("pipeline_stages")
        .update({ sort_order: i + 1 })
        .eq("id", orderedIds[i])
        .eq("tenant_id", dbUser.tenant_id);

      if (error) {
        return { success: false, error: "並び替えに失敗しました" };
      }
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "update",
      resource: "pipeline_stage",
      resourceId: dbUser.tenant_id,
      details: { action: "reorder", orderedIds },
    });

    revalidatePath("/settings/pipeline");
    revalidatePath("/deals");
    revalidateTag(pipelineStagesCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch {
    return { success: false, error: "並び替えに失敗しました" };
  }
}

const PRESET_STAGES = [
  "アプローチ",
  "ヒアリング",
  "求人受注",
  "推薦",
  "書類通過",
  "面接",
  "内定",
  "入社",
];

export async function initializePresetStages() {
  const ctx = await getAdminUser();
  if (!ctx) return { success: false, error: "権限がありません" };

  const { supabase, authUser, dbUser } = ctx;

  try {
    // Check if stages already exist
    const { data: existing } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("tenant_id", dbUser.tenant_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "既にステージが設定されています" };
    }

    for (let i = 0; i < PRESET_STAGES.length; i++) {
      const { error } = await supabase.from("pipeline_stages").insert({
        tenant_id: dbUser.tenant_id,
        name: PRESET_STAGES[i],
        sort_order: i + 1,
      });

      if (error) {
        return { success: false, error: "プリセットの初期化に失敗しました" };
      }
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "create",
      resource: "pipeline_stage",
      resourceId: dbUser.tenant_id,
      details: { action: "initialize_preset", stages: PRESET_STAGES },
    });

    revalidatePath("/settings/pipeline");
    revalidatePath("/deals");
    revalidateTag(pipelineStagesCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch {
    return { success: false, error: "プリセットの初期化に失敗しました" };
  }
}
