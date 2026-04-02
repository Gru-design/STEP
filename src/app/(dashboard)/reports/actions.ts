"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { createReportSchema } from "@/lib/validations";
import type { ReactionType } from "@/types/database";

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createReportEntry(data: {
  templateId: string;
  reportDate: string;
  data: Record<string, unknown>;
  status: "draft" | "submitted";
}): Promise<ActionResult> {
  const parsed = createReportSchema.safeParse(data);
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

    // Use JWT claims for tenant_id to avoid extra DB query
    const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id;
    if (!tenantId) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!dbUser) {
        return { success: false, error: "ユーザーが見つかりません" };
      }
    }
    const resolvedTenantId = tenantId as string;

    const submittedAt =
      data.status === "submitted" ? new Date().toISOString() : null;

    const { data: entry, error } = await supabase
      .from("report_entries")
      .upsert(
        {
          tenant_id: resolvedTenantId,
          user_id: user.id,
          template_id: data.templateId,
          report_date: data.reportDate,
          data: data.data,
          status: data.status,
          submitted_at: submittedAt,
        },
        {
          onConflict: "user_id,template_id,report_date",
        }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: "日報の保存に失敗しました" };
    }

    if (data.status === "submitted") {
      await writeAuditLog({
        tenantId: resolvedTenantId,
        userId: user.id,
        action: "submit",
        resource: "report_entry",
        resourceId: entry.id,
      });
      await dispatchWebhook(resolvedTenantId, "report.submitted", {
        entry_id: entry.id,
        user_id: user.id,
        report_date: data.reportDate,
      });
    }

    revalidatePath("/reports");
    revalidatePath("/reports/my");
    return { success: true, data: entry };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function submitReportEntry(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { error } = await supabase
      .from("report_entries")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "提出に失敗しました" };
    }

    revalidatePath("/reports");
    revalidatePath("/reports/my");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function addReaction(
  entryId: string,
  type: ReactionType,
  comment?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Parallel: fetch user tenant_id + validate entry belongs to same tenant
    const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id;

    if (!tenantId) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!dbUser) {
        return { success: false, error: "ユーザーが見つかりません" };
      }
    }

    const resolvedTenantId = tenantId ?? (await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single()).data?.tenant_id;

    // Validate entry belongs to same tenant (RLS also enforces this)
    const { data: entry } = await supabase
      .from("report_entries")
      .select("id")
      .eq("id", entryId)
      .eq("tenant_id", resolvedTenantId)
      .single();

    if (!entry) {
      return { success: false, error: "対象の日報が見つかりません" };
    }

    const { error } = await supabase.from("reactions").insert({
      entry_id: entryId,
      user_id: user.id,
      type,
      comment: comment ?? null,
    });

    if (error) {
      return { success: false, error: "リアクションの追加に失敗しました" };
    }

    await writeAuditLog({
      tenantId: resolvedTenantId!,
      userId: user.id,
      action: "create",
      resource: "reaction",
      details: { entry_id: entryId, type },
    });

    revalidatePath(`/reports/${entryId}`);
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

// ── Peer Bonus ──

export async function sendPeerBonus(data: {
  toUserId: string;
  message: string;
  reportEntryId?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    if (user.id === data.toUserId) {
      return { success: false, error: "自分自身にはピアボーナスを送れません" };
    }

    // Get tenant_id from JWT claims first, fallback to DB
    const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id;
    let resolvedTenantId = tenantId as string | undefined;

    const today = new Date().toISOString().split("T")[0];

    // Parallel: get tenant_id (if needed) + check daily limit + verify recipient
    const [dbUserResult, existingResult] = await Promise.all([
      !resolvedTenantId
        ? supabase.from("users").select("tenant_id").eq("id", user.id).single()
        : Promise.resolve({ data: { tenant_id: resolvedTenantId } }),
      supabase
        .from("peer_bonuses")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("bonus_date", today)
        .single(),
    ]);

    if (!dbUserResult.data) {
      return { success: false, error: "ユーザーが見つかりません" };
    }
    resolvedTenantId = dbUserResult.data.tenant_id;

    if (existingResult.data) {
      return { success: false, error: "本日のピアボーナスは既に送信済みです" };
    }

    // Verify recipient is in same tenant (RLS also enforces tenant isolation)
    const { data: toUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.toUserId)
      .eq("tenant_id", resolvedTenantId)
      .single();

    if (!toUser) {
      return { success: false, error: "送信先のユーザーが見つかりません" };
    }

    const { error } = await supabase.from("peer_bonuses").insert({
      tenant_id: resolvedTenantId,
      from_user_id: user.id,
      to_user_id: data.toUserId,
      report_entry_id: data.reportEntryId ?? null,
      message: data.message,
      bonus_date: today,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "本日のピアボーナスは既に送信済みです" };
      }
      return { success: false, error: "ピアボーナスの送信に失敗しました" };
    }

    // Award XP to both parties
    const { awardXP } = await import("@/lib/gamification/xp");
    await Promise.all([
      awardXP(user.id, "peer_bonus_send"),
      awardXP(data.toUserId, "peer_bonus_receive"),
    ]);

    await writeAuditLog({
      tenantId: resolvedTenantId!,
      userId: user.id,
      action: "create",
      resource: "peer_bonus",
      details: { to_user_id: data.toUserId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function checkPeerBonusAvailable(): Promise<ActionResult<{ available: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("peer_bonuses")
      .select("id")
      .eq("from_user_id", user.id)
      .eq("bonus_date", today)
      .single();

    return { success: true, data: { available: !existing } };
  } catch {
    return { success: true, data: { available: false } };
  }
}

export async function removeReaction(
  reactionId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", reactionId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "リアクションの削除に失敗しました" };
    }

    revalidatePath("/reports");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
