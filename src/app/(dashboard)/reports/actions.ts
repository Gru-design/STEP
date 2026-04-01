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

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const submittedAt =
      data.status === "submitted" ? new Date().toISOString() : null;

    const { data: entry, error } = await supabase
      .from("report_entries")
      .upsert(
        {
          tenant_id: dbUser.tenant_id,
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
        tenantId: dbUser.tenant_id,
        userId: user.id,
        action: "submit",
        resource: "report_entry",
        resourceId: entry.id,
      });
      await dispatchWebhook(dbUser.tenant_id, "report.submitted", {
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

    // リアクション対象のエントリが同一テナントに属するか検証
    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const { data: entry } = await supabase
      .from("report_entries")
      .select("id")
      .eq("id", entryId)
      .eq("tenant_id", dbUser.tenant_id)
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
      tenantId: dbUser.tenant_id,
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

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Check if already sent today
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("peer_bonuses")
      .select("id")
      .eq("from_user_id", user.id)
      .eq("bonus_date", today)
      .single();

    if (existing) {
      return { success: false, error: "本日のピアボーナスは既に送信済みです" };
    }

    // Verify recipient is in same tenant
    const { data: toUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.toUserId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!toUser) {
      return { success: false, error: "送信先のユーザーが見つかりません" };
    }

    const { error } = await supabase.from("peer_bonuses").insert({
      tenant_id: dbUser.tenant_id,
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
      tenantId: dbUser.tenant_id,
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
